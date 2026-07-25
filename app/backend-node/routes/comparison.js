import express from 'express';
import { getProductById } from '../utils/database.js';
import { comparisonLimiter } from '../middleware/security.js';

const router = express.Router();

// Middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ==================== COMPARISON ENDPOINTS ====================

/**
 * GET /comparison/batch
 * Fetch multiple products for comparison by IDs
 * Query params: product_ids (array or comma-separated)
 */
router.get('/comparison/batch', comparisonLimiter, asyncHandler(async (req, res) => {
  const { product_ids } = req.query;
  
  if (!product_ids) {
    return res.status(400).json({
      error: 'Missing product_ids parameter'
    });
  }

  // Parse product IDs - handle both array and comma-separated formats
  let ids = [];
  if (Array.isArray(product_ids)) {
    ids = product_ids.map(id => parseInt(id)).filter(id => !isNaN(id));
  } else if (typeof product_ids === 'string') {
    ids = product_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
  }

  if (ids.length === 0) {
    return res.status(400).json({
      error: 'No valid product IDs provided'
    });
  }

  try {
    // Fetch all products
    const products = await Promise.all(
      ids.map(id => getProductById(id).catch(() => null))
    );

    // Filter out null results (products not found)
    const validProducts = products.filter(p => p !== null);

    if (validProducts.length === 0) {
      return res.status(404).json({
        error: 'No products found for the given IDs',
        requested_ids: ids,
        found_count: 0
      });
    }

    res.json({
      comparison_ready: true,
      requested_count: ids.length,
      found_count: validProducts.length,
      products: validProducts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching batch products:', error);
    res.status(500).json({
      error: 'Failed to fetch products for comparison',
      message: error.message
    });
  }
}));

/**
 * GET /comparison/price-analysis/:productId
 * Get detailed price analysis for a product across all vendors
 */
router.get('/comparison/price-analysis/:productId', comparisonLimiter, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const id = parseInt(productId);

  if (isNaN(id)) {
    return res.status(400).json({
      error: 'Invalid product ID'
    });
  }

  try {
    const product = await getProductById(id);

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        product_id: id
      });
    }

    // Build vendor analysis
    const vendor_analysis = {};
    const prices = [];

    if (product.vendors && Object.keys(product.vendors).length > 0) {
      Object.entries(product.vendors).forEach(([vendor, data]) => {
        const price = data.discounted_price || data.price || 0;
        prices.push(price);

        vendor_analysis[vendor] = {
          price: data.price,
          discounted_price: data.discounted_price,
          discount_percent: data.price && data.discounted_price 
            ? Math.round(((data.price - data.discounted_price) / data.price) * 100)
            : 0,
          rating: data.rating || 0,
          reviews: data.reviews || 0,
          availability: data.availability || 'Unknown',
          seller_name: data.seller_name || 'Unknown',
          product_link: data.product_link || ''
        };
      });
    }

    // Calculate price statistics
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b) / prices.length) : 0;

    res.json({
      product_id: id,
      product_title: product.title,
      brand: product.brand,
      category: product.category,
      vendor_analysis,
      price_statistics: {
        min_price: minPrice,
        max_price: maxPrice,
        avg_price: avgPrice,
        price_range: maxPrice - minPrice,
        max_savings_percent: prices.length > 0 
          ? Math.round(((maxPrice - minPrice) / maxPrice) * 100)
          : 0,
        total_vendors: Object.keys(vendor_analysis).length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing prices:', error);
    res.status(500).json({
      error: 'Failed to analyze prices',
      message: error.message
    });
  }
}));

/**
 * GET /comparison/suggest
 * Get suggested products for comparison based on filters
 */
router.get('/comparison/suggest', asyncHandler(async (req, res) => {
  const { category, limit = 4 } = req.query;

  // This would typically query recommended products
  // For now, return empty as it needs database search implementation
  res.json({
    suggested_products: [],
    category: category || 'all',
    limit: parseInt(limit),
    message: 'Suggestion engine requires database implementation'
  });
}));

export default router;
