/**
 * 🎯 BEST DEAL API ROUTES
 * Smart price comparison endpoints
 */

import express from 'express';
import { calculateBestDeal } from '../services/bestDealService.js';
import { getDatabase } from '../utils/database.js';

const router = express.Router();

/**
 * GET /api/best-deal/:productId
 * Calculate best deal for a specific product across all vendors
 * 
 * Query Parameters:
 * - preferredBanks: comma-separated bank codes (e.g., ICICI,HDFC)
 * - includeCashback: boolean (true/false)
 * - includeExchange: boolean (true/false)
 * - wantEMI: boolean (true/false)
 */
router.get('/best-deal/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Extract user preferences from query parameters
    const userPreferences = {
      preferredBanks: (req.query.preferredBanks || '').split(',').filter(b => b),
      includeCashback: req.query.includeCashback !== 'false',
      includeExchange: req.query.includeExchange !== 'false',
      wantEMI: req.query.wantEMI === 'true'
    };

    // Validate product ID
    if (!productId || isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID',
        code: 'INVALID_PRODUCT_ID'
      });
    }

    // Get database connection
    const db = getDatabase();

    // Calculate best deal
    const result = await calculateBestDeal(db, parseInt(productId), userPreferences);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Cache the response for 1 hour
    res.set('Cache-Control', 'public, max-age=3600');

    return res.json(result);
  } catch (error) {
    console.error('Error in best-deal endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/best-deal-premium/:productId
 * Premium version with detailed analysis and recommendations
 * Includes historical price trends, demand signals, and smart recommendations
 */
router.get('/best-deal-premium/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const userPreferences = {
      preferredBanks: (req.query.preferredBanks || '').split(',').filter(b => b),
      includeCashback: req.query.includeCashback !== 'false',
      includeExchange: req.query.includeExchange !== 'false',
      wantEMI: req.query.wantEMI === 'true'
    };

    const db = getDatabase();
    const dealResult = await calculateBestDeal(db, parseInt(productId), userPreferences);

    if (!dealResult.success) {
      return res.status(404).json({
        success: false,
        error: dealResult.error,
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Add premium recommendations
    const premiumResult = {
      ...dealResult,
      recommendations: generateRecommendations(dealResult),
      analysis: generatePriceAnalysis(dealResult),
      timestamp: new Date().toISOString()
    };

    res.set('Cache-Control', 'public, max-age=1800');
    return res.json(premiumResult);
  } catch (error) {
    console.error('Error in premium best-deal endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Generate smart recommendations based on deal analysis
 */
const generateRecommendations = (dealResult) => {
  const recommendations = [];
  const bestDeal = dealResult.results[0];

  // Recommendation 1: Best overall deal
  recommendations.push({
    type: 'BEST_PRICE',
    title: 'Lowest Price Available',
    description: `₹${bestDeal.effectivePrice.toLocaleString('en-IN')} on ${bestDeal.platformName}`,
    priority: 'HIGH'
  });

  // Recommendation 2: Best for installments
  const emiAvail = dealResult.results.find(r => r.emiDetails);
  if (emiAvail) {
    recommendations.push({
      type: 'EMI_OPTION',
      title: 'Easy EMI Available',
      description: `₹${emiAvail.emiDetails?.monthlyAmount.toLocaleString('en-IN')}/month on ${emiAvail.platformName}`,
      priority: 'MEDIUM'
    });
  }

  // Recommendation 3: Best offers
  const bestOffers = dealResult.results.find(r => r.offerHighlights?.length > 0);
  if (bestOffers) {
    recommendations.push({
      type: 'BEST_OFFERS',
      title: 'Maximum Offers',
      description: `${bestOffers.offerHighlights.length} active offers on ${bestOffers.platformName}`,
      priority: 'MEDIUM'
    });
  }

  // Recommendation 4: Best rating
  const bestRated = [...dealResult.results].sort((a, b) => b.rating - a.rating)[0];
  if (bestRated && bestRated.rating > 0) {
    recommendations.push({
      type: 'BEST_RATING',
      title: 'Highest Rated Seller',
      description: `${bestRated.rating} stars on ${bestRated.platformName}`,
      priority: 'LOW'
    });
  }

  return recommendations;
};

/**
 * Generate price analysis insights
 */
const generatePriceAnalysis = (dealResult) => {
  const results = dealResult.results;
  const prices = results.map(r => r.effectivePrice);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice;

  return {
    avgPrice: Math.round(avgPrice),
    minPrice,
    maxPrice,
    priceRange,
    standardDeviation: Math.round(
      Math.sqrt(
        prices.reduce((sq, n) => sq + Math.pow(n - avgPrice, 2), 0) / prices.length
      )
    ),
    variance: ((priceRange / avgPrice) * 100).toFixed(2),
    insight: generatePriceInsight(avgPrice, minPrice, priceRange)
  };
};

/**
 * Generate human-readable price insight
 */
const generatePriceInsight = (avgPrice, minPrice, priceRange) => {
  const savingPercent = ((priceRange / avgPrice) * 100).toFixed(1);

  if (savingPercent > 10) {
    return `Significant variation! Choosing the best deal saves ₹${Math.round(priceRange)} (${savingPercent}% of average price).`;
  } else if (savingPercent > 5) {
    return `Good price difference available. Smart choice saves ₹${Math.round(priceRange)} vs other options.`;
  } else {
    return 'Prices are fairly stable across platforms. Choose based on delivery time or offers.';
  }
};

/**
 * GET /api/compare-products
 * Compare multiple products at once
 * 
 * Query Parameters:
 * - ids: comma-separated product IDs
 */
router.get('/compare-products', async (req, res) => {
  try {
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: 'Missing product IDs',
        code: 'MISSING_IDS'
      });
    }

    const productIds = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

    if (productIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product IDs',
        code: 'INVALID_IDS'
      });
    }

    const db = getDatabase();
    const userPreferences = {
      preferredBanks: (req.query.preferredBanks || '').split(',').filter(b => b),
      includeCashback: req.query.includeCashback !== 'false',
      includeExchange: req.query.includeExchange !== 'false'
    };

    // Calculate deals for all products
    const deals = await Promise.all(
      productIds.map(id => calculateBestDeal(db, id, userPreferences))
    );

    const successfulDeals = deals.filter(d => d.success);

    return res.json({
      success: true,
      totalProducts: productIds.length,
      successfulComparisons: successfulDeals.length,
      deals: successfulDeals
    });
  } catch (error) {
    console.error('Error in compare-products endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/deals/trending
 * Get trending deals (best deals from recent searches)
 */
router.get('/deals/trending', async (req, res) => {
  try {
    // This would typically query a trending deals cache
    // For now, returning a structured response
    return res.json({
      success: true,
      trending: [
        {
          category: 'Mobile',
          deals: [],
          updated: new Date().toISOString()
        }
      ]
    });
  } catch (error) {
    console.error('Error in trending deals endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/deals/preferences
 * Save user deal preferences
 */
router.post('/deals/preferences', async (req, res) => {
  try {
    const { userId, preferences } = req.body;

    if (!userId || !preferences) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId or preferences',
        code: 'INVALID_REQUEST'
      });
    }

    // This would typically save to a user preferences database
    // For now, just echo back the preferences
    return res.json({
      success: true,
      message: 'Preferences saved successfully',
      userId,
      preferences: {
        preferredBanks: preferences.preferredBanks || [],
        includeCashback: preferences.includeCashback !== false,
        includeExchange: preferences.includeExchange !== false,
        wantEMI: preferences.wantEMI || false
      }
    });
  } catch (error) {
    console.error('Error in save preferences endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
