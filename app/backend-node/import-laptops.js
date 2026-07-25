import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'products.db');

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function importLaptopData() {
  const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
      console.error('❌ Database connection error:', err);
      process.exit(1);
    }

    try {
      console.log('📥 Importing laptop data...\n');

      let totalInserted = 0;

      // Import Croma laptop data
      const laptopFile = path.join(
        __dirname,
        `../Scraping_Ecommerce/database/cleaned_croma_laptop.json`
      );

      if (!fs.existsSync(laptopFile)) {
        console.log(`⚠️  Laptop file not found: ${laptopFile}`);
        db.close();
        process.exit(1);
      }

      console.log(`📂 Processing Croma Laptops...`);
      const data = JSON.parse(fs.readFileSync(laptopFile, 'utf-8'));
      console.log(`   Found ${data.length} products`);

      let insertedCount = 0;
      const tableName = 'croma_products';  // Use same table as mobile data

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

          // Set category to Laptop
          const category = 'Laptop';

          const params = [
            product.title || 'Unknown',
            product.brand || 'Unknown',
            category,
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
            product.vendor || 'croma',
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

      console.log(`   ✅ Inserted ${insertedCount}/${data.length} laptop products\n`);
      totalInserted += insertedCount;

      console.log(`\n✅ Laptop import complete!`);
      console.log(`📊 Total laptop products inserted: ${totalInserted}\n`);

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

importLaptopData();
