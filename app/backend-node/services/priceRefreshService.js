import { query, get, run } from '../utils/db.js';
import { fetchAndExtractPrice } from './priceExtractionService.js';
import { validatePrice } from './priceValidationService.js';
import { recordPriceCheckSuccess, recordPriceCheckFailure } from './priceHistoryService.js';

// Configuration
export const CONFIG = {
  get enabled() { return process.env.PRICE_REFRESH_ENABLED !== 'false'; },
  get intervalMinutes() { return parseInt(process.env.PRICE_REFRESH_INTERVAL_MINUTES, 10) || 15; },
  get batchSize() { return parseInt(process.env.PRICE_REFRESH_BATCH_SIZE, 10) || 20; },
  get concurrency() { return parseInt(process.env.PRICE_REFRESH_CONCURRENCY, 10) || 3; },
  get staleAfterMinutes() { return parseInt(process.env.PRICE_REFRESH_STALE_AFTER_MINUTES, 10) || 30; },
  lockTtlMinutes: 5,
  vendorDelayMs: 1500
};

// Observability Metrics
const metrics = {
  totalAttempts: 0,
  successfulScrapes: 0,
  failedScrapes: 0,
  blockedScrapes: 0,
  priceChanges: 0,
  priceIncreases: 0,
  priceDecreases: 0,
  totalDurationMs: 0,
  vendorStats: {}
};

// Per-vendor rate limiting & cooldown tracker
const vendorCooldowns = new Map();
const vendorLastRequestTimes = new Map();

function getVendorKey(vendorId, vendorName) {
  return String(vendorId || vendorName || 'generic').toLowerCase();
}

async function enforceVendorRateLimit(vendorKey) {
  // Check if in cooldown (e.g. after 403/429)
  const cooldownUntil = vendorCooldowns.get(vendorKey);
  if (cooldownUntil && Date.now() < cooldownUntil) {
    const remainingSecs = Math.ceil((cooldownUntil - Date.now()) / 1000);
    throw new Error(`VENDOR_COOLDOWN_ACTIVE: ${vendorKey} is in backoff for ${remainingSecs}s`);
  }

  // Inter-request delay
  const lastReq = vendorLastRequestTimes.get(vendorKey) || 0;
  const elapsed = Date.now() - lastReq;
  if (elapsed < CONFIG.vendorDelayMs) {
    await new Promise(r => setTimeout(r, CONFIG.vendorDelayMs - elapsed));
  }
  vendorLastRequestTimes.set(vendorKey, Date.now());
}

function updateVendorMetrics(vendorKey, result) {
  if (!metrics.vendorStats[vendorKey]) {
    metrics.vendorStats[vendorKey] = { attempts: 0, success: 0, failed: 0, blocked: 0, changes: 0 };
  }
  const s = metrics.vendorStats[vendorKey];
  s.attempts++;
  if (result.success) s.success++;
  else {
    s.failed++;
    if (result.reason === 'RATE_LIMITED' || result.reason === 'ACCESS_FORBIDDEN' || result.reason === 'BOT_DETECTION_CHALLENGE') {
      s.blocked++;
    }
  }
  if (result.priceChanged) s.changes++;
}

/**
 * Refreshes a single vendor product.
 * @param {number} vendorProductId
 * @param {object} options
 * @param {boolean} [options.dryRun=false]
 * @param {string} [options.workerId='manual']
 * @returns {Promise<object>}
 */
export async function refreshVendorProduct(vendorProductId, options = {}) {
  const { dryRun = false, workerId = 'worker_' + process.pid } = options;

  metrics.totalAttempts++;
  const startTime = Date.now();

  // 1. Fetch vendor product
  const vp = await get(
    `SELECT vp.*, v.name as vendor_name, v.base_url 
     FROM vendor_products vp
     JOIN vendors v ON vp.vendor_id = v.id
     WHERE vp.id = ?`,
    [vendorProductId]
  );

  if (!vp) {
    metrics.failedScrapes++;
    return { success: false, reason: 'VENDOR_PRODUCT_NOT_FOUND', vendorProductId };
  }

  if (!vp.url || vp.url === '#' || vp.url === 'N/A') {
    metrics.failedScrapes++;
    return { success: false, reason: 'NO_VALID_URL', vendorProductId };
  }

  const vendorKey = getVendorKey(vp.vendor_id, vp.vendor_name);

  // 2. Multi-worker Lease Lock (if not dryRun)
  if (!dryRun) {
    const now = new Date();
    const lockUntil = new Date(now.getTime() + CONFIG.lockTtlMinutes * 60000).toISOString();
    const nowIso = now.toISOString();

    const lockResult = await run(
      `UPDATE vendor_products 
       SET refresh_lock_owner = ?, refresh_lock_until = ?, price_check_status = 'in_progress'
       WHERE id = ? AND (refresh_lock_until IS NULL OR refresh_lock_until < ?)`,
      [workerId, lockUntil, vendorProductId, nowIso]
    );

    if (lockResult.changes === 0) {
      metrics.failedScrapes++;
      return { success: false, reason: 'LOCK_ACQUISITION_FAILED_ALREADY_RUNNING', vendorProductId };
    }
  }

  try {
    // 3. Enforce Rate Limiting & Cooldown
    await enforceVendorRateLimit(vendorKey);

    // 4. Fetch & Extract Price
    console.log(`[PRICE_REFRESH_START] vendor=${vp.vendor_name} id=${vendorProductId} url=${vp.url}`);
    const extraction = await fetchAndExtractPrice({
      url: vp.url,
      vendorId: vp.vendor_id,
      vendorName: vp.vendor_name
    });

    // 5. Handle bot detection / access block cooldown
    if (extraction.reason === 'RATE_LIMITED' || extraction.reason === 'ACCESS_FORBIDDEN' || extraction.reason === 'BOT_DETECTION_CHALLENGE') {
      metrics.blockedScrapes++;
      // Set 10-minute cooldown for vendor to protect IP reputation
      vendorCooldowns.set(vendorKey, Date.now() + 10 * 60 * 1000);
      console.warn(`[PRICE_REFRESH_BLOCKED] vendor=${vp.vendor_name} id=${vendorProductId} reason=${extraction.reason} (10m cooldown set)`);

      if (!dryRun) {
        await recordPriceCheckFailure(vendorProductId, extraction.reason);
      }

      updateVendorMetrics(vendorKey, { success: false, reason: extraction.reason });
      return { success: false, reason: extraction.reason, vendorProductId, vendorName: vp.vendor_name };
    }

    // 6. Zero-Trust Price Validation
    const storedPrice = vp.current_price !== null && vp.current_price !== undefined ? vp.current_price : vp.price;
    const validation = validatePrice({
      extractedPrice: extraction.price,
      storedPrice,
      currency: extraction.currency,
      confidence: extraction.confidence,
      reason: extraction.reason
    });

    if (!validation.isValid) {
      metrics.failedScrapes++;
      console.warn(`[PRICE_REFRESH_INVALID] vendor=${vp.vendor_name} id=${vendorProductId} error=${validation.error}`);

      if (!dryRun) {
        await recordPriceCheckFailure(vendorProductId, validation.error);
      }

      updateVendorMetrics(vendorKey, { success: false, reason: validation.error });
      return {
        success: false,
        reason: validation.error,
        vendorProductId,
        vendorName: vp.vendor_name,
        extractedPrice: extraction.price,
        storedPrice
      };
    }

    const verifiedPrice = validation.sanitizedPrice;

    // 7. Atomic Commit or Dry Run
    if (dryRun) {
      const priceChanged = storedPrice !== verifiedPrice;
      const priceDifference = priceChanged ? (verifiedPrice - storedPrice) : 0;
      const direction = priceDifference < 0 ? 'DOWN' : (priceDifference > 0 ? 'UP' : 'UNCHANGED');

      metrics.successfulScrapes++;
      return {
        success: true,
        dryRun: true,
        vendorProductId,
        vendorName: vp.vendor_name,
        storedPrice,
        verifiedPrice,
        priceChanged,
        priceDifference,
        direction,
        source: extraction.source,
        confidence: extraction.confidence
      };
    }

    const recordResult = await recordPriceCheckSuccess({
      vendorProductId,
      newPrice: verifiedPrice,
      source: extraction.source || 'LIVE_SCRAPE',
      confidence: extraction.confidence || 0.95
    });

    metrics.successfulScrapes++;
    const duration = Date.now() - startTime;
    metrics.totalDurationMs += duration;

    if (recordResult.priceChanged) {
      metrics.priceChanges++;
      if (recordResult.direction === 'UP') metrics.priceIncreases++;
      if (recordResult.direction === 'DOWN') metrics.priceDecreases++;
      console.log(`[PRICE_REFRESH_SUCCESS] vendor=${vp.vendor_name} id=${vendorProductId} old=${recordResult.previousPrice} new=${recordResult.currentPrice} (${recordResult.direction}) in ${duration}ms`);
    } else {
      console.log(`[PRICE_REFRESH_NO_CHANGE] vendor=${vp.vendor_name} id=${vendorProductId} price=${verifiedPrice} in ${duration}ms`);
    }

    updateVendorMetrics(vendorKey, { success: true, priceChanged: recordResult.priceChanged });

    return {
      success: true,
      vendorProductId,
      vendorName: vp.vendor_name,
      ...recordResult,
      durationMs: duration
    };
  } catch (err) {
    metrics.failedScrapes++;
    console.error(`[PRICE_REFRESH_ERROR] vendor=${vp.vendor_name} id=${vendorProductId}:`, err.message);

    if (!dryRun) {
      await recordPriceCheckFailure(vendorProductId, err.message);
    }

    updateVendorMetrics(vendorKey, { success: false, reason: err.message });
    return { success: false, reason: err.message, vendorProductId };
  }
}

/**
 * Fetches and processes a batch of stale vendor products with bounded concurrency.
 * @param {object} options
 * @param {number} [options.batchSize]
 * @param {number} [options.concurrency]
 * @param {string} [options.workerId]
 * @returns {Promise<object>}
 */
export async function refreshStaleBatch(options = {}) {
  const batchSize = options.batchSize || CONFIG.batchSize;
  const concurrency = options.concurrency || CONFIG.concurrency;
  const workerId = options.workerId || 'batch_worker_' + process.pid;

  const staleThreshold = new Date(Date.now() - CONFIG.staleAfterMinutes * 60000).toISOString();
  const nowIso = new Date().toISOString();

  // Query stale products
  const staleItems = await query(
    `SELECT id, variant_id, vendor_id, url 
     FROM vendor_products 
     WHERE url IS NOT NULL AND url != '' AND url != '#'
       AND (last_price_check_at IS NULL OR last_price_check_at < ?)
       AND (refresh_lock_until IS NULL OR refresh_lock_until < ?)
     ORDER BY last_price_check_at ASC NULLS FIRST
     LIMIT ?`,
    [staleThreshold, nowIso, batchSize]
  );

  if (!staleItems || staleItems.length === 0) {
    return { processed: 0, message: 'NO_STALE_PRODUCTS' };
  }

  console.log(`[PRICE_REFRESH_BATCH] Found ${staleItems.length} stale vendor products to refresh (concurrency=${concurrency})`);

  const results = [];
  const queue = [...staleItems];

  // Worker pool for bounded concurrency
  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const res = await refreshVendorProduct(item.id, { workerId });
      results.push(res);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, staleItems.length) }, () => worker());
  await Promise.all(workers);

  const successful = results.filter(r => r.success).length;
  const changes = results.filter(r => r.priceChanged).length;

  return {
    processed: results.length,
    successful,
    failed: results.length - successful,
    priceChanges: changes,
    results
  };
}

/**
 * Returns complete operational diagnostics for the price refresh engine.
 * @returns {Promise<object>}
 */
export async function getDiagnostics() {
  const totalProducts = (await get(`SELECT COUNT(*) as cnt FROM vendor_products`)).cnt;
  const withValidUrl = (await get(`SELECT COUNT(*) as cnt FROM vendor_products WHERE url IS NOT NULL AND url != '' AND url != '#'`)).cnt;
  
  const staleThreshold = new Date(Date.now() - CONFIG.staleAfterMinutes * 60000).toISOString();
  const freshCount = (await get(`SELECT COUNT(*) as cnt FROM vendor_products WHERE last_price_check_at >= ?`, [staleThreshold])).cnt;
  const staleCount = totalProducts - freshCount;

  const failureCount = (await get(`SELECT COUNT(*) as cnt FROM vendor_products WHERE price_check_status = 'failed'`)).cnt;
  const successCount = (await get(`SELECT COUNT(*) as cnt FROM vendor_products WHERE price_check_status = 'success'`)).cnt;

  const vendorBreakdown = await query(`
    SELECT v.id as vendor_id, v.name as vendor_name, 
           COUNT(vp.id) as total_products,
           SUM(CASE WHEN vp.last_price_check_at >= ? THEN 1 ELSE 0 END) as fresh_products,
           SUM(CASE WHEN vp.price_check_status = 'success' THEN 1 ELSE 0 END) as successful_checks,
           SUM(CASE WHEN vp.price_check_status = 'failed' THEN 1 ELSE 0 END) as failed_checks
    FROM vendors v
    LEFT JOIN vendor_products vp ON v.id = vp.vendor_id
    GROUP BY v.id, v.name
  `, [staleThreshold]);

  const avgDuration = metrics.totalAttempts > 0 ? Math.round(metrics.totalDurationMs / metrics.totalAttempts) : 0;
  const successRate = metrics.totalAttempts > 0 ? parseFloat(((metrics.successfulScrapes / metrics.totalAttempts) * 100).toFixed(1)) : 100;

  return {
    status: 'operational',
    config: CONFIG,
    counts: {
      total_vendor_products: totalProducts,
      products_with_valid_url: withValidUrl,
      fresh_prices: freshCount,
      stale_prices: staleCount,
      status_success: successCount,
      status_failed: failureCount
    },
    metrics: {
      ...metrics,
      average_duration_ms: avgDuration,
      success_rate_percent: successRate
    },
    vendors: vendorBreakdown
  };
}
