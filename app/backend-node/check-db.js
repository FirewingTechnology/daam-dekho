import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'products.db');

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function checkDatabase() {
  const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
      console.error('❌ Database error:', err);
      process.exit(1);
    }

    try {
      console.log('🔍 Checking database contents...\n');

      const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];
      
      for (const vendor of vendors) {
        const tableName = `${vendor}_products`;
        
        // Get count by category
        const results = await all(db, `
          SELECT 
            COUNT(*) as total,
            (SELECT COUNT(*) FROM ${tableName} WHERE category = 'Mobile') as mobiles,
            (SELECT COUNT(*) FROM ${tableName} WHERE category = 'Laptop') as laptops,
            (SELECT COUNT(*) FROM ${tableName} WHERE category LIKE '%' AND category != 'Mobile' AND category != 'Laptop') as other
          FROM ${tableName}
        `);
        
        if (results.length > 0) {
          const row = results[0];
          console.log(`${vendor.toUpperCase()}:`);
          console.log(`  Total: ${row.total}`);
          console.log(`  Mobiles: ${row.mobiles}`);
          console.log(`  Laptops: ${row.laptops}`);
          console.log(`  Other: ${row.other}\n`);
        }
      }

      // Show sample laptop products
      console.log('Sample Laptop Products:');
      const laptops = await all(db, `
        SELECT id, title, category FROM croma_products WHERE category = 'Laptop' LIMIT 5
      `);
      
      if (laptops.length > 0) {
        laptops.forEach(laptop => {
          console.log(`  - ${laptop.title} [${laptop.category}]`);
        });
      } else {
        console.log('  No laptops found!');
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

checkDatabase();
