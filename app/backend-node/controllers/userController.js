import { query, run, get } from '../utils/db.js';

export const getWishlist = async (req, res, next) => {
  try {
    const items = await query(`
      SELECT pm.id, pm.title, pm.id as slug, pm.base_image as image,
             MIN(vp.price) as price, vp.mrp, vp.discount_percent, pm.brand, pm.category
      FROM wishlists w
      JOIN product_variants pv ON w.variant_id = pv.id
      JOIN products_master pm ON pv.product_id = pm.id
      JOIN vendor_products vp ON pv.id = vp.variant_id
      WHERE w.user_id = ?
      GROUP BY pv.id
    `, [req.user.id]);
    res.json(items);
  } catch (err) { next(err); }
};

export const addToWishlist = async (req, res, next) => {
  try {
    const { variant_id } = req.body;
    if (!variant_id) return res.status(400).json({ error: 'variant_id is required' });
    await run(`INSERT OR IGNORE INTO wishlists (user_id, variant_id) VALUES (?, ?)`, [req.user.id, variant_id]);
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const removeFromWishlist = async (req, res, next) => {
  try {
    // BUG-10 FIX: Use variant_id (consistent with how items are inserted),
    // not the internal row id which the client never has.
    await run(`DELETE FROM wishlists WHERE user_id = ? AND variant_id = ?`, [req.user.id, req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const getAlerts = async (req, res, next) => {
  try {
    const alerts = await query(`
      SELECT pa.*, pm.title, pm.id as slug, pm.base_image as image, vp.price as current_price
      FROM price_alerts pa
      JOIN product_variants pv ON pa.variant_id = pv.id
      JOIN products_master pm ON pv.product_id = pm.id
      JOIN vendor_products vp ON pv.id = vp.variant_id
      WHERE pa.user_id = ?
      GROUP BY pa.id
    `, [req.user.id]);
    res.json(alerts);
  } catch (err) { next(err); }
};

export const createAlert = async (req, res, next) => {
  try {
    const { variant_id, target_price } = req.body;
    if (!variant_id || !target_price) {
      return res.status(400).json({ error: 'variant_id and target_price are required' });
    }
    await run(`INSERT INTO price_alerts (user_id, variant_id, target_price) VALUES (?, ?, ?)`,
      [req.user.id, variant_id, target_price]);
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const deleteAlert = async (req, res, next) => {
  try {
    await run(`DELETE FROM price_alerts WHERE user_id = ? AND id = ?`, [req.user.id, req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const handleContact = async (req, res) => {
  res.json({ success: true, message: 'Message received!' });
};
