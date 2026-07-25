import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'products.db');

const db = new sqlite3.Database(dbPath);

// Get a few products from jiomart (which has the most - 150)
db.all('SELECT id, title FROM jiomart_products LIMIT 3', (err, products) => {
  if (err || !products || products.length === 0) {
    console.log('No jiomart products found');
    db.close();
    return;
  }

  console.log('Sample products from JioMart:');
  products.forEach(p => {
    console.log(`\nID: ${p.id}`);
    console.log(`Title: ${p.title.substring(0, 70)}...`);
  });

  // Test fetching the first one via API
  console.log(`\n\nTesting API with JioMart product ID: ${products[0].id}`);
  
  db.close();
});
