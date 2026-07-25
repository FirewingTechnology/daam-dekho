import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../products.db');

// Realistic offers that will be added to all products
const COMMON_OFFERS = [
  { description: '10% discount with ICICI Credit Card', code: 'ICICI10' },
  { description: '8% discount with HDFC Debit Card', code: 'HDFC8' },
  { description: '12% EMI offer for 3 months', code: 'EMI3' },
  { description: 'Free shipping on orders above ₹500', code: 'SHIP' },
  { description: '₹500 cashback on first purchase', code: 'CASH500' },
  { description: 'Buy now, pay later in 3 installments', code: 'BNPL3' },
  { description: 'Extra 5% off with loyalty points', code: 'LOYALTY5' },
  { description: 'Free extended warranty (1 year)', code: 'WARRANTY1' }
];

// Category-specific offers
const CATEGORY_OFFERS = {
  'Mobile': [
    { description: 'Free screen protector with purchase', code: 'PROTECT' },
    { description: 'Trade-in exchange offer available', code: 'TRADEIN' },
    { description: 'Free phone case worth ₹1000', code: 'CASE' }
  ],
  'Laptop': [
    { description: 'Free laptop bag worth ₹2000', code: 'BAG' },
    { description: 'Free antivirus subscription (1 year)', code: 'ANTIVIRUS' },
    { description: 'Extended warranty 3 years available', code: 'WARRANT3' }
  ],
  'Mobile Accessories': [
    { description: '₹300 cashback on purchase', code: 'ACC300' },
    { description: 'Buy 2 get 1 free offer', code: 'BUY2GET1' }
  ],
  'Laptop Accessories': [
    { description: '₹200 cashback', code: 'LAP200' },
    { description: 'Free delivery + returns', code: 'FREEDEL' }
  ]
};

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
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

async function updateOffersInDatabase() {
  const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
      console.error('Database connection error:', err);
      process.exit(1);
    }

    try {
      console.log('🔄 Updating offers in DaamDekho Database...\n');

      const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales', 'reliance_digital', 'snapdeal', 'ebay', 'myntra'];
      let totalUpdated = 0;

      for (const vendor of vendors) {
        const tableName = `${vendor}_products`;

        // Get all products from this vendor
        const products = await all(db, `SELECT id, category FROM ${tableName}`);

        if (products.length === 0) {
          console.log(`⚠️  No products found in ${tableName}`);
          continue;
        }

        // Update each product with offers
        for (const product of products) {
          // Combine common offers with category-specific offers
          let offers = [...COMMON_OFFERS];
          
          if (CATEGORY_OFFERS[product.category]) {
            offers = offers.concat(CATEGORY_OFFERS[product.category]);
          }

          // Randomize which offers each product gets (3-6 offers per product)
          const offersCount = Math.floor(Math.random() * 4) + 3;
          const selectedOffers = offers
            .sort(() => Math.random() - 0.5)
            .slice(0, offersCount);

          const offersJSON = JSON.stringify(selectedOffers);

          const sql = `UPDATE ${tableName} SET offers = ? WHERE id = ?`;
          await run(db, sql, [offersJSON, product.id]);
          totalUpdated++;
        }

        console.log(`✅ Updated ${products.length} products in ${tableName}`);
      }

      console.log(`\n✅ Successfully updated ${totalUpdated} products with offers!`);
      console.log('\n📋 Sample Offers Added:');
      console.log(JSON.stringify(COMMON_OFFERS, null, 2));

      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        process.exit(0);
      });
    } catch (error) {
      console.error('Update error:', error);
      db.close();
      process.exit(1);
    }
  });
}

updateOffersInDatabase();
