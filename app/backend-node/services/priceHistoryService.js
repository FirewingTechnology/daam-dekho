import { getDB, query, get, run } from '../utils/db.js';

/**
 * Atomically updates a vendor product's price and records price history if changed.
 * @param {object} params
 * @param {number} params.vendorProductId
 * @param {number} params.newPrice
 * @param {string} params.source
 * @param {number} params.confidence
 * @returns {Promise<{
 *   success: boolean,
 *   priceChanged: boolean,
 *   previousPrice: number,
 *   currentPrice: number,
 *   priceDifference: number,
 *   percentageChange: number,
 *   direction: 'UP' | 'DOWN' | 'UNCHANGED',
 *   historyId?: number
 * }>}
 */
export async function recordPriceCheckSuccess({ vendorProductId, newPrice, source = 'REFRESH_SCRAPE', confidence = 0.9 }) {
  const db = getDB();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN IMMEDIATE TRANSACTION', async (beginErr) => {
        if (beginErr) return reject(beginErr);

        const rollback = (err) => {
          db.run('ROLLBACK', () => reject(err));
        };

        try {
          // 1. Fetch current stored record
          db.get(
            `SELECT id, variant_id, vendor_id, price, current_price, previous_price 
             FROM vendor_products 
             WHERE id = ?`,
            [vendorProductId],
            async (getErr, row) => {
              if (getErr) return rollback(getErr);
              if (!row) return rollback(new Error(`Vendor product ${vendorProductId} not found`));

              const storedPrice = row.current_price !== null && row.current_price !== undefined 
                ? row.current_price 
                : row.price;

              const isFirstObservation = storedPrice === null || storedPrice === undefined;
              const priceChanged = !isFirstObservation && storedPrice !== newPrice;

              let direction = 'UNCHANGED';
              let priceDifference = 0;
              let percentageChange = 0;

              if (priceChanged) {
                priceDifference = newPrice - storedPrice;
                percentageChange = storedPrice > 0 ? parseFloat(((priceDifference / storedPrice) * 100).toFixed(2)) : 0;
                direction = priceDifference < 0 ? 'DOWN' : 'UP';
              }

              const now = new Date().toISOString();

              // 2. Check if a history row is needed
              db.get(
                `SELECT price FROM price_history 
                 WHERE vendor_product_id = ? 
                 ORDER BY recorded_at DESC, id DESC 
                 LIMIT 1`,
                [vendorProductId],
                (histErr, lastHist) => {
                  if (histErr) return rollback(histErr);

                  const shouldInsertHistory = !lastHist || lastHist.price !== newPrice;

                  // 3. Update vendor_products
                  db.run(
                    `UPDATE vendor_products 
                     SET price = ?,
                         current_price = ?,
                         previous_price = CASE WHEN ? THEN ? ELSE previous_price END,
                         price_changed_at = CASE WHEN ? THEN ? ELSE price_changed_at END,
                         last_price_check_at = ?,
                         last_successful_price_check_at = ?,
                         price_check_status = 'success',
                         price_check_error = NULL,
                         price_source = ?,
                         price_confidence = ?,
                         refresh_lock_owner = NULL,
                         refresh_lock_until = NULL
                     WHERE id = ?`,
                    [
                      newPrice,
                      newPrice,
                      priceChanged ? 1 : 0, storedPrice,
                      priceChanged ? 1 : 0, now,
                      now,
                      now,
                      source,
                      confidence,
                      vendorProductId
                    ],
                    function(updateErr) {
                      if (updateErr) return rollback(updateErr);

                      // 4. Insert history row if changed
                      if (shouldInsertHistory) {
                        const changeType = isFirstObservation ? 'initial' : (direction === 'DOWN' ? 'decrease' : 'increase');
                        db.run(
                          `INSERT INTO price_history (vendor_offer_id, vendor_product_id, variant_id, vendor_id, price, mrp, currency, source, confidence, change_type, recorded_at)
                           VALUES (?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?)`,
                          [
                            vendorProductId,
                            vendorProductId,
                            row.variant_id,
                            row.vendor_id,
                            newPrice,
                            newPrice,
                            source,
                            confidence,
                            changeType,
                            now
                          ],
                          function(insertErr) {
                            if (insertErr) return rollback(insertErr);
                            const historyId = this.lastID;

                            db.run('COMMIT', (commitErr) => {
                              if (commitErr) return rollback(commitErr);
                              resolve({
                                success: true,
                                priceChanged,
                                previousPrice: storedPrice,
                                currentPrice: newPrice,
                                priceDifference,
                                percentageChange,
                                direction,
                                historyId,
                                observedAt: now
                              });
                            });
                          }
                        );
                      } else {
                        db.run('COMMIT', (commitErr) => {
                          if (commitErr) return rollback(commitErr);
                          resolve({
                            success: true,
                            priceChanged: false,
                            previousPrice: storedPrice,
                            currentPrice: newPrice,
                            priceDifference: 0,
                            percentageChange: 0,
                            direction: 'UNCHANGED',
                            observedAt: now
                          });
                        });
                      }
                    }
                  );
                }
              );
            }
          );
        } catch (err) {
          rollback(err);
        }
      });
    });
  });
}

/**
 * Records a failed price check attempt without altering stored prices.
 * @param {number} vendorProductId
 * @param {string} errorReason
 * @returns {Promise<void>}
 */
export async function recordPriceCheckFailure(vendorProductId, errorReason) {
  const now = new Date().toISOString();
  await run(
    `UPDATE vendor_products 
     SET last_price_check_at = ?,
         last_failed_price_check_at = ?,
         price_check_status = 'failed',
         price_check_error = ?,
         refresh_lock_owner = NULL,
         refresh_lock_until = NULL
     WHERE id = ?`,
    [now, now, String(errorReason), vendorProductId]
  );
}

/**
 * Returns the recorded price history for a given vendor product.
 * @param {number} vendorProductId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getVendorProductPriceHistory(vendorProductId, limit = 30) {
  return await query(
    `SELECT id, vendor_product_id, variant_id, vendor_id, price, currency, recorded_at, source, confidence, change_type
     FROM price_history
     WHERE vendor_product_id = ?
     ORDER BY recorded_at ASC, id ASC
     LIMIT ?`,
    [vendorProductId, limit]
  );
}

/**
 * Returns unified price history for all vendors of a variant.
 * @param {number} variantId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getVariantPriceHistory(variantId, limit = 50) {
  return await query(
    `SELECT ph.id, ph.vendor_product_id, ph.variant_id, ph.vendor_id, ph.price, ph.currency, ph.recorded_at, 
            ph.source, ph.confidence, ph.change_type, v.name as vendor_name
     FROM price_history ph
     JOIN vendors v ON ph.vendor_id = v.id
     WHERE ph.variant_id = ?
     ORDER BY ph.recorded_at ASC, ph.id ASC
     LIMIT ?`,
    [variantId, limit]
  );
}

/**
 * Returns unified price history for a master product across all its variants and vendors.
 * @param {number} productId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getProductPriceHistory(productId, limit = 50) {
  return await query(
    `SELECT ph.id, ph.vendor_product_id, ph.variant_id, ph.vendor_id, ph.price, ph.currency, ph.recorded_at, 
            ph.source, ph.confidence, ph.change_type, v.name as vendor_name, pv.storage, pv.ram, pv.color
     FROM price_history ph
     JOIN product_variants pv ON ph.variant_id = pv.id
     JOIN vendors v ON ph.vendor_id = v.id
     WHERE pv.master_product_id = ? OR pv.product_id = ?
     ORDER BY ph.recorded_at ASC, ph.id ASC
     LIMIT ?`,
    [productId, productId, limit]
  );
}
