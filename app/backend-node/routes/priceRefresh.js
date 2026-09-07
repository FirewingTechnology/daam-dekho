import express from 'express';
import { get, query } from '../utils/db.js';
import { 
  refreshVendorProduct, 
  refreshStaleBatch, 
  getDiagnostics, 
  CONFIG 
} from '../services/priceRefreshService.js';
import { 
  getProductPriceHistory, 
  getVendorProductPriceHistory, 
  getVariantPriceHistory 
} from '../services/priceHistoryService.js';

const router = express.Router();

// Helper to compute human-readable freshness
function computeFreshness(lastCheckedAt, status = 'idle') {
  if (!lastCheckedAt) {
    return {
      status: 'never_checked',
      label: 'Price check pending',
      is_stale: true,
      last_checked_at: null
    };
  }

  const date = new Date(lastCheckedAt);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (status === 'failed') {
    return {
      status: 'failed',
      label: 'Price could not be refreshed',
      is_stale: true,
      last_checked_at: lastCheckedAt,
      minutes_ago: diffMins
    };
  }

  const isStale = diffMins > CONFIG.staleAfterMinutes;

  let label;
  if (diffMins < 1) {
    label = 'Checked just now';
  } else if (diffMins < 60) {
    label = `Checked ${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    label = `Checked ${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  } else {
    label = 'Price data may be stale';
  }

  if (isStale && diffMins >= 60) {
    label = 'Price data may be stale';
  }

  return {
    status: isStale ? 'stale' : 'fresh',
    label,
    is_stale: isStale,
    last_checked_at: lastCheckedAt,
    minutes_ago: diffMins
  };
}

// 1. Diagnostics endpoint
router.get('/diagnostics', async (req, res) => {
  try {
    const diag = await getDiagnostics();
    res.json(diag);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Check / Refresh single vendor product
router.post('/check', async (req, res) => {
  try {
    const { vendor_product_id, commit = false } = req.body;
    const vpId = parseInt(vendor_product_id, 10);
    if (isNaN(vpId)) {
      return res.status(400).json({ error: 'vendor_product_id is required and must be an integer' });
    }

    const result = await refreshVendorProduct(vpId, {
      dryRun: !commit,
      workerId: 'api_request'
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Trigger batch refresh
router.post('/batch', async (req, res) => {
  try {
    const batchSize = parseInt(req.body.batch_size, 10) || undefined;
    const concurrency = parseInt(req.body.concurrency, 10) || undefined;

    const result = await refreshStaleBatch({
      batchSize,
      concurrency,
      workerId: 'api_batch'
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Product Price History
router.get('/products/:id/price-history', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const history = await getProductPriceHistory(productId);
    res.json({
      product_id: productId,
      total_observations: history.length,
      history
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Product Price Freshness
router.get('/products/:id/price-freshness', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const vendors = await query(
      `SELECT vp.id as vendor_product_id, vp.price, vp.current_price, vp.previous_price,
              vp.last_price_check_at, vp.price_check_status, vp.price_check_error,
              v.name as vendor_name
       FROM vendor_products vp
       JOIN product_variants pv ON vp.variant_id = pv.id
       JOIN vendors v ON vp.vendor_id = v.id
       WHERE pv.master_product_id = ? OR pv.product_id = ?`,
      [productId, productId]
    );

    const freshnessList = vendors.map(v => {
      const freshness = computeFreshness(v.last_price_check_at, v.price_check_status);
      const curr = v.current_price !== null ? v.current_price : v.price;
      const prev = v.previous_price;
      const changed = prev !== null && prev !== undefined && prev !== curr;
      const diff = changed ? (curr - prev) : 0;
      const direction = diff < 0 ? 'down' : (diff > 0 ? 'up' : 'unchanged');

      return {
        vendor_product_id: v.vendor_product_id,
        vendor_name: v.vendor_name,
        current_price: curr,
        previous_price: prev,
        price_changed: changed,
        change: diff,
        direction,
        ...freshness
      };
    });

    res.json({
      product_id: productId,
      vendors: freshnessList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Vendor Product Specific History
router.get('/vendor-products/:id/price-history', async (req, res) => {
  try {
    const vpId = parseInt(req.params.id, 10);
    if (isNaN(vpId)) {
      return res.status(400).json({ error: 'Invalid vendor_product_id' });
    }

    const history = await getVendorProductPriceHistory(vpId);
    res.json({
      vendor_product_id: vpId,
      total_observations: history.length,
      history
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { computeFreshness };
export default router;
