import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'products.db');

const db = new sqlite3.Database(dbPath);

// Get a product ID from amazon
db.get('SELECT id, title FROM amazon_products LIMIT 1', (err, amazonProduct) => {
  if (err || !amazonProduct) {
    console.log('No amazon product found');
    db.close();
    return;
  }

  const productId = amazonProduct.id;
  console.log('Testing with product ID:', productId);
  console.log('Amazon title:', amazonProduct.title.substring(0, 60) + '...');

  // Check if this product exists in other vendors
  const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];
  const vendorTables = {
    amazon: 'amazon_products',
    flipkart: 'flipkart_products',
    croma: 'croma_products',
    jiomart: 'jiomart_products',
    vijaysales: 'vijaysales_products'
  };

  console.log('\nChecking product availability:');
  let completed = 0;

  vendors.forEach(vendor => {
    const table = vendorTables[vendor];
    db.get(`SELECT COUNT(*) as count FROM ${table} WHERE id = ?`, [productId], (err, row) => {
      const count = row?.count || 0;
      console.log(`  ${vendor}: ${count} product(s)`);
      completed++;
      if (completed === vendors.length) {
        db.close();
      }
    });
  });
});
