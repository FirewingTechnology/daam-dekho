/**
 * Price Calculation Engine
 * Handles best price calculation, comparisons, and price tracking
 */

/**
 * Calculate best price from all vendor prices
 * Formula: Best Price = MIN(Amazon, Flipkart, Croma, VijaySales, JioMart, Samsung, Apple)
 */
export function calculateBestPrice(vendorPrices) {
  if (!vendorPrices || Object.keys(vendorPrices).length === 0) {
    return {
      bestPrice: null,
      bestVendor: null,
      savings: 0,
      discount: 0
    };
  }

  let bestPrice = Infinity;
  let bestVendor = null;
  const priceMap = {};

  // Extract all valid prices
  Object.entries(vendorPrices).forEach(([vendor, pricing]) => {
    const price = pricing.discounted_price || pricing.price;
    if (price && !isNaN(price)) {
      priceMap[vendor] = price;
      if (price < bestPrice) {
        bestPrice = price;
        bestVendor = vendor;
      }
    }
  });

  // If no valid prices found
  if (bestPrice === Infinity) {
    return {
      bestPrice: null,
      bestVendor: null,
      savings: 0,
      discount: 0
    };
  }

  // Calculate average price (for comparison)
  const prices = Object.values(priceMap);
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const savings = Math.round(averagePrice - bestPrice);
  const discount = Math.round((savings / averagePrice) * 100);

  return {
    bestPrice: Math.round(bestPrice),
    bestVendor,
    savings,
    discount,
    priceMap
  };
}

/**
 * Format price comparison for display
 * Returns normalized price data from all platforms
 */
export function formatPriceComparison(vendorPrices, productInfo = {}) {
  const comparison = [];
  const VENDOR_NAMES = {
    amazon: 'Amazon',
    flipkart: 'Flipkart',
    croma: 'Croma',
    jiomart: 'JioMart',
    vijaysales: 'Vijay Sales',
    samsung: 'Samsung',
    apple: 'Apple'
  };

  Object.entries(vendorPrices).forEach(([vendor, pricing]) => {
    const price = pricing.price || 0;
    const discountedPrice = pricing.discounted_price || price;
    const discount = price > 0 ? Math.round(((price - discountedPrice) / price) * 100) : 0;

    comparison.push({
      platform: VENDOR_NAMES[vendor] || vendor,
      vendor,
      originalPrice: Math.round(price),
      specialPrice: Math.round(discountedPrice),
      daamDekhoPreferredPrice: Math.round(discountedPrice),
      discount,
      rating: pricing.rating || 0,
      reviews: pricing.reviews || 0,
      productLink: pricing.product_link || null,
      availability: pricing.availability || 'Unknown',
      lastUpdated: productInfo.updated_at || new Date().toISOString(),
      offers: pricing.offers || [],
      sellerName: pricing.seller_name || vendor
    });
  });

  // Sort by special price (ascending)
  comparison.sort((a, b) => a.specialPrice - b.specialPrice);

  return comparison;
}

/**
 * Calculate price statistics
 */
export function calculatePriceStats(vendorPrices) {
  const prices = Object.entries(vendorPrices)
    .map(([, pricing]) => pricing.discounted_price || pricing.price)
    .filter(p => p && !isNaN(p));

  if (prices.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      median: 0
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const min = Math.round(sorted[0]);
  const max = Math.round(sorted[sorted.length - 1]);
  const avg = Math.round(sorted.reduce((a, b) => a + b) / sorted.length);
  const median = Math.round(
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
  );

  return { min, max, avg, median };
}

/**
 * Validate price data
 */
export function validatePriceData(pricing) {
  return {
    hasOriginalPrice: pricing.price > 0,
    hasDiscountedPrice: pricing.discounted_price > 0,
    hasValidDiscount: pricing.price > pricing.discounted_price,
    isAvailable: pricing.availability !== 'Out of Stock',
    hasRating: pricing.rating > 0
  };
}

/**
 * Format timestamp as human-readable
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}
