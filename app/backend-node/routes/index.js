import express from 'express';
import * as productController from '../controllers/productController.js';
import * as authController from '../controllers/authController.js';
import * as userController from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public Routes
router.get('/home', productController.getHome);
router.get('/products', productController.getProducts);
router.get('/products/:slug', productController.getProductDetails);
router.get('/search/suggestions', productController.getSearchSuggestions);
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

// Contact
router.post('/contact', userController.handleContact);

export default router;
