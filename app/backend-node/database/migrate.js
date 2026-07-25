import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initSchema } from './init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OLD_DB_PATH = join(__dirname, '../products.db');
const NEW_DB_PATH = join(__dirname, '../../../daamdekho.db');

const oldDb = new sqlite3.Database(OLD_DB_PATH);
const newDb = new sqlite3.Database(NEW_DB_PATH);

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const runQuery = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const getRows = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getRow = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

async function migrate() {
  console.log('🚀 Starting migration...');
  await initSchema();
  console.log('✅ Schema initialized.');

  const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];
  
  // 1. Populate Vendors
  for (const vendorName of vendors) {
    await runQuery(newDb, `INSERT OR IGNORE INTO vendors (name, website) VALUES (?, ?)`, [
      vendorName, 
      `https://www.${vendorName}.com`
    ]);
  }
  console.log('✅ Vendors populated.');

  // 2. Migrate Products
  for (const vendor of vendors) {
    let tableName = `${vendor}_products`;
    if (vendor === 'jiomart') tableName = 'jiomart_products';
    if (vendor === 'vijaysales') tableName = 'vijaysales_products';

    console.log(`📦 Migrating ${vendor} products...`);
    
    // Check if table exists in old database before querying
    const tableExists = await getRow(oldDb, 
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`, 
      [tableName]
    );
    
    if (!tableExists) {
      console.log(`⚠️ Table ${tableName} does not exist in old database. Skipping.`);
      continue;
    }

    const products = await getRows(oldDb, `SELECT * FROM ${tableName}`);
    
    for (const p of products) {
      try {
        // Simple matching logic: find product by title slug
        const slug = slugify(p.title);
        let masterId;
        
        const existingMaster = await getRow(newDb, `SELECT id FROM products_master WHERE slug = ?`, [slug]);
        
        if (existingMaster) {
          masterId = existingMaster.id;
        } else {
          masterId = await runQuery(newDb, 
            `INSERT INTO products_master (brand, category, model_name, slug, image) VALUES (?, ?, ?, ?, ?)`,
            [p.brand, p.category, p.title, slug, p.image_urls ? JSON.parse(p.image_urls)[0] : null]
          );
        }

        // Create a default variant
        let variantId;
        const existingVariant = await getRow(newDb, `SELECT id FROM product_variants WHERE product_id = ? AND ram = ? AND storage = ?`, [masterId, p.ram || null, p.rom || p.storage || null]);
        
        if (existingVariant) {
          variantId = existingVariant.id;
        } else {
          variantId = await runQuery(newDb,
            `INSERT INTO product_variants (product_id, ram, storage, color) VALUES (?, ?, ?, ?)`,
            [masterId, p.ram || null, p.rom || p.storage || null, p.color || null]
          );
        }

        // Link to Vendor
        const vendorRow = await getRow(newDb, `SELECT id FROM vendors WHERE name = ?`, [vendor]);
        
        // BUG FIX: Prevent duplicating listing prices when migration is run multiple times.
        // Check if the combination of vendor_id and variant_id already exists in vendor_products.
        const existingVendorProduct = await getRow(newDb,
          `SELECT id FROM vendor_products WHERE vendor_id = ? AND variant_id = ?`,
          [vendorRow.id, variantId]
        );

        if (existingVendorProduct) {
          // Update it instead of inserting a duplicate listing
          await runQuery(newDb,
            `UPDATE vendor_products SET 
              vendor_product_id = ?, title = ?, url = ?, price = ?, mrp = ?, 
              discount_percent = ?, rating = ?, reviews = ?, stock_status = ?, seller = ?, last_scraped_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              p.id.toString(), 
              p.title, 
              p.product_link, 
              p.discounted_price || p.price, 
              p.price,
              p.price && p.discounted_price ? Math.round(((p.price - p.discounted_price) / p.price) * 100) : 0,
              p.rating,
              p.reviews,
              p.availability,
              p.seller_name || vendor,
              existingVendorProduct.id
            ]
          );
        } else {
          // Insert new listing
          await runQuery(newDb,
            `INSERT INTO vendor_products (vendor_id, variant_id, vendor_product_id, title, url, price, mrp, discount_percent, rating, reviews, stock_status, seller)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              vendorRow.id, 
              variantId, 
              p.id.toString(), 
              p.title, 
              p.product_link, 
              p.discounted_price || p.price, 
              p.price,
              p.price && p.discounted_price ? Math.round(((p.price - p.discounted_price) / p.price) * 100) : 0,
              p.rating,
              p.reviews,
              p.availability,
              p.seller_name || vendor
            ]
          );
        }

        // Add Specifications (Ignore duplicates to avoid DB bloat)
        if (p.specifications) {
          const specs = typeof p.specifications === 'string' ? JSON.parse(p.specifications) : p.specifications;
          for (const [key, value] of Object.entries(specs)) {
            await runQuery(newDb, 
              `INSERT OR IGNORE INTO product_specifications (variant_id, spec_key, spec_value) VALUES (?, ?, ?)`,
              [variantId, key, value.toString()]
            );
          }
        } else {
           // Basic specs if not in JSON
           const basicSpecs = {
             'RAM': p.ram,
             'Storage': p.rom || p.storage,
             'Display': p.display,
             'Battery': p.battery,
             'Processor': p.processor,
             'Camera': p.camera
           };
           for (const [key, value] of Object.entries(basicSpecs)) {
             if (value) {
               await runQuery(newDb, 
                 `INSERT OR IGNORE INTO product_specifications (variant_id, spec_key, spec_value) VALUES (?, ?, ?)`,
                 [variantId, key, value.toString()]
               );
             }
           }
        }

      } catch (err) {
        console.error(`❌ Error migrating product ${p.id} from ${vendor}:`, err.message);
      }
    }
  }

  console.log('🏁 Migration complete!');
  oldDb.close();
  newDb.close();
}

migrate();
