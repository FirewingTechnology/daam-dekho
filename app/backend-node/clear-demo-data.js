import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function clearDemoData() {
  const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
      console.error('❌ Database connection error:', err);
      process.exit(1);
    }

    try {
      console.log('🗑️  Clearing demo data from database...\n');

      const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales', 'reliance_digital', 'snapdeal', 'ebay', 'myntra'];
      
      for (const vendor of vendors) {
        const tableName = `${vendor}_products`;
        await run(db, `DELETE FROM ${tableName}`);
        console.log(`✅ Cleared ${tableName}`);
      }

      console.log('\n✅ All demo data deleted!');
      console.log('📊 Tables are now empty and ready for import.\n');

      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ Error:', error);
      db.close();
      process.exit(1);
    }
  });
}

clearDemoData();
