import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../../daamdekho.db');

let db = null;

export function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        reject(err);
      } else {
        db.run('PRAGMA journal_mode = WAL', (err) => {
          if (err) reject(err);
          else resolve(db);
        });
      }
    });
  });
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function getAllCategories() {
  const db = getDatabase();
  return new Promise((resolve, reject) => {
    const query = `
      SELECT DISTINCT category FROM amazon_products 
      WHERE category IS NOT NULL
      UNION
      SELECT DISTINCT category FROM flipkart_products WHERE category IS NOT NULL
      UNION
      SELECT DISTINCT category FROM croma_products WHERE category IS NOT NULL
      UNION
      SELECT DISTINCT category FROM jiomart_products WHERE category IS NOT NULL
      UNION
      SELECT DISTINCT category FROM vijaysales_products WHERE category IS NOT NULL
      ORDER BY category
    `;
    db.all(query, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export async function getAllBrands(category = null) {
  const db = getDatabase();
  return new Promise((resolve, reject) => {
    let query, params = [];
    
    if (category) {
      query = `
        SELECT DISTINCT brand FROM amazon_products 
        WHERE brand IS NOT NULL AND LOWER(category) = LOWER(?)
        UNION
        SELECT DISTINCT brand FROM flipkart_products WHERE brand IS NOT NULL AND LOWER(category) = LOWER(?)
        UNION
        SELECT DISTINCT brand FROM croma_products WHERE brand IS NOT NULL AND LOWER(category) = LOWER(?)
        UNION
        SELECT DISTINCT brand FROM jiomart_products WHERE brand IS NOT NULL AND LOWER(category) = LOWER(?)
        UNION
        SELECT DISTINCT brand FROM vijaysales_products WHERE brand IS NOT NULL AND LOWER(category) = LOWER(?)
        ORDER BY brand
      `;
      params = [category, category, category, category, category];
    } else {
      query = `
        SELECT DISTINCT brand FROM amazon_products WHERE brand IS NOT NULL
        UNION
        SELECT DISTINCT brand FROM flipkart_products WHERE brand IS NOT NULL
        UNION
        SELECT DISTINCT brand FROM croma_products WHERE brand IS NOT NULL
        UNION
        SELECT DISTINCT brand FROM jiomart_products WHERE brand IS NOT NULL
        UNION
        SELECT DISTINCT brand FROM vijaysales_products WHERE brand IS NOT NULL
        ORDER BY brand
      `;
    }
    
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export async function searchProducts(options = {}) {
  const {
    searchQuery = '',
    category = null,
    brands = null,
    minPrice = null,
    maxPrice = null,
    page = 1,
    limit = 24,
    vendors = null
  } = options;

  const db = getDatabase();
  const offset = (page - 1) * limit;
  const vendorList = vendors && vendors.length > 0 ? vendors : ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];

  return new Promise((resolve, reject) => {
    let allProducts = [];
    let completed = 0;
    let totalCount = 0;

    vendorList.forEach(vendor => {
      // Handle special cases for table names
      let tableName = `${vendor}_products`;
      if (vendor === 'jiomart') tableName = 'jiomart_products';
      if (vendor === 'vijaysales') tableName = 'vijaysales_products';
      let whereClause = '1=1';
      const params = [];

      if (searchQuery) {
        whereClause += ' AND (LOWER(title) LIKE LOWER(?) OR LOWER(brand) LIKE LOWER(?) OR LOWER(category) LIKE LOWER(?))';
        const searchTerm = `%${searchQuery}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (category) {
        whereClause += ' AND LOWER(category) = LOWER(?)';
        params.push(category);
      }

      // Add brand filtering
      if (brands && brands.length > 0) {
        const brandPlaceholders = brands.map(() => 'LOWER(brand) = LOWER(?)').join(' OR ');
        whereClause += ` AND (${brandPlaceholders})`;
        brands.forEach(brand => params.push(brand));
      }

      if (minPrice !== null) {
        whereClause += ' AND (discounted_price >= ? OR price >= ?)';
        params.push(minPrice, minPrice);
      }

      if (maxPrice !== null) {
        whereClause += ' AND (discounted_price <= ? OR price <= ?)';
        params.push(maxPrice, maxPrice);
      }

      // Get count for this vendor
      const countQuery = `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`;
      db.get(countQuery, params, (err, countRow) => {
        if (!err && countRow) {
          totalCount += countRow.count;
        }

        // Get actual products - explicitly select all columns including images
        const query = `
          SELECT id, title, brand, category, price, discounted_price, rating, reviews, 
                 seller_name, availability, specifications, image_urls, product_link, offers, 
                 vendor, scraped_at, created_at, updated_at, '${vendor}' as source_vendor
          FROM ${tableName} 
          WHERE ${whereClause}
          ORDER BY rating DESC, reviews DESC
        `;
        
        db.all(query, params, (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Process rows and ensure all fields are correct
          const rowsWithVendor = (rows || []).map(row => ({
            ...row,
            vendor: vendor,
            source: vendor,
            seller: vendor,
            image_urls: row.image_urls ? (typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : row.image_urls) : [],
            specifications: row.specifications ? (typeof row.specifications === 'string' ? JSON.parse(row.specifications) : row.specifications) : {}
          }));
          
          allProducts = allProducts.concat(rowsWithVendor);
          completed++;

          if (completed === vendorList.length) {
            // Sort by rating and reviews
            allProducts.sort((a, b) => {
              if (b.rating !== a.rating) return b.rating - a.rating;
              return b.reviews - a.reviews;
            });

            // Apply pagination after sorting and combining all results
            const paginatedProducts = allProducts.slice(offset, offset + limit);
            resolve({
              page,
              limit,
              total: totalCount,
              products: paginatedProducts
            });
          }
        });
      });
    });
  });
}

export async function getHotDeals(limit = 10, category = null) {
  const db = getDatabase();
  const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];
  
  return new Promise((resolve, reject) => {
    let allProducts = [];
    let completed = 0;

    vendors.forEach(vendor => {
      let tableName = `${vendor}_products`;
      if (vendor === 'jiomart') tableName = 'jiomart_products';
      if (vendor === 'vijaysales') tableName = 'vijaysales_products';
      
      let query = `SELECT * FROM ${tableName} WHERE (price - discounted_price) > 0`;
      const params = [];
      
      if (category) {
        query += ` AND LOWER(category) = LOWER(?)`;
        params.push(category);
      }

      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Add vendor field to each product
        const rowsWithVendor = (rows || []).map(row => ({
          ...row,
          vendor: vendor,
          source: vendor,
          seller: vendor,
          image_urls: row.image_urls ? (typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : row.image_urls) : [],
          specifications: row.specifications ? (typeof row.specifications === 'string' ? JSON.parse(row.specifications) : row.specifications) : {}
        }));
        
        allProducts = allProducts.concat(rowsWithVendor);
        completed++;

        if (completed === vendors.length) {
          allProducts.sort((a, b) => {
            const discountA = a.price - a.discounted_price;
            const discountB = b.price - b.discounted_price;
            return discountB - discountA;
          });

          resolve(allProducts.slice(0, limit));
        }
      });
    });
  });
}

export async function getBestSellers(limit = 10, category = null) {
  const db = getDatabase();
  const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];
  
  return new Promise((resolve, reject) => {
    let allProducts = [];
    let completed = 0;

    vendors.forEach(vendor => {
      let tableName = `${vendor}_products`;
      if (vendor === 'jiomart') tableName = 'jiomart_products';
      if (vendor === 'vijaysales') tableName = 'vijaysales_products';
      
      let query = `SELECT * FROM ${tableName}`;
      const params = [];
      
      if (category) {
        query += ` WHERE LOWER(category) = LOWER(?)`;
        params.push(category);
      }

      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Add vendor field to each product
        const rowsWithVendor = (rows || []).map(row => ({
          ...row,
          vendor: vendor,
          source: vendor,
          seller: vendor,
          image_urls: row.image_urls ? (typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : row.image_urls) : [],
          specifications: row.specifications ? (typeof row.specifications === 'string' ? JSON.parse(row.specifications) : row.specifications) : {}
        }));
        allProducts = allProducts.concat(rowsWithVendor);
        completed++;

        if (completed === vendors.length) {
          allProducts.sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.reviews - a.reviews;
          });

          resolve(allProducts.slice(0, limit));
        }
      });
    });
  });
}

export async function getLatestPopular(limit = 10, category = null) {
  return getBestSellers(limit, category);
}

export async function getPriceRange(category = null) {
  const db = getDatabase();
  const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];
  
  return new Promise((resolve, reject) => {
    let minPrice = Infinity;
    let maxPrice = 0;
    let completed = 0;

    vendors.forEach(vendor => {
      let tableName = `${vendor}_products`;
      if (vendor === 'jiomart') tableName = 'jiomart_products';
      if (vendor === 'vijaysales') tableName = 'vijaysales_products';
      
      let query = `
        SELECT MIN(COALESCE(discounted_price, price)) as min, 
               MAX(COALESCE(discounted_price, price)) as max 
        FROM ${tableName}
      `;
      const params = [];
      
      if (category) {
        query += ` WHERE LOWER(category) = LOWER(?)`;
        params.push(category);
      }

      db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (row && row.min) minPrice = Math.min(minPrice, row.min);
        if (row && row.max) maxPrice = Math.max(maxPrice, row.max);
        completed++;

        if (completed === vendors.length) {
          resolve({
            min: minPrice === Infinity ? 0 : Math.floor(minPrice),
            max: maxPrice
          });
        }
      });
    });
  });
}

export async function getProductById(productId) {
  const db = getDatabase();
  const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];
  
  console.log(`\n🔍 [MATCHING] Starting search for Product ID: ${productId}`);

  return new Promise(async (resolve, reject) => {
    let baseProduct = null;
    const vendorResults = [];
    
    try {
      // 1. Locate the source product to extract search keywords
      for (const vendor of vendors) {
        let tableName = `${vendor}_products`;
        const row = await new Promise(res => {
          db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [productId], (err, row) => res(row));
        });
        
        if (row) {
          console.log(`✅ [SOURCE] Found in ${vendor}: "${row.title}"`);
          baseProduct = {
            ...row,
            vendor: vendor,
            image_urls: row.image_urls ? (typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : row.image_urls) : [],
            specifications: row.specifications ? (typeof row.specifications === 'string' ? JSON.parse(row.specifications) : row.specifications) : {},
            offers: row.offers ? (typeof row.offers === 'string' ? JSON.parse(row.offers) : row.offers) : []
          };
          break;
        }
      }

      if (!baseProduct) {
        console.warn(`❌ [NOT FOUND] ID ${productId} does not exist.`);
        return resolve(null);
      }

      // 2. Extract keywords for simplified matching (First 2-3 words)
      const keywordsList = baseProduct.title
        .replace(/[^\w\s]/gi, '')
        .split(' ')
        .filter(w => w.length > 2)
        .slice(0, 3);
      
      const searchPattern = `%${keywordsList.join('%')}%`;
      console.log(`🔎 [KEYWORDS] Using pattern: "${searchPattern}"`);

      // 3. Query all tables with the simplified pattern
      const searchPromises = vendors.map(vendor => {
        let tableName = `${vendor}_products`;
        
        return new Promise(res => {
          // Check table data count
          db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, countRow) => {
            const tableCount = countRow ? countRow.count : 0;
            if (tableCount === 0) {
              console.log(`  [${vendor.toUpperCase()}] No data available (0 rows)`);
            } else {
              console.log(`  [${vendor.toUpperCase()}] Table has ${tableCount} records`);
            }

            // Keyword Search Query
            db.get(`SELECT * FROM ${tableName} WHERE LOWER(title) LIKE LOWER(?) ORDER BY rating DESC LIMIT 1`, [searchPattern], (err, matchRow) => {
              if (matchRow) {
                vendorResults.push({
                  platform: vendor,
                  name: vendor.charAt(0).toUpperCase() + vendor.slice(1),
                  title: matchRow.title,
                  price: matchRow.discounted_price || matchRow.price,
                  original_price: matchRow.price,
                  rating: matchRow.rating || 0,
                  reviews: matchRow.reviews || 0,
                  product_link: matchRow.product_link,
                  image: matchRow.image_urls ? (typeof matchRow.image_urls === 'string' ? JSON.parse(matchRow.image_urls)[0] : matchRow.image_urls[0]) : null,
                  availability: matchRow.availability || 'In Stock'
                });
                console.log(`  [${vendor.toUpperCase()}] MATCH: "₹${matchRow.discounted_price || matchRow.price}"`);
                res();
              } else if (tableCount > 0) {
                // FALLBACK: If no match found but table has data, return at least one related product (same category or random)
                db.get(`SELECT * FROM ${tableName} WHERE LOWER(category) = LOWER(?) LIMIT 1`, [baseProduct.category], (err, fallbackRow) => {
                  const finalRow = fallbackRow || null;
                  if (finalRow) {
                    vendorResults.push({
                      platform: vendor,
                      name: vendor.charAt(0).toUpperCase() + vendor.slice(1),
                      title: finalRow.title,
                      price: finalRow.discounted_price || finalRow.price,
                      original_price: finalRow.price,
                      rating: finalRow.rating || 0,
                      reviews: finalRow.reviews || 0,
                      product_link: finalRow.product_link,
                      image: finalRow.image_urls ? (typeof finalRow.image_urls === 'string' ? JSON.parse(finalRow.image_urls)[0] : finalRow.image_urls[0]) : null,
                      availability: finalRow.availability || 'In Stock',
                      is_fallback: true
                    });
                    console.log(`  [${vendor.toUpperCase()}] FALLBACK: Found related item in same category`);
                  }
                  res();
                });
              } else {
                res();
              }
            });
          });
        });
      });

      await Promise.all(searchPromises);
      
      // 4. Final Processing: Sort by price
      const sortedVendors = vendorResults.sort((a, b) => a.price - b.price);
      
      console.log(`📊 [SUMMARY] Returned ${sortedVendors.length} vendors for comparison`);
      
      baseProduct.vendor_list = sortedVendors; // Attach as vendor_list for convenience
      resolve(baseProduct);

    } catch (err) {
      console.error('🔥 [ERROR] getProductById failed:', err);
      reject(err);
    }
  });
}

export async function getVendorStatistics() {
  const db = getDatabase();
  const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];
  const stats = {};

  return new Promise((resolve, reject) => {
    let completed = 0;

    vendors.forEach(vendor => {
      let tableName = `${vendor}_products`;
      if (vendor === 'jiomart') tableName = 'jiomart_products';
      if (vendor === 'vijaysales') tableName = 'vijaysales_products';
      
      const query = `
        SELECT COUNT(*) as count, 
               AVG(rating) as avg_rating,
               MIN(COALESCE(discounted_price, price)) as min_price,
               MAX(COALESCE(discounted_price, price)) as max_price
        FROM ${tableName}
      `;

      db.get(query, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        stats[vendor] = {
          total_products: row.count,
          avg_rating: row.avg_rating ? parseFloat(row.avg_rating.toFixed(2)) : 0,
          min_price: row.min_price,
          max_price: row.max_price
        };
        completed++;

        if (completed === vendors.length) {
          resolve(stats);
        }
      });
    });
  });
}

export function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) console.error('Error closing database:', err);
      db = null;
    });
  }
}
