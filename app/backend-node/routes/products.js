import express from 'express';
import {
  getAllCategories,
  getAllBrands,
  searchProducts,
  getHotDeals,
  getBestSellers,
  getLatestPopular,
  getPriceRange,
  getProductById,
  getVendorStatistics
} from '../utils/database.js';
import {
  calculateBestPrice,
  formatPriceComparison,
  calculatePriceStats,
  formatTimestamp
} from '../utils/priceCalculation.js';
import {
  getAllOffersForProduct,
  formatOffersForDisplay,
  calculateFinalPrice
} from '../utils/offerMatching.js';
import {
  formatImagesForResponse,
  validateProductImages
} from '../utils/imageProxy.js';
import {
  searchLimiter,
  comparisonLimiter,
  offerLimiter
} from '../middleware/security.js';

const router = express.Router();

// Middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80';

// Helper function to format products with proper image field
const formatProductsWithImages = (products) => {
  return products.map(product => ({
    ...product,
    image: product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0 
      ? product.image_urls[0] 
      : DEFAULT_FALLBACK_IMAGE
  }));
};

// ==================== CATEGORIES & FILTERS ====================

router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await getAllCategories();
  const categoryNames = categories.map(c => c.category).filter(Boolean);
  
  res.json({
    type: 'categories',
    count: categoryNames.length,
    categories: categoryNames
  });
}));

router.get('/brands', asyncHandler(async (req, res) => {
  const { category } = req.query;
  const brands = await getAllBrands(category);
  const brandNames = brands.map(b => b.brand).filter(Boolean);
  
  res.json({
    type: 'brands',
    category: category || 'all',
    count: brandNames.length,
    brands: brandNames
  });
}));

// ==================== PRODUCT SEARCH & LISTING ====================

router.get('/products/search', searchLimiter, asyncHandler(async (req, res) => {
  const {
    q,
    query,
    category,
    min_price,
    max_price,
    brands,
    page = 1,
    limit = 24,
    sort_by = -1,
    vendors
  } = req.query;

  // Support both 'q' and 'query' parameters
  const searchQuery = q || query || '';
  const vendorList = vendors ? vendors.split(',').map(v => v.trim()) : null;
  // Parse brands parameter (can be comma-separated string or array)
  const brandList = brands 
    ? (typeof brands === 'string' ? brands.split(',').map(b => b.trim()) : brands)
    : null;
  
  // Log for debugging
  if (brandList) {
    console.log(`🏷️  Backend: Filtering by brands: ${brandList.join(', ')}`);
  }
  
  const result = await searchProducts({
    searchQuery,
    category,
    brands: brandList,
    minPrice: min_price ? parseFloat(min_price) : null,
    maxPrice: max_price ? parseFloat(max_price) : null,
    page: parseInt(page),
    limit: parseInt(limit),
    vendors: vendorList
  });

  // Format response for frontend compatibility
  res.json({
    products: formatProductsWithImages(result.products),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit)
    },
    count: result.products.length
  });
}));

router.get('/productlisting', asyncHandler(async (req, res) => {
  const {
    category,
    min_price,
    max_price,
    brand,
    search = '',
    sort_by = -1,
    page = 1,
    limit = 24
  } = req.query;

  const result = await searchProducts({
    searchQuery: search,
    category,
    minPrice: min_price ? parseFloat(min_price) : null,
    maxPrice: max_price ? parseFloat(max_price) : null,
    page: parseInt(page),
    limit: parseInt(limit),
    vendors: null
  });

  // Format response for frontend compatibility
  res.json({
    products: formatProductsWithImages(result.products),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit)
    },
    count: result.products.length
  });
}));

// ==================== VENDOR SPECIFIC ENDPOINTS ====================

router.get('/vendor/:vendor', asyncHandler(async (req, res) => {
  const { vendor } = req.params;
  const { page = 1, limit = 20, category, minPrice, maxPrice } = req.query;

  const db = getDatabase();
  
  // Map vendor parameter to table name
  const vendorMap = {
    'amazon': 'amazon_products',
    'flipkart': 'flipkart_products',
    'jiomart': 'jiomart_products',
    'croma': 'croma_products',
    'ebay': 'ebay_products',
    'myntra': 'myntra_products',
    'snapdeal': 'snapdeal_products',
    'vijaysales': 'vijaysales_products',
    'reliance': 'reliance_digital_products'
  };

  const tableName = vendorMap[vendor.toLowerCase()];
  
  if (!tableName) {
    return res.status(400).json({
      error: 'Invalid vendor',
      validVendors: Object.keys(vendorMap)
    });
  }

  let query = `SELECT * FROM ${tableName} WHERE 1=1`;
  const params = [];

  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }

  if (minPrice) {
    query += ` AND price >= ?`;
    params.push(parseFloat(minPrice));
  }

  if (maxPrice) {
    query += ` AND price <= ?`;
    params.push(parseFloat(maxPrice));
  }

  query += ` LIMIT ? OFFSET ?`;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  params.push(parseInt(limit), offset);

  const products = await new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

  // Get total count
  let countQuery = `SELECT COUNT(*) as total FROM ${tableName} WHERE 1=1`;
  const countParams = [];

  if (category) {
    countQuery += ` AND category = ?`;
    countParams.push(category);
  }

  if (minPrice) {
    countQuery += ` AND price >= ?`;
    countParams.push(parseFloat(minPrice));
  }

  if (maxPrice) {
    countQuery += ` AND price <= ?`;
    countParams.push(parseFloat(maxPrice));
  }

  const countResult = await new Promise((resolve, reject) => {
    db.get(countQuery, countParams, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  res.json({
    vendor: vendor.toLowerCase(),
    products: formatProductsWithImages(products),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult?.total || 0,
      pages: Math.ceil((countResult?.total || 0) / parseInt(limit))
    },
    count: products.length
  });
}));

// ==================== FEATURED ENDPOINTS ====================

router.get('/products/latest-popular', asyncHandler(async (req, res) => {
  const { limit = 10, category } = req.query;
  const products = await getLatestPopular(parseInt(limit), category);
  
  res.json({
    type: 'latest_popular',
    category: category || 'all',
    limit: parseInt(limit),
    count: products.length,
    products: formatProductsWithImages(products)
  });
}));

router.get('/products/hot-deals', asyncHandler(async (req, res) => {
  const { limit = 10, category } = req.query;
  const products = await getHotDeals(parseInt(limit), category);
  
  res.json({
    type: 'hot_deals',
    category: category || 'all',
    limit: parseInt(limit),
    count: products.length,
    products: formatProductsWithImages(products)
  });
}));

router.get('/products/best-selling', asyncHandler(async (req, res) => {
  const { limit = 10, category } = req.query;
  const products = await getBestSellers(parseInt(limit), category);
  
  res.json({
    type: 'best_sellers',
    category: category || 'all',
    limit: parseInt(limit),
    count: products.length,
    products: formatProductsWithImages(products)
  });
}));

// ==================== PRODUCT DETAILS ====================

router.get('/products/:id', asyncHandler(async (req, res) => {
  const product = await getProductById(parseInt(req.params.id));
  
  if (!product) {
    return res.status(404).json({
      error: 'Product not found',
      product_id: req.params.id
    });
  }
  
  let formattedSpecifications = '';
  if (product.specifications && typeof product.specifications === 'object') {
     try {
       formattedSpecifications = JSON.stringify(product.specifications);
     } catch (e) {
       formattedSpecifications = '';
     }
  } else if (typeof product.specifications === 'string') {
     formattedSpecifications = product.specifications;
  }

  // Format the response according to the requested structure
  res.json({
    product: {
      id: product.id,
      title: product.title,
      brand: product.brand,
      category: product.category,
      description: product.description || formattedSpecifications,
      rating: product.rating,
      reviews: product.reviews,
      specifications: product.specifications || {},
      offers: product.offers || [],
      price: product.price,
      discounted_price: product.discounted_price,
      mainImage: product.image || (product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : 'https://via.placeholder.com/300?text=No+Image'),
      image: product.image || (product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : 'https://via.placeholder.com/300?text=No+Image'),
      images: product.images || product.image_urls || [],
      product_link: product.product_link
    },
    vendors: product.vendor_list || [] // Flat array of platforms
  });
}));

// ==================== PRICE & STATS ====================

router.get('/price-range', asyncHandler(async (req, res) => {
  const { category } = req.query;
  const priceRange = await getPriceRange(category);
  
  res.json({
    type: 'price_range',
    ...priceRange
  });
}));

router.get('/statistics/vendors', asyncHandler(async (req, res) => {
  const stats = await getVendorStatistics();
  
  res.json({
    type: 'vendor_statistics',
    vendors: stats
  });
}));

// Alias for backward compatibility
router.get('/vendor-statistics', asyncHandler(async (req, res) => {
  const stats = await getVendorStatistics();
  
  res.json({
    type: 'vendor_statistics',
    vendors: stats
  });
}));

// ==================== PRICE COMPARISON & BEST PRICE ====================

/**
 * Enhanced product details with price comparison from all platforms
 * Returns: Platform prices, offers, best price, and all comparison data
 */
router.get('/comparison/:productId', comparisonLimiter, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await getProductById(parseInt(productId));

  if (!product || !product.vendors) {
    return res.status(404).json({
      error: 'Product not found',
      product_id: productId
    });
  }

  // Calculate best price
  const bestPriceData = calculateBestPrice(product.vendors);

  // Format price comparison for all platforms
  const priceComparison = formatPriceComparison(product.vendors, product);

  // Calculate price statistics
  const priceStats = calculatePriceStats(product.vendors);

  // Process images with fallback
  const imageData = formatImagesForResponse(product.image_urls, product.category);

  // Get offers
  const offersData = getAllOffersForProduct({
    category: product.category,
    offers: product.offers
  });
  const formattedOffers = formatOffersForDisplay(offersData);

  res.json({
    product: {
      id: product.id,
      title: product.title,
      brand: product.brand,
      category: product.category,
      description: product.specifications || {},
      rating: product.rating || 0,
      reviews: product.reviews || 0,
      images: imageData
    },
    bestPrice: {
      ...bestPriceData,
      bestPriceFormatted: `₹${bestPriceData.bestPrice}`,
      savings: `You save ₹${bestPriceData.savings} (${bestPriceData.discount}% off average)`
    },
    priceComparison,
    priceStats,
    offers: formattedOffers,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get best price for a product across all vendors
 */
router.get('/best-price/:productId', comparisonLimiter, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await getProductById(parseInt(productId));

  if (!product || !product.vendors) {
    return res.status(404).json({
      error: 'Product not found',
      product_id: productId
    });
  }

  const bestPriceData = calculateBestPrice(product.vendors);

  res.json({
    productId,
    title: product.title,
    bestPrice: bestPriceData.bestPrice,
    bestVendor: bestPriceData.bestVendor,
    currency: '₹',
    savings: bestPriceData.savings,
    discountPercentage: bestPriceData.discount,
    vendorPrices: Object.entries(product.vendors).map(([vendor, pricing]) => ({
      vendor,
      price: pricing.discounted_price || pricing.price,
      originalPrice: pricing.price
    }))
  });
}));

/**
 * Get all offers for a product
 */
router.get('/offers/:productId', offerLimiter, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await getProductById(parseInt(productId));

  if (!product) {
    return res.status(404).json({
      error: 'Product not found',
      product_id: productId
    });
  }

  const offers = getAllOffersForProduct({
    category: product.category,
    offers: product.offers
  });

  const formatted = formatOffersForDisplay(offers);

  res.json({
    productId,
    title: product.title,
    topOffers: formatted.topOffers,
    allOffers: formatted.allOffers,
    totalOffers: formatted.totalOfferCount,
    timestamp: new Date().toISOString()
  });
}));

// ==================== HEALTH & INFO ====================

router.get('/info', (req, res) => {
  res.json({
    name: 'DaamDekho Affiliate Marketing API',
    version: '2.0.0',
    environment: process.env.NODE_ENV,
    database: 'SQLite 3'
  });
});

router.get('/health/database', asyncHandler(async (req, res) => {
  const categories = await getAllCategories();
  const stats = await getVendorStatistics();
  
  res.json({
    status: 'healthy',
    database: 'connected',
    vendor_stats: stats,
    total_categories: categories.length,
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
}));

export default router;
