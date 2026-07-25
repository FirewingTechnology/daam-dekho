import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'products.db');

const vendorMap = {
  'amazon': 'amazon_products',
  'flipkart': 'flipkart_products',
  'croma': 'croma_products',
  'jiomart': 'jiomart_products',
  'vijaysales': 'vijaysales_products'
};

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function importData() {
  const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
      console.error('❌ Database connection error:', err);
      process.exit(1);
    }

    try {
      console.log('📥 Starting data import...\n');

      let totalInserted = 0;

      // Process each vendor
      for (const [vendor, tableName] of Object.entries(vendorMap)) {
        const jsonFile = path.join(
          __dirname,
          `../Scraping_Ecommerce/database/cleaned_${vendor}_final.json`
        );

        if (!fs.existsSync(jsonFile)) {
          console.log(`⚠️  File not found: ${jsonFile}`);
          continue;
        }

        console.log(`📂 Processing ${vendor}...`);
        const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
        console.log(`   Found ${data.length} products`);

        let insertedCount = 0;

        for (const product of data) {
          try {
            const sql = `
              INSERT INTO ${tableName} (
                title, brand, category, price, discounted_price, 
                rating, reviews, seller_name, availability, 
                specifications, image_urls, product_link, offers, 
                vendor, scraped_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const specs = typeof product.specifications === 'string' 
              ? product.specifications 
              : JSON.stringify(product.specifications || {});

            const images = Array.isArray(product.image_urls)
              ? JSON.stringify(product.image_urls)
              : product.image_urls || '[]';

            const offers = typeof product.offers === 'string'
              ? product.offers
              : JSON.stringify(product.offers || []);

            const params = [
              product.title || 'Unknown',
              product.brand || 'Unknown',
              product.category || 'Unknown',
              product.price || 0,
              product.discounted_price || product.price || 0,
              product.rating || 0,
              product.reviews || 0,
              product.seller_name || 'Unknown',
              product.availability || 'Unknown',
              specs,
              images,
              product.product_link || '',
              offers,
              product.vendor || vendor,
              product.scraped_at || new Date().toISOString(),
              product.created_at || new Date().toISOString(),
              product.updated_at || new Date().toISOString()
            ];

            await run(db, sql, params);
            insertedCount++;
          } catch (error) {
            console.error(`   ❌ Error inserting product: ${error.message}`);
          }
        }

        console.log(`   ✅ Inserted ${insertedCount}/${data.length} products into ${tableName}\n`);
        totalInserted += insertedCount;
      }

      console.log(`\n✅ Import complete!`);
      console.log(`📊 Total products inserted: ${totalInserted}\n`);

      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ Import error:', error);
      db.close();
      process.exit(1);
    }
  });
}

importData();
