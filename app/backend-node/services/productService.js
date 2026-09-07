import { query, get } from '../utils/db.js';
import { computeFreshness } from '../routes/priceRefresh.js';

export const getHomeData = async () => {
  const categories = await query(`SELECT DISTINCT category FROM products_master LIMIT 8`);

  const trendingDeals = await query(`
    SELECT pm.id, pm.title, pm.brand, pm.category, pm.id as slug, pm.base_image, pm.base_image as image_url, 
           MIN(vp.price) as discounted_Price, MAX(vp.mrp) as price, MAX(vp.discount_percent) as discount_percent,
           v.name as vendor_name, NULL as vendor_logo
    FROM products_master pm
    JOIN product_variants pv ON pm.id = pv.product_id
    JOIN vendor_products vp ON pv.id = vp.variant_id
    JOIN vendors v ON vp.vendor_id = v.id
    GROUP BY pm.id
    ORDER BY MAX(vp.discount_percent) DESC
    LIMIT 10
  `);

  const processedTrending = trendingDeals.map(p => ({
    ...p,
    image_urls: p.base_image ? [p.base_image] : []
  }));

  const hotPriceDrops = await query(`
    SELECT pm.id, pm.title, pm.brand, pm.category, pm.id as slug, pm.base_image, pm.base_image as image_url, 
           vp.price as discounted_Price, vp.mrp as price, vp.discount_percent,
           v.name as vendor_name
    FROM products_master pm
    JOIN product_variants pv ON pm.id = pv.product_id
    JOIN vendor_products vp ON pv.id = vp.variant_id
    JOIN vendors v ON vp.vendor_id = v.id
    WHERE vp.discount_percent > 30
    ORDER BY vp.last_scraped_at DESC
    LIMIT 10
  `);

  const processedHot = hotPriceDrops.map(p => ({
    ...p,
    image_urls: p.base_image ? [p.base_image] : []
  }));

  const latestProducts = await query(`
    SELECT pm.id, pm.title, pm.brand, pm.category, pm.id as slug, pm.base_image, pm.base_image as image_url, 
           MIN(vp.price) as discounted_Price, vp.mrp as price
    FROM products_master pm
    JOIN product_variants pv ON pm.id = pv.product_id
    JOIN vendor_products vp ON pv.id = vp.variant_id
    GROUP BY pm.id
    ORDER BY pm.created_at DESC
    LIMIT 10
  `);

  const processedLatest = latestProducts.map(p => ({
    ...p,
    image_urls: p.base_image ? [p.base_image] : []
  }));

  return {
    categories: categories.map(c => c.category),
    trendingDeals: processedTrending,
    hotPriceDrops: processedHot,
    latestProducts: processedLatest
  };
};

export const searchProducts = async (filters) => {
  const { query: q, category, brands, min_price, max_price, ram, storage, sort_by: sort, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  // Map numeric sort values from frontend ("1" = low→high, "-1" = high→low)
  const sortMap = { '1': 'price_low', '-1': 'price_high', 'price_low': 'price_low', 'price_high': 'price_high', 'discount': 'discount', 'latest': 'latest' };
  const resolvedSort = sortMap[sort] || 'price_high';

  let sql = `
    SELECT pm.id, COALESCE(pm.canonical_title, pm.title) as title, pm.brand, pm.category, pm.id as slug, pm.base_image, pm.base_image as image_url,
           MIN(vp.price) as discounted_price, MAX(vp.mrp) as mrp, MIN(vp.price) as price, MAX(vp.discount_percent) as discount_percent,
           COUNT(DISTINCT vp.vendor_id) as vendor_count,
           MAX(vp.rating) as rating, MAX(vp.reviews) as reviews,
           COALESCE(srr.priority_weight, 0) as ranking_weight
    FROM products_master pm
    JOIN product_variants pv ON pm.id = pv.product_id
    JOIN vendor_products vp ON pv.id = vp.variant_id
    LEFT JOIN search_ranking_rules srr ON LOWER(pm.category) = LOWER(srr.category_pattern)
    WHERE 1=1
  `;
  const params = [];

  if (q) {
    const typoMap = {
      'iphne': 'iphone', 'ifone': 'iphone', 'ipone': 'iphone',
      'samsng': 'samsung', 'samung': 'samsung', 'aple': 'apple', 'appl': 'apple'
    };
    const keywords = q.trim().split(/\s+/).map(w => typoMap[w.toLowerCase()] || w);
    keywords.forEach(kw => {
      sql += ` AND (LOWER(COALESCE(pm.canonical_title, pm.title)) LIKE LOWER(?) OR LOWER(pm.title) LIKE LOWER(?) OR LOWER(pm.brand) LIKE LOWER(?))`;
      params.push(`%${kw}%`, `%${kw}%`, `%${kw}%`);
    });
  }

  if (category) {
    // Handle both singular (Mobile) and plural (Mobiles) in DB
    sql += ` AND (LOWER(pm.category) = LOWER(?) OR LOWER(pm.category) = LOWER(?) OR LOWER(pm.category) = LOWER(?) )`;
    const singular = category.replace(/s$/i, '');
    const plural = category.replace(/s$/i, '') + 's';
    params.push(category, singular, plural);
  }
  if (brands) {
    const brandList = Array.isArray(brands)
      ? brands.map(b => b.trim().toLowerCase())
      : brands.split(',').map(b => b.trim().toLowerCase());
    sql += ` AND LOWER(pm.brand) IN (${brandList.map(() => '?').join(',')})`;
    params.push(...brandList);
  }
  if (ram) {
    sql += ` AND pv.ram = ?`;
    params.push(ram);
  }
  if (storage) {
    sql += ` AND pv.storage = ?`;
    params.push(storage);
  }

  sql += ` GROUP BY pm.id`;

  // Price filter goes into HAVING so it works on the MIN(vp.price) aggregate
  const havingClauses = [];
  const havingParams = [];
  if (min_price) { havingClauses.push('MIN(vp.price) >= ?'); havingParams.push(Number(min_price)); }
  if (max_price) { havingClauses.push('MIN(vp.price) <= ?'); havingParams.push(Number(max_price)); }
  if (havingClauses.length) sql += ` HAVING ${havingClauses.join(' AND ')}`;
  params.push(...havingParams);

  // Dynamic Database-Driven Search Ranking Rules (Zero Hardcoded Scores)
  switch (resolvedSort) {
    case 'price_low': sql += ` ORDER BY discounted_Price ASC`; break;
    case 'price_high': sql += ` ORDER BY discounted_Price DESC`; break;
    case 'discount': sql += ` ORDER BY discount_percent DESC`; break;
    case 'latest': sql += ` ORDER BY pm.created_at DESC`; break;
    default: sql += ` ORDER BY ranking_weight DESC, rating DESC, pm.id ASC`;
  }

  const totalSql = `SELECT COUNT(*) as total FROM (${sql}) as _subq`;
  const totalResult = await get(totalSql, params);

  sql += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const rawProducts = await query(sql, params);
  const products = rawProducts.map(p => {
    const img = p.base_image || p.image_url || null;
    return {
      ...p,
      base_image: img,
      image: img,
      image_url: img,
      image_urls: img ? [img] : []
    };
  });

  return {
    products,
    pagination: {
      total: totalResult.total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalResult.total / limit)
    }
  };
};

export const getProductBySlug = async (slug) => {
  const product = await get(`SELECT *, id as slug, base_image, base_image as image_url, COALESCE(canonical_title, title) as display_title FROM products_master WHERE id = ?`, [slug]);
  if (!product) return null;

  // Query Multi-Angle Images Gallery
  const imageRows = await query(`SELECT image_url, image_type FROM product_images WHERE product_id = ?`, [product.id]);
  if (imageRows && imageRows.length > 0) {
    product.image_urls = imageRows.map(img => img.image_url.split('#')[0]);
    product.gallery = imageRows.map(img => ({ url: img.image_url.split('#')[0], type: img.image_type }));
  } else {
    product.image_urls = product.base_image ? [product.base_image] : [];
    product.gallery = product.base_image ? [{ url: product.base_image, type: 'hero' }] : [];
  }

  const ratingData = await get(`
    SELECT MAX(rating) as rating, MAX(reviews) as reviews
    FROM vendor_products vp
    JOIN product_variants pv ON vp.variant_id = pv.id
    WHERE pv.product_id = ?
  `, [product.id]);

  product.rating = ratingData?.rating ?? null;
  product.reviews = ratingData?.reviews ?? null;
  product.review_count = product.reviews;

  // Query Vendor Coverage safely
  try {
    const covData = await get(`SELECT * FROM vendor_coverage WHERE product_id = ?`, [product.id]);
    if (covData) {
      try { covData.missing_vendors = JSON.parse(covData.missing_vendors || '[]'); } catch { covData.missing_vendors = []; }
      product.vendor_coverage = covData;
    } else {
      product.vendor_coverage = { total_vendors_expected: 5, vendors_found_count: 0, coverage_pct: 0, missing_vendors: [] };
    }
  } catch (e) {
    product.vendor_coverage = { total_vendors_expected: 5, vendors_found_count: 0, coverage_pct: 0, missing_vendors: [] };
  }

  // Dynamically compute zero-trust quality metrics
  const variantsForScore = await query(`SELECT * FROM product_variants WHERE product_id = ?`, [product.id]);
  let specScore = 50;
  let hasValidSpecs = false;
  if (variantsForScore && variantsForScore.length > 0) {
    const v = variantsForScore[0];
    let count = 0;
    if (v.cpu && v.cpu.toUpperCase() !== 'UNKNOWN') count += 25;
    if (v.ram && v.ram.toUpperCase() !== 'UNKNOWN') count += 25;
    if (v.storage && v.storage.toUpperCase() !== 'UNKNOWN') count += 25;
    if (v.color && !['default', 'unspecified', 'unknown'].includes(v.color.toLowerCase())) count += 25;
    specScore = count;
    hasValidSpecs = count > 50;
  }

  const vendorsFoundCount = product.vendor_coverage?.vendors_found_count || 0;
  const coverageScore = Math.min(100, vendorsFoundCount * 20);
  const imageScore = product.image_urls.length > 1 ? 100 : (product.image_urls.length === 1 ? 75 : 0);
  const offerScore = vendorsFoundCount > 0 ? 100 : 0;
  const dynamicOverallScore = Math.round((specScore * 0.4) + (coverageScore * 0.3) + (imageScore * 0.15) + (offerScore * 0.15));

  product.completeness_score = {
    overall_score: dynamicOverallScore,
    vendor_coverage_score: coverageScore,
    specification_score: specScore,
    image_score: imageScore,
    offer_score: offerScore,
    validation_score: hasValidSpecs ? 100 : 50,
    trust_score: dynamicOverallScore
  };

  const variants = await query(`SELECT * FROM product_variants WHERE product_id = ?`, [product.id]);

  const vendorsMap = {};
  const allSpecs = {};

  for (const variant of variants) {
    // Collect specs from all variants
    const variantSpecs = await query(`SELECT spec_key, spec_value FROM product_specifications WHERE variant_id = ?`, [variant.id]);
    variantSpecs.forEach(s => {
      if (!allSpecs[s.spec_key]) allSpecs[s.spec_key] = s.spec_value;
    });

    const variantVendors = await query(`
      SELECT vp.*, v.name as vendor_name, NULL as vendor_logo,
             vp.price as discounted_price, vp.price as price, vp.mrp as mrp
      FROM vendor_products vp
      JOIN vendors v ON vp.vendor_id = v.id
      WHERE vp.variant_id = ?
      GROUP BY vp.vendor_id
      ORDER BY vp.price ASC
    `, [variant.id]);

    variant.vendors = variantVendors.map(v => {
      v.variant_label = [variant.storage, variant.ram, (variant.color && !['default', 'unspecified'].includes(variant.color.toLowerCase())) ? variant.color : null].filter(Boolean).join(' | ');
      v.storage = variant.storage;
      v.ram = variant.ram;
      
      let parsedOffers = {};
      try {
        if (typeof v.offers === 'string') {
          parsedOffers = JSON.parse(v.offers);
        } else if (typeof v.offers === 'object' && v.offers !== null) {
          parsedOffers = v.offers;
        }
      } catch (e) {
        parsedOffers = {};
      }

      const itemPrice = Number(v.discounted_Price || v.price || 0);
      // Commercial offer data is source-backed only. Never synthesize EMI, bank, delivery, seller, or stock data.
      v.offers_detail = parsedOffers && typeof parsedOffers === 'object' && Object.keys(parsedOffers).length
        ? {
            emi: parsedOffers.emi || null,
            bank_offers: Array.isArray(parsedOffers.bank_offers) ? parsedOffers.bank_offers : [],
            exchange_offers: Array.isArray(parsedOffers.exchange_offers) ? parsedOffers.exchange_offers : [],
            cashback_offers: Array.isArray(parsedOffers.cashback_offers) ? parsedOffers.cashback_offers : [],
            coupons: Array.isArray(parsedOffers.coupons) ? parsedOffers.coupons : [],
            delivery: v.delivery_days || parsedOffers.delivery || null,
            seller: v.seller || parsedOffers.seller || null,
            stock_status: v.stock_status || parsedOffers.stock_status || null
          }
        : null;

      // Legacy offers array for backward compatibility
      v.offers = parsedOffers.bank_offers
        ? parsedOffers.bank_offers.map(b => typeof b === 'object' ? b.title : String(b))
        : (Array.isArray(v.offers) ? v.offers : []);

      // Normalize vendor product URL fields to populate all aliases consistently
      const rawUrl = v.url || v.product_url || v.product_link || v.link || v.affiliatelink || '';
      let cleanUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
      if (cleanUrl && cleanUrl !== '#' && cleanUrl !== 'N/A') {
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = `https://${cleanUrl}`;
        }
      } else {
        cleanUrl = '';
      }
      v.url = cleanUrl;
      v.product_url = cleanUrl;
      v.product_link = cleanUrl;
      v.link = cleanUrl;
      v.affiliatelink = cleanUrl;

      // Price Refresh metadata
      const currentPrice = v.current_price !== null && v.current_price !== undefined ? v.current_price : v.price;
      const prevPrice = v.previous_price;
      const hasChanged = prevPrice !== null && prevPrice !== undefined && prevPrice !== currentPrice;
      const diff = hasChanged ? (currentPrice - prevPrice) : 0;
      const pct = hasChanged && prevPrice > 0 ? parseFloat(((diff / prevPrice) * 100).toFixed(1)) : 0;
      const direction = diff < 0 ? 'down' : (diff > 0 ? 'up' : 'unchanged');

      v.current_price = currentPrice;
      v.previous_price = prevPrice;
      v.price_changed = hasChanged;
      v.price_difference = diff;
      v.percentage_change = pct;
      v.direction = direction;
      v.price_freshness = computeFreshness(v.last_price_check_at, v.price_check_status);

      const vendorKey = v.vendor_name.toLowerCase();
      if (!vendorsMap[vendorKey] || (v.discounted_price || v.price) < (vendorsMap[vendorKey].discounted_price || vendorsMap[vendorKey].price)) {
        vendorsMap[vendorKey] = v;
      }

      return v;
    });

    // Get price history for the best vendor of this variant
    if (variant.vendors.length > 0) {
      variant.priceHistory = await query(`
        SELECT price, recorded_at as created_at 
        FROM price_history 
        WHERE vendor_product_id = ? 
        ORDER BY recorded_at ASC 
        LIMIT 30
      `, [variant.vendors[0].id]);
    }
  }

  // Unified Product Price History across variants
  const productPriceHistory = await query(
    `SELECT ph.id, ph.vendor_product_id, ph.variant_id, ph.vendor_id, ph.price, ph.currency, ph.recorded_at, 
            ph.source, ph.confidence, ph.change_type, v.name as vendor_name
     FROM price_history ph
     JOIN product_variants pv ON ph.variant_id = pv.id
     JOIN vendors v ON ph.vendor_id = v.id
     WHERE pv.master_product_id = ? OR pv.product_id = ?
     ORDER BY ph.recorded_at ASC, ph.id ASC
     LIMIT 50`,
    [product.id, product.id]
  );

  const relatedProducts = await query(`
    SELECT pm.id, COALESCE(pm.canonical_title, pm.title) as title, pm.id as slug, pm.base_image, pm.base_image as image_url, 
           MIN(vp.price) as discounted_Price, MAX(vp.mrp) as price
    FROM products_master pm
    JOIN product_variants pv ON pm.id = pv.product_id
    JOIN vendor_products vp ON pv.id = vp.variant_id
    WHERE pm.category = ? AND pm.id != ?
    GROUP BY pm.id
    LIMIT 4
  `, [product.category, product.id]);

  const processedRelated = relatedProducts.map(p => ({
    ...p,
    image_urls: p.base_image ? [p.base_image] : []
  }));

  return {
    ...product,
    title: product.canonical_title || product.title,
    specifications: allSpecs, // Flattened for frontend Specs.jsx
    vendors: vendorsMap, // Combined from all variants for frontend Prices.jsx
    vendorOffers: Object.values(vendorsMap).sort((a, b) => Number(a.discounted_price || a.price || 0) - Number(b.discounted_price || b.price || 0)),
    variants,
    priceHistory: productPriceHistory,
    relatedProducts: processedRelated
  };
};


export const getCategories = async () => {
  const result = await query(`SELECT DISTINCT category FROM products_master WHERE category IS NOT NULL`);
  return result.map(r => r.category);
};

export const getBrands = async () => {
  const result = await query(`SELECT DISTINCT brand FROM products_master WHERE brand IS NOT NULL`);
  return result.map(r => r.brand);
};

export const getFilterOptions = async (category) => {
  let whereClause = '';
  const params = [];

  if (category) {
    whereClause = `
      WHERE pv.id IN (
        SELECT pv2.id FROM product_variants pv2
        JOIN products_master pm ON pv2.product_id = pm.id
        WHERE LOWER(pm.category) = LOWER(?)
      )
    `;
    params.push(category);
  }

  const sql = `
    SELECT DISTINCT ps.spec_key, ps.spec_value
    FROM product_specifications ps
    JOIN product_variants pv ON ps.variant_id = pv.id
    ${whereClause}
    ORDER BY ps.spec_key, ps.spec_value
  `;

  const rows = await query(sql, params);

  // Group by spec_key
  const filters = {};
  rows.forEach(row => {
    if (!filters[row.spec_key]) {
      filters[row.spec_key] = [];
    }
    if (row.spec_value && row.spec_value !== 'N/A') {
      filters[row.spec_key].push(row.spec_value);
    }
  });

  return filters;
};

export const getSearchSuggestions = async (searchQuery) => {
  if (!searchQuery || searchQuery.trim().length < 2) return { suggestions: [] };

  const typoMap = {
    'iphne': 'iphone', 'ifone': 'iphone', 'ipone': 'iphone',
    'samsng': 'samsung', 'samung': 'samsung', 'aple': 'apple',
    'macbok': 'macbook', 'laptp': 'laptop'
  };

  const cleanQuery = searchQuery.trim().split(/\s+/).map(w => typoMap[w.toLowerCase()] || w).join(' ');

  const titles = await query(
    `SELECT DISTINCT title, brand, category FROM products_master WHERE LOWER(title) LIKE LOWER(?) OR LOWER(brand) LIKE LOWER(?) LIMIT 6`,
    [`%${cleanQuery}%`, `%${cleanQuery}%`]
  );

  return {
    query: searchQuery,
    corrected_query: cleanQuery,
    suggestions: titles.map(t => ({
      text: t.title,
      type: 'product',
      brand: t.brand,
      category: t.category
    }))
  };
};

export const getSitemapXml = async (baseUrl) => {
  if (!baseUrl) throw new Error('PUBLIC_FRONTEND_URL is required to generate sitemap');
  const products = await query(`SELECT id, updated_at FROM products_master ORDER BY id DESC`);
  const categories = await query(`SELECT DISTINCT category FROM products_master WHERE category IS NOT NULL`);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Home Page
  xml += `  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;

  // Categories
  categories.forEach(c => {
    xml += `  <url><loc>${baseUrl}/products?category=${encodeURIComponent(c.category)}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n`;
  });

  // Products
  products.forEach(p => {
    xml += `  <url><loc>${baseUrl}/product/${p.id}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>\n`;
  });

  xml += `</urlset>`;
  return xml;
};