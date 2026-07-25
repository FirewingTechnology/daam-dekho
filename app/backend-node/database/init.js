import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DB_PATH = join(__dirname, '../../../daamdekho.db');

export const db = new sqlite3.Database(ROOT_DB_PATH);

export const initSchema = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. products_master
      db.run(`CREATE TABLE IF NOT EXISTS products_master (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT,
        category TEXT,
        subcategory TEXT,
        model_name TEXT,
        slug TEXT UNIQUE,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // 2. product_variants
      db.run(`CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        ram TEXT,
        storage TEXT,
        color TEXT,
        sku_code TEXT,
        FOREIGN KEY (product_id) REFERENCES products_master(id)
      )`);

      // 3. product_specifications
      db.run(`CREATE TABLE IF NOT EXISTS product_specifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        variant_id INTEGER,
        spec_key TEXT,
        spec_value TEXT,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
      )`);

      // 4. vendors
      db.run(`CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        logo TEXT,
        website TEXT,
        affiliate_tag TEXT,
        status TEXT DEFAULT 'active'
      )`);

      // 5. vendor_products
      db.run(`CREATE TABLE IF NOT EXISTS vendor_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER,
        variant_id INTEGER,
        vendor_product_id TEXT,
        title TEXT,
        url TEXT UNIQUE,
        price REAL,
        mrp REAL,
        discount_percent REAL,
        rating REAL,
        reviews INTEGER,
        stock_status TEXT,
        delivery_days TEXT,
        seller TEXT,
        offers TEXT,
        last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id),
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
      )`);

      // 6. price_history
      db.run(`CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_product_id INTEGER,
        price REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_product_id) REFERENCES vendor_products(id)
      )`);

      // 7. users
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password_hash TEXT,
        pincode TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // 8. wishlists
      db.run(`CREATE TABLE IF NOT EXISTS wishlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        variant_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
      )`);

      // 9. price_alerts
      db.run(`CREATE TABLE IF NOT EXISTS price_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        variant_id INTEGER,
        target_price REAL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
      )`);

      // 10. compare_logs
      db.run(`CREATE TABLE IF NOT EXISTS compare_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        search_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // SCHEMA MIGRATION: Auto-add 'website' column to 'vendors' table if it was created in an older run
      db.all("PRAGMA table_info(vendors)", (err, columns) => {
        if (err) {
          reject(err);
          return;
        }
        
        const hasWebsite = columns.some(col => col.name === 'website');
        if (!hasWebsite) {
          console.log("🛠️  Upgrading vendors table: Adding 'website' column...");
          db.run("ALTER TABLE vendors ADD COLUMN website TEXT", (alterErr) => {
            if (alterErr) {
              reject(alterErr);
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  });
};
