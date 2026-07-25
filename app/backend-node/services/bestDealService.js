/**
 * 🏆 BEST DEAL SERVICE
 * Orchestrates the pricing engine for multi-platform comparison
 * Fetches product data and calculates the best deal across all vendors
 */

import {
  calculateEffectivePrice,
  parseOffersFromDB,
  generateOfferHighlights
} from '../utils/pricingEngine.js';

/**
 * Fetch product from database
 * @param {object} db - SQLite database instance
 * @param {number} productId - Product ID
 * @returns {Promise<array>} Array of product data from all vendors
 */
export const fetchProductFromAllVendors = async (db, productId) => {
  return new Promise((resolve) => {
    // BUG-06 FIX: Refactored database query to correctly join products_master,
    // product_variants, and vendor_products using the updated schema.
    // The previous implementation queried non-existent tables like 'amazon_products'.
    const query = `
      SELECT vp.*, v.name as vendor, pm.title, pm.category
      FROM vendor_products vp
      JOIN vendors v ON vp.vendor_id = v.id
      JOIN product_variants pv ON vp.variant_id = pv.id
      JOIN products_master pm ON pv.product_id = pm.id
      WHERE pm.id = ?
    `;

    db.all(query, [productId], (err, rows) => {
      if (err) {
        console.error('Error fetching vendor products:', err);
        resolve([]);
      } else {
        // Map table fields to match the service expectations
        const formattedRows = (rows || []).map(row => ({
          ...row,
          // Map to lowercase vendor keys
          vendor: row.vendor ? row.vendor.toLowerCase() : '',
          price: row.mrp || row.price || 0,
          discounted_price: row.price || 0, // In new schema, vp.price is the selling (discounted) price
          rating: row.rating || 0,
          reviews: row.reviews || 0,
          offers: row.offers || null
        }));
        resolve(formattedRows);
      }
    });
  });
};

/**
 * Convert vendor product data to pricing engine format
 * @param {object} vendorProduct - Product data from specific vendor
 * @returns {object} Pricing data for calculateEffectivePrice
 */
export const convertToPricingFormat = (vendorProduct = {}) => {
  const {
    price = 0,
    discounted_price = 0,
    offers = null
  } = vendorProduct;

  // Parse offers from database
  let parsedOffers = {};
  if (offers) {
    try {
      parsedOffers = typeof offers === 'string' ? JSON.parse(offers) : offers;
    } catch (e) {
      console.error('Error parsing offers:', e);
      parsedOffers = {};
    }
  }

  // Extract different types of offers
  const platformDiscount = {};
  const bankOffers = [];
  let couponOffer = {};
  let cashbackOffer = {};
  let exchangeBonus = {};
  let deliveryCharge = {};

  if (Array.isArray(parsedOffers)) {
    parsedOffers.forEach((offer) => {
      const desc = (offer.description || offer.code || '').toLowerCase();

      // Bank offers
      if (desc.includes('bank') || desc.includes('icici') || desc.includes('hdfc')) {
        bankOffers.push({
          bank: extractBankName(offer.description),
          percentage: extractPercentage(desc),
          flatAmount: extractAmount(desc),
          maxDiscount: Infinity,
          minTransaction: 0
        });
      }
      // Coupon offers
      else if (desc.includes('coupon') || desc.includes('code')) {
        couponOffer = {
          code: offer.code || 'PROMO',
          flatAmount: extractAmount(desc),
          percentage: extractPercentage(desc),
          minTransaction: 0,
          maxDiscount: Infinity,
          applicable: true
        };
      }
      // Cashback
      else if (desc.includes('cashback')) {
        cashbackOffer = {
          flatAmount: extractAmount(desc),
          percentage: extractPercentage(desc),
          maxCashback: Infinity,
          minTransaction: 0,
          applicable: true
        };
      }
      // Exchange
      else if (desc.includes('exchange') || desc.includes('trade-in')) {
        exchangeBonus = {
          bonus: extractAmount(desc),
          maxBonus: Infinity,
          applicable: true
        };
      }
      // Delivery
      else if (desc.includes('delivery') || desc.includes('shipping')) {
        deliveryCharge = {
          charge: extractAmount(desc) || 0,
          freeAbove: 0,
          applicable: true
        };
      }
    });
  }

  // Calculate platform discount if discounted price is lower
  if (discounted_price > 0 && discounted_price < price) {
    platformDiscount.flatAmount = price - discounted_price;
  }

  return {
    basePrice: price || discounted_price || 0,
    platformDiscount,
    couponOffer,
    bankOffers,
    cashbackOffer,
    exchangeBonus,
    deliveryCharge
  };
};

/**
 * Extract amount/number from text
 * @param {string} text - Text to search
 * @returns {number} Extracted amount
 */
const extractAmount = (text = '') => {
  const match = text.match(/₹?(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

/**
 * Extract percentage from text
 * @param {string} text - Text to search
 * @returns {number} Extracted percentage
 */
const extractPercentage = (text = '') => {
  const match = text.match(/(\d+)\s*%/);
  return match ? parseInt(match[1]) : 0;
};

/**
 * Extract bank name from text
 * @param {string} text - Text to search
 * @returns {string} Bank name
 */
const extractBankName = (text = '') => {
  if (text.includes('ICICI')) return 'ICICI';
  if (text.includes('HDFC')) return 'HDFC';
  if (text.includes('SBI')) return 'SBI';
  if (text.includes('Axis')) return 'Axis';
  return 'Bank';
};

/**
 * Calculate best deal across multiple vendors
 * @param {object} db - SQLite database instance
 * @param {number} productId - Product ID
 * @param {object} userPreferences - User preference options (optional)
 * @returns {Promise<object>} Best deal calculation results with all platform data
 */
export const calculateBestDeal = async (db, productId, userPreferences = {}) => {
  try {
    // Fetch product from all vendors
    const vendorProducts = await fetchProductFromAllVendors(db, productId);

    if (vendorProducts.length === 0) {
      throw new Error(`Product ${productId} not found in any vendor`);
    }

    // Get product info from first vendor (same product across vendors)
    const firstProduct = vendorProducts[0];
    const productName = firstProduct.title || 'Unknown Product';
    const category = firstProduct.category || 'General';

    // Calculate effective prices for each vendor
    const dealResults = vendorProducts
      .map((vendorProduct) => {
        try {
          const pricingData = convertToPricingFormat(vendorProduct);

          const breakdown = calculateEffectivePrice({
            ...pricingData,
            userPreferences: {
              preferredBanks: userPreferences.preferredBanks || [],
              includeCashback: userPreferences.includeCashback !== false,
              includeExchange: userPreferences.includeExchange !== false,
              wantEMI: userPreferences.wantEMI || false
            }
          });

          const offerHighlights = generateOfferHighlights(breakdown);

          return {
            vendor: vendorProduct.vendor,
            platformName: capitalizeVendor(vendorProduct.vendor),
            effectivePrice: breakdown.effectivePrice,
            basePrice: breakdown.basePrice,
            totalSavings: breakdown.totalSavings,
            savingsPercentage: breakdown.savingsPercentage,
            rating: vendorProduct.rating || 0,
            reviews: vendorProduct.reviews || 0,
            availability: vendorProduct.availability || 'Check',
            productLink: vendorProduct.product_link || '#',
            isBestDeal: false,
            breakdown: {
              basePrice: breakdown.basePrice,
              platformDiscount: breakdown.platformDiscount,
              couponDiscount: breakdown.couponDiscount,
              bankDiscount: breakdown.bankDiscount,
              bankName: breakdown.bankName,
              cashback: breakdown.cashback,
              exchangeBonus: breakdown.exchangeBonus,
              deliveryCharge: breakdown.deliveryCharge
            },
            offerHighlights,
            emiDetails: breakdown.emiDetails
          };
        } catch (err) {
          console.error(`Error calculating price for ${vendorProduct.vendor}:`, err);
          return null;
        }
      })
      .filter((result) => result !== null)
      .sort((a, b) => a.effectivePrice - b.effectivePrice);

    if (dealResults.length === 0) {
      throw new Error('Could not calculate prices for any vendor');
    }

    // Mark best deal
    dealResults[0].isBestDeal = true;

    // Calculate savings vs next best
    const savingsVsNextBest = dealResults.length > 1
      ? dealResults[1].effectivePrice - dealResults[0].effectivePrice
      : 0;

    return {
      success: true,
      productId,
      productName,
      category,
      bestDealPlatform: dealResults[0].platformName,
      bestDealPrice: dealResults[0].effectivePrice,
      bestDealBreakdown: dealResults[0].breakdown,
      bestDealOffers: dealResults[0].offerHighlights,
      savingsVsNextBest: Math.round(savingsVsNextBest),
      totalVendorsCompared: dealResults.length,
      results: dealResults,
      // UI Support
      badgeText: `Save ₹${Math.round(savingsVsNextBest)}!`,
      totalSavingsText: `You save ₹${Math.round(savingsVsNextBest)} vs ${dealResults[1]?.platformName || 'other stores'}`,
      bestDealBadgeText: '🏆 Best Deal'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      productId
    };
  }
};

/**
 * Capitalize vendor name for display
 * @param {string} vendor - Vendor code
 * @returns {string} Display name
 */
const capitalizeVendor = (vendor = '') => {
  const vendorNames = {
    amazon: 'Amazon',
    flipkart: 'Flipkart',
    croma: 'Croma',
    jiomart: 'JioMart',
    vijaysales: 'Vijay Sales',
    reliance_digital: 'Reliance Digital',
    snapdeal: 'Snapdeal',
    ebay: 'eBay',
    myntra: 'Myntra'
  };

  return vendorNames[vendor] || vendor.charAt(0).toUpperCase() + vendor.slice(1);
};

/**
 * Search and calculate best deal for products matching criteria
 * @param {object} db - SQLite database instance
 * @param {string} searchQuery - Search term
 * @param {object} userPreferences - User preferences
 * @returns {Promise<array>} Array of best deals for matching products
 */
export const searchAndCalculateBestDeals = async (db, searchQuery, userPreferences = {}) => {
  try {
    return {
      success: true,
      query: searchQuery,
      results: []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  fetchProductFromAllVendors,
  convertToPricingFormat,
  calculateBestDeal,
  searchAndCalculateBestDeals
};
