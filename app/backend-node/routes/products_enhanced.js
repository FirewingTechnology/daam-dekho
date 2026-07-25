import { Router } from 'express';
import { 
  getProductFromVendor, 
  findCrossVendorMatches, 
  getPriceComparison, 
  getBestPriceDeals,
  getProductGroups 
} from '../utils/productComparison.js';
import { getDatabase } from '../utils/database.js';

const router = Router();

/**
 * GET /api/products/:productId/vendor/:vendor
 * Get product details with EMI offers
 */
router.get('/:productId/vendor/:vendor', async (req, res) => {
  try {
    const { productId, vendor } = req.params;
    
    const product = await getProductFromVendor(productId, vendor);
    
    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        productId,
        vendor
      });
    }

    // Parse offers to extract EMI details
    const offers = product.offers ? JSON.parse(product.offers) : [];
    const emiDetails = extractEMIDetails(offers);

    res.json({
      product,
      offers: offers,
      emi_details: emiDetails,
      formatted_price: {
        mrp: product.price,
        discounted: product.discounted_price,
        savings: product.price && product.discounted_price 
          ? product.price - product.discounted_price 
          : 0,
        savings_percent: product.price && product.discounted_price
          ? Math.round(((product.price - product.discounted_price) / product.price) * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/compare/:productId/vendor/:vendor
 * Compare product across all vendors with EMI options
 */
router.get('/compare/:productId/vendor/:vendor', async (req, res) => {
  try {
    const { productId, vendor } = req.params;
    
    const comparison = await getPriceComparison(productId, vendor);
    
    if (!comparison) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Enhance with EMI details for original product
    const originalEMI = extractEMIDetails(comparison.product.offers || []);

    // Enhance with EMI details for matches
    const enhancedMatches = comparison.crossVendorMatches.map(match => ({
      ...match,
      emi_details: extractEMIDetails(match.offers || []),
      formatted_price: {
        mrp: match.price,
        discounted: match.discountedPrice,
        savings: match.price && match.discountedPrice
          ? match.price - match.discountedPrice
          : 0,
        savings_percent: match.price && match.discountedPrice
          ? Math.round(((match.price - match.discountedPrice) / match.price) * 100)
          : 0
      }
    }));

    res.json({
      ...comparison,
      original_emi: originalEMI,
      cross_vendor_matches_enhanced: enhancedMatches,
      all_vendors_prices: enhancedMatches.map(m => ({
        vendor: m.vendor,
        price: m.discountedPrice || m.price,
        emi_available: m.emi_details?.has_emi || false,
        emi_starting_amount: m.emi_details?.starting_amount || null,
        emi_months: m.emi_details?.months || [],
        confidence: m.confidence
      }))
    });
  } catch (error) {
    console.error('Error in comparison:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/best-deals
 * Get best price deals across all vendors with EMI info
 */
router.get('/best-deals', async (req, res) => {
  try {
    const { query = 'iPhone', limit = 10 } = req.query;
    
    const deals = await getBestPriceDeals(query, parseInt(limit));
    
    // Enhance each deal with EMI information
    const enhancedDeals = deals.map(deal => ({
      ...deal,
      emi_details: null, // Can be populated if offers are stored
      effective_price_range: {
        min: deal.discountedPrice || deal.price,
        with_emi: true
      }
    }));

    res.json({
      query,
      results_count: enhancedDeals.length,
      deals: enhancedDeals
    });
  } catch (error) {
    console.error('Error fetching best deals:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/grouped
 * Get product groups with EMI comparison
 */
router.get('/grouped', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const groups = await getProductGroups(parseInt(limit));
    
    res.json({
      total_groups: groups.length,
      groups: groups.map(group => ({
        ...group,
        price_range: {
          min: group.min_discounted_price || group.min_price,
          max: group.min_price,
          vendors: group.vendors.split(',')
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching product groups:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/category/:category
 * Get products by category with EMI options
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { vendor = null, limit = 20 } = req.query;
    
    const db = getDatabase();
    
    let query = `
      SELECT 
        id, vendor, title, brand, price, discounted_price, 
        rating, reviews, offers, image_urls, product_link,
        seller_name, availability
      FROM (
    `;
    
    const vendors = vendor ? [vendor] : ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];
    const queries = vendors.map(v => 
      `SELECT *, '${v}' as vendor FROM ${v}_products`
    ).join(' UNION ALL ');
    
    query += `
      ${queries}
    )
    WHERE LOWER(category) = LOWER(?)
    LIMIT ?
    `;
    
    db.all(query, [category, parseInt(limit)], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const products = (rows || []).map(row => ({
        id: row.id,
        vendor: row.vendor,
        title: row.title,
        brand: row.brand,
        price: row.price,
        discountedPrice: row.discounted_price,
        rating: row.rating,
        reviews: row.reviews,
        offers: row.offers ? JSON.parse(row.offers) : [],
        emi_details: extractEMIDetails(row.offers || []),
        image_urls: row.image_urls,
        product_link: row.product_link,
        seller_name: row.seller_name,
        availability: row.availability
      }));

      res.json({
        category,
        vendor: vendor || 'all',
        count: products.length,
        products
      });
    });
  } catch (error) {
    console.error('Error fetching category products:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Extract EMI details from offers text/JSON
 */
function extractEMIDetails(offers) {
  if (!offers) return null;
  
  // Convert to string if array
  const offersText = Array.isArray(offers) ? offers.join(' ') : offers;
  
  if (!offersText) return null;

  const emiInfo = {
    has_emi: false,
    is_no_cost: false,
    starting_amount: null,
    months: [],
    interest_rate: null,
    eligible_banks: [],
    offer_text: offersText
  };

  // Check for EMI
  if (!offersText.toLowerCase().includes('emi')) {
    return null;
  }

  emiInfo.has_emi = true;

  // Check for no-cost EMI
  if (offersText.toLowerCase().includes('no') && offersText.toLowerCase().includes('cost')) {
    emiInfo.is_no_cost = true;
  }

  // Extract starting amount (e.g., "₹4,743" or "$100")
  const amountMatch = offersText.match(/[₹$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (amountMatch) {
    emiInfo.starting_amount = amountMatch[0];
  }

  // Extract months (3, 6, 9, 12, 18, 24)
  const monthMatches = offersText.match(/(\d{1,2})\s*(?:month|months)/gi);
  if (monthMatches) {
    const months = new Set();
    monthMatches.forEach(match => {
      const num = parseInt(match.match(/\d+/)[0]);
      if (num >= 3 && num <= 24) months.add(num);
    });
    emiInfo.months = Array.from(months).sort((a, b) => a - b);
  }

  // Extract interest rate
  const rateMatch = offersText.match(/(\d+(?:\.\d{2})?)\s*%\s*(?:interest|rate|p\.a|pa)/i);
  if (rateMatch) {
    emiInfo.interest_rate = rateMatch[1];
  }

  // Extract eligible banks
  const bankNames = ['ICICI', 'HDFC', 'Axis', 'SBI', 'Kotak', 'IndusInd', 'Yes Bank', 'RBL'];
  bankNames.forEach(bank => {
    if (offersText.toUpperCase().includes(bank)) {
      emiInfo.eligible_banks.push(bank);
    }
  });

  return emiInfo;
}

export default router;
