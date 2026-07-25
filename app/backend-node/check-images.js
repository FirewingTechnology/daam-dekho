import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'products.db');

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function checkImages() {
  const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
      console.error('❌ Database error:', err);
      process.exit(1);
    }

    try {
      console.log('🔍 Checking image URLs in database...\n');

      const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];
      
      for (const vendor of vendors) {
        const tableName = `${vendor}_products`;
        const products = await all(db, `SELECT id, title, image_urls FROM ${tableName} LIMIT 3`);
        
        console.log(`\n📊 ${vendor.toUpperCase()}:`);
        for (const product of products) {
          console.log(`\n  ID: ${product.id}`);
          console.log(`  Title: ${product.title.substring(0, 50)}...`);
          console.log(`  Image URLs: ${product.image_urls}`);
        }
      }

      db.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error:', error);
      db.close();
      process.exit(1);
    }
  });
}

checkImages();
