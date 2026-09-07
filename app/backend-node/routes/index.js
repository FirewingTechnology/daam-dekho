import express from 'express';
import * as productController from '../controllers/productController.js';
import * as authController from '../controllers/authController.js';
import * as userController from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { get as dbGet, query as dbQuery } from '../utils/db.js';

const router = express.Router();

// Public Routes
router.get('/home', productController.getHome);
router.get('/products', productController.getProducts);
router.get('/products/:slug', productController.getProductDetails);
router.get('/search/suggestions', productController.getSearchSuggestions);
router.get('/search/autocomplete', productController.getSearchSuggestions);

// BUG #6 FIX: /api/search alias — redirects to /api/products with q param
router.get('/search', (req, res, next) => {
  // Proxy the request to productController.getProducts with query forwarded
  req.query.q = req.query.q || req.query.query || '';
  productController.getProducts(req, res, next);
});

// BUG #6 FIX: /api/variants/:id route — returns variant + vendor offer data
router.get('/variants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const variantId = parseInt(id, 10);
    if (isNaN(variantId)) {
      return res.status(400).json({ error: 'Invalid variant id — must be a number' });
    }

    const variant = await dbGet(
      `SELECT pv.*, pm.title as master_title, pm.brand, pm.category, pm.base_image
       FROM product_variants pv
       JOIN products_master pm ON pm.id = pv.master_product_id
       WHERE pv.id = ?`,
      [variantId]
    );

    if (!variant) {
      return res.status(404).json({ error: 'Variant not found', variant_id: variantId });
    }

    const vendorOffers = await dbQuery(
      `SELECT vp.*, v.name as vendor_name
       FROM vendor_products vp
       JOIN vendors v ON vp.vendor_id = v.id
       WHERE vp.variant_id = ?
       ORDER BY vp.price ASC`,
      [variantId]
    );

    res.json({
      variant,
      vendor_offers: vendorOffers,
      vendor_count: vendorOffers.length,
      best_price: vendorOffers[0]?.price || null,
      best_vendor: vendorOffers[0]?.vendor_name || null
    });
  } catch (err) {
    console.error('GET /api/variants/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/categories', productController.getCategories);
router.get('/brands', productController.getBrands);
router.get('/filter-options', productController.getFilterOptions);
router.get('/filter_options', productController.getFilterOptions);
router.get('/sitemap.xml', productController.getSitemap);
router.get('/robots.txt', productController.getRobots);

// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Protected Routes
router.get('/user/profile', protect, authController.getProfile);
router.put('/user/pincode', protect, authController.updatePincode);

// Wishlist & Alerts
router.get('/user/wishlist', protect, userController.getWishlist);
router.post('/user/wishlist', protect, userController.addToWishlist);
router.delete('/user/wishlist/:id', protect, userController.removeFromWishlist);

router.get('/user/alerts', protect, userController.getAlerts);
router.post('/user/alerts', protect, userController.createAlert);
router.delete('/user/alerts/:id', protect, userController.deleteAlert);

import debugRoutes from './debugRoutes.js';
import priceRefreshRouter from './priceRefresh.js';

// Price Refresh & Monitoring Routes
router.use('/price-refresh', priceRefreshRouter);

// Price History & Freshness Convenience Routes
router.use('/', priceRefreshRouter);

// Debug & Lineage Routes (Mounted ONLY in non-production environments)
if (process.env.NODE_ENV !== 'production') {
  router.use('/debug', debugRoutes);
}

export default router;
