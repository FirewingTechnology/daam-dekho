import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../products.db');

// Demo data for products covering all 4 categories
const DEMO_PRODUCTS = [
  // Mobile Phones (Category: Mobile) - 2 products
  {
    title: 'iPhone 14 Pro',
    brand: 'Apple',
    category: 'Mobile',
    price: 99999,
    discounted_price: 79999,
    rating: 4.5,
    reviews: 1250,
    seller_name: 'Authorized Seller',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '6.1" OLED',
      resolution: '2556 x 1179 pixels',
      processor: 'A16 Bionic',
      ram: '6GB',
      storage: '128GB/256GB/512GB',
      camera: '48MP + 12MP',
      front_camera: '12MP TrueDepth',
      battery: '3200 mAh',
      os: 'iOS 16',
      color: 'Space Black/Silver/Gold',
      weight: '203g',
      dimensions: '147.5 x 71.5 x 7.85 mm',
      connectivity: '5G/Wi-Fi 6E/Bluetooth 5.3'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=iPhone+14']),
    product_link: 'https://amazon.in/iPhone-14-Pro',
    offers: JSON.stringify([
      { description: '10% off with ICICI card', code: 'ICICI10' },
      { description: 'Free delivery', code: 'FREE' }
    ])
  },
  {
    title: 'Samsung Galaxy S23',
    brand: 'Samsung',
    category: 'Mobile',
    price: 79999,
    discounted_price: 59999,
    rating: 4.3,
    reviews: 980,
    seller_name: 'Official Store',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '6.1" Dynamic AMOLED',
      resolution: '2340 x 1080 pixels',
      processor: 'Snapdragon 8 Gen 2',
      ram: '8GB/12GB',
      storage: '128GB/256GB',
      camera: '50MP + 12MP + 10MP',
      front_camera: '10MP',
      battery: '4000 mAh',
      os: 'Android 13',
      color: 'Phantom Black/Cream/Green',
      weight: '168g',
      dimensions: '146 x 70.9 x 8.9 mm',
      connectivity: '5G/Wi-Fi 6E/Bluetooth 5.3'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Galaxy+S23']),
    product_link: 'https://flipkart.com/samsung-s23',
    offers: JSON.stringify([
      { description: '8% off on EMI', code: 'EMI8' },
      { description: 'Free screen protector', code: 'PROTECT' }
    ])
  },
  // Laptops (Category: Laptop) - 2 products
  {
    title: 'Dell XPS 15',
    brand: 'Dell',
    category: 'Laptop',
    price: 149999,
    discounted_price: 119999,
    rating: 4.6,
    reviews: 890,
    seller_name: 'Dell Store',
    availability: 'In Stock',
    specifications: JSON.stringify({
      processor: 'Intel i7-13700H',
      ram: '16GB DDR5',
      storage: '512GB NVMe SSD',
      display: '15.6" OLED 3.5K',
      resolution: '3456 x 2160 pixels',
      gpu: 'RTX 4070',
      battery: '86Wh',
      weight: '2.0 kg',
      dimensions: '345 x 230 x 18mm',
      os: 'Windows 11 Pro',
      color: 'Platinum Silver/Frost',
      connectivity: 'Thunderbolt 4/Wi-Fi 6E',
      ports: '2x Thunderbolt 4, 2x USB 3.0, SD Card'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Dell+XPS+15']),
    product_link: 'https://vijaysales.com/dell-xps-15',
    offers: JSON.stringify([
      { description: '5% bank discount', code: 'BANK5' },
      { description: 'Free laptop bag', code: 'BAG' },
      { description: 'Extended warranty 3 years', code: 'WARRANT3' }
    ])
  },
  {
    title: 'MacBook Pro 14',
    brand: 'Apple',
    category: 'Laptop',
    price: 199999,
    discounted_price: 179999,
    rating: 4.8,
    reviews: 1100,
    seller_name: 'Apple Authorized',
    availability: 'In Stock',
    specifications: JSON.stringify({
      processor: 'M2 Pro',
      ram: '16GB Unified Memory',
      storage: '512GB SSD',
      display: '14.2" Liquid Retina',
      resolution: '3456 x 2234 pixels',
      gpu: 'GPU 16-core',
      battery: '100Wh',
      weight: '1.6 kg',
      dimensions: '312.6 x 221.5 x 15.5mm',
      os: 'macOS Ventura',
      color: 'Space Gray/Silver',
      connectivity: '3x Thunderbolt 4/Wi-Fi 6E',
      ports: '3x Thunderbolt 4, HDMI, SD Card'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=MacBook+Pro+14']),
    product_link: 'https://amazon.in/macbook-pro-14',
    offers: JSON.stringify([
      { description: '10% off with ICICI', code: 'ICICI10' }
    ])
  },
  // Mobile Accessories (Category: Mobile Accessories) - 2 products
  {
    title: 'USB-C Fast Charger 65W',
    brand: 'Anker',
    category: 'Mobile Accessories',
    price: 2999,
    discounted_price: 1999,
    rating: 4.3,
    reviews: 450,
    seller_name: 'Anker Store',
    availability: 'In Stock',
    specifications: JSON.stringify({
      wattage: '65W',
      ports: '2x USB-C',
      warranty: '24 months'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Charger+65W']),
    product_link: 'https://croma.com/anker-charger',
    offers: JSON.stringify([
      { description: '₹500 off', code: 'CHARGER500' }
    ])
  },
  {
    title: 'Premium Leather Phone Case',
    brand: 'Spigen',
    category: 'Mobile Accessories',
    price: 1999,
    discounted_price: 899,
    rating: 4.2,
    reviews: 320,
    seller_name: 'Spigen Store',
    availability: 'In Stock',
    specifications: JSON.stringify({
      material: 'Genuine Leather',
      compatibility: 'Universal 6.1-6.5"',
      protection: 'Military Grade'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Phone+Case']),
    product_link: 'https://jiomart.com/spigen-case',
    offers: JSON.stringify([
      { description: 'Buy 2 Get 1 Free', code: 'BUY2GET1' }
    ])
  },
  // Laptop Accessories (Category: Laptop Accessories) - 2 products
  {
    title: 'Laptop Cooling Pad',
    brand: 'Thermaltake',
    category: 'Laptop Accessories',
    price: 3999,
    discounted_price: 2799,
    rating: 4.4,
    reviews: 280,
    seller_name: 'Thermaltake Store',
    availability: 'In Stock',
    specifications: JSON.stringify({
      fans: '2x 120mm',
      noise: '22dB',
      ports: '2x USB'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Cooling+Pad']),
    product_link: 'https://vijaysales.com/thermaltake-pad',
    offers: JSON.stringify([
      { description: '₹500 coupon', code: 'COOL500' }
    ])
  },
  {
    title: 'Wireless Bluetooth Mouse',
    brand: 'Logitech',
    category: 'Laptop Accessories',
    price: 1999,
    discounted_price: 1299,
    rating: 4.5,
    reviews: 620,
    seller_name: 'Logitech India',
    availability: 'In Stock',
    specifications: JSON.stringify({
      connectivity: 'Bluetooth 5.0',
      battery: '18 months',
      dpi: 'adjustable up to 4000'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=BT+Mouse']),
    product_link: 'https://amazon.in/logitech-mouse',
    offers: JSON.stringify([
      { description: '₹300 cashback', code: 'MOUSE300' }
    ])
  }
];

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

async function setupDatabase() {
  const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
      console.error('Database connection error:', err);
      process.exit(1);
    }

    try {
      console.log('🔧 Setting up DaamDekho Database...');
      console.log(`📁 Database path: ${dbPath}`);
      
      // Create tables and insert demo data
      const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales', 'reliance_digital', 'snapdeal', 'ebay', 'myntra'];
      
      for (const vendor of vendors) {
        const tableName = `${vendor}_products`;
        // Drop existing table first to ensure fresh data
        await run(db, `DROP TABLE IF EXISTS ${tableName}`);
        console.log(`🗑️  Dropped table: ${tableName}`);
        
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            brand TEXT,
            category TEXT,
            price REAL,
            discounted_price REAL,
            rating REAL,
            reviews INTEGER,
            seller_name TEXT,
            availability TEXT,
            specifications TEXT,
            image_urls TEXT,
            product_link TEXT,
            offers TEXT,
            vendor TEXT DEFAULT '${vendor}',
            scraped_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        await run(db, createTableSQL);
        console.log(`✅ Created table: ${tableName}`);
        
        const checkRow = await get(db, `SELECT COUNT(*) as count FROM ${tableName}`);
        if (checkRow.count === 0) {
          for (let i = 0; i < 8; i++) {
            const product = DEMO_PRODUCTS[i % DEMO_PRODUCTS.length];
            const sql = `
              INSERT INTO ${tableName} (title, brand, category, price, discounted_price, rating, reviews, seller_name, availability, specifications, image_urls, product_link, offers, vendor, scraped_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `;
            const params = [
              `${product.title} (${vendor} ${i + 1})`,
              product.brand,
              product.category,
              product.price + (Math.random() * 5000),
              product.discounted_price + (Math.random() * 3000),
              product.rating,
              product.reviews + Math.floor(Math.random() * 500),
              vendor.charAt(0).toUpperCase() + vendor.slice(1),
              product.availability,
              product.specifications,
              product.image_urls,
              product.product_link,
              product.offers,
              vendor
            ];
            await run(db, sql, params);
          }
          console.log(`✅ Inserted 8 products into ${tableName}`);
        }
      }
      
      console.log('\n✅ Database setup complete!');
      console.log(`📊 Total vendors: 9`);
      console.log(`📦 Products per vendor: 8`);
      console.log(`📈 Total products: 72\n`);
      
      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        process.exit(0);
      });
    } catch (error) {
      console.error('Setup error:', error);
      db.close();
      process.exit(1);
    }
  });
}

setupDatabase();
