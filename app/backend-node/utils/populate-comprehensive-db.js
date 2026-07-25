import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../products.db');

// Comprehensive product data with all filter variations
const COMPREHENSIVE_PRODUCTS = [
  // ============ MOBILE PHONES ============
  
  // Apple Phones
  {
    title: 'iPhone 15 Pro Max',
    brand: 'Apple',
    category: 'Mobile',
    price: 149999,
    discounted_price: 129999,
    rating: 4.8,
    reviews: 2150,
    seller: 'amazon',
    vendor: 'amazon',
    seller_name: 'Amazon',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '6.7" Super Retina XDR OLED',
      resolution: '2796 x 1290 pixels',
      processor: 'A17 Pro',
      ram: '8GB',
      storage: '256GB',
      camera: '48MP + 12MP + 12MP',
      front_camera: '12MP TrueDepth',
      battery: '4685 mAh',
      os: 'iOS 17',
      color: 'Black Titanium',
      weight: '240g',
      dimensions: '159.9 x 76.7 x 8.25 mm',
      connectivity: '5G/Wi-Fi 7/Bluetooth 5.3'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=iPhone+15+Pro']),
    product_link: 'https://amazon.in/iPhone-15-Pro-Max'
  },
  {
    title: 'iPhone 15',
    brand: 'Apple',
    category: 'Mobile',
    price: 79999,
    discounted_price: 69999,
    rating: 4.6,
    reviews: 1890,
    seller: 'amazon',
    vendor: 'amazon',
    seller_name: 'Amazon',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '6.1" Super Retina XDR OLED',
      resolution: '2556 x 1179 pixels',
      processor: 'A16 Bionic',
      ram: '6GB',
      storage: '128GB',
      camera: '48MP + 12MP',
      front_camera: '12MP TrueDepth',
      battery: '3349 mAh',
      os: 'iOS 17',
      color: 'Black',
      weight: '187g',
      dimensions: '147.8 x 71.6 x 7.80 mm',
      connectivity: '5G/Wi-Fi 6E/Bluetooth 5.3'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=iPhone+15']),
    product_link: 'https://amazon.in/iPhone-15'
  },

  // Samsung Phones
  {
    title: 'Samsung Galaxy S24 Ultra',
    brand: 'Samsung',
    category: 'Mobile',
    price: 129999,
    discounted_price: 109999,
    rating: 4.7,
    reviews: 2050,
    seller: 'flipkart',
    vendor: 'flipkart',
    seller_name: 'Flipkart',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '6.8" Dynamic AMOLED 2X',
      resolution: '3120 x 1440 pixels',
      processor: 'Snapdragon 8 Gen 3',
      ram: '12GB',
      storage: '512GB',
      camera: '200MP + 50MP + 10MP + 10MP',
      front_camera: '12MP',
      battery: '5000 mAh',
      os: 'Android 14',
      color: 'Titanium Black',
      weight: '218g',
      dimensions: '162.8 x 79.6 x 8.6 mm',
      connectivity: '5G/Wi-Fi 7/Bluetooth 5.4'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Galaxy+S24']),
    product_link: 'https://flipkart.com/samsung-galaxy-s24'
  },
  {
    title: 'Samsung Galaxy S24',
    brand: 'Samsung',
    category: 'Mobile',
    price: 79999,
    discounted_price: 69999,
    rating: 4.5,
    reviews: 1750,
    seller: 'flipkart',
    vendor: 'flipkart',
    seller_name: 'Flipkart',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '6.2" Dynamic AMOLED 2X',
      resolution: '2340 x 1080 pixels',
      processor: 'Snapdragon 8 Gen 3',
      ram: '8GB',
      storage: '256GB',
      camera: '50MP + 12MP + 12MP',
      front_camera: '12MP',
      battery: '4000 mAh',
      os: 'Android 14',
      color: 'Marble Gray',
      weight: '167g',
      dimensions: '147.6 x 70.6 x 8.6 mm',
      connectivity: '5G/Wi-Fi 7/Bluetooth 5.4'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Galaxy+S24']),
    product_link: 'https://flipkart.com/samsung-galaxy-s24'
  },

  // OnePlus Phones
  {
    title: 'OnePlus 12',
    brand: 'OnePlus',
    category: 'Mobile',
    price: 64999,
    discounted_price: 54999,
    rating: 4.4,
    reviews: 1240,
    seller: 'amazon',
    vendor: 'amazon',
    seller_name: 'Amazon',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '6.7" AMOLED',
      resolution: '2412 x 1084 pixels',
      processor: 'Snapdragon 8 Gen 3',
      ram: '8GB',
      storage: '256GB',
      camera: '50MP + 48MP + 48MP',
      front_camera: '32MP',
      battery: '5400 mAh',
      os: 'Android 14',
      color: 'Silky Black',
      weight: '220g',
      dimensions: '163.1 x 74.5 x 9.15 mm',
      connectivity: '5G/Wi-Fi 6E/Bluetooth 5.4'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=OnePlus+12']),
    product_link: 'https://amazon.in/OnePlus-12'
  },

  // Xiaomi Phones
  {
    title: 'Xiaomi 14',
    brand: 'Xiaomi',
    category: 'Mobile',
    price: 59999,
    discounted_price: 49999,
    rating: 4.3,
    reviews: 890,
    seller: 'flipkart',
    vendor: 'flipkart',
    seller_name: 'Flipkart',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '6.36" AMOLED',
      resolution: '2670 x 1200 pixels',
      processor: 'Snapdragon 8 Gen 3',
      ram: '12GB',
      storage: '512GB',
      camera: '50MP + 50MP + 50MP',
      front_camera: '32MP',
      battery: '4610 mAh',
      os: 'Android 14',
      color: 'Black',
      weight: '187g',
      dimensions: '152.8 x 71.5 x 8.2 mm',
      connectivity: '5G/Wi-Fi 6E/Bluetooth 5.4'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Xiaomi+14']),
    product_link: 'https://flipkart.com/xiaomi-14'
  },

  // ============ LAPTOPS ============

  // Dell Laptops
  {
    title: 'Dell XPS 15',
    brand: 'Dell',
    category: 'Laptop',
    price: 169999,
    discounted_price: 149999,
    rating: 4.7,
    reviews: 560,
    seller: 'amazon',
    vendor: 'amazon',
    seller_name: 'Amazon',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '15.6" OLED',
      resolution: '3456 x 2160 pixels',
      processor: 'Intel Core i9-13900HX',
      ram: '16GB DDR5',
      storage: '512GB SSD',
      gpu: 'NVIDIA RTX 4090',
      battery: '97Wh',
      os: 'Windows 11',
      weight: '2.0 kg',
      dimensions: '358 x 235 x 17.3 mm',
      connectivity: 'Wi-Fi 7/Bluetooth 5.3'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Dell+XPS+15']),
    product_link: 'https://amazon.in/Dell-XPS-15'
  },
  {
    title: 'Dell Inspiron 15',
    brand: 'Dell',
    category: 'Laptop',
    price: 59999,
    discounted_price: 49999,
    rating: 4.2,
    reviews: 420,
    seller: 'flipkart',
    vendor: 'flipkart',
    seller_name: 'Flipkart',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '15.6" FHD IPS',
      resolution: '1920 x 1080 pixels',
      processor: 'Intel Core i5-12450H',
      ram: '8GB DDR4',
      storage: '256GB SSD',
      gpu: 'Intel Iris Xe',
      battery: '54Wh',
      os: 'Windows 11',
      weight: '1.8 kg',
      dimensions: '357 x 235 x 17.9 mm',
      connectivity: 'Wi-Fi 6/Bluetooth 5.1'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Dell+Inspiron']),
    product_link: 'https://flipkart.com/dell-inspiron-15'
  },

  // HP Laptops
  {
    title: 'HP Pavilion 15',
    brand: 'HP',
    category: 'Laptop',
    price: 64999,
    discounted_price: 54999,
    rating: 4.3,
    reviews: 380,
    seller: 'amazon',
    vendor: 'amazon',
    seller_name: 'Amazon',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '15.6" FHD IPS',
      resolution: '1920 x 1080 pixels',
      processor: 'Intel Core i7-12700H',
      ram: '16GB DDR4',
      storage: '512GB SSD',
      gpu: 'Intel Iris Xe',
      battery: '52.5Wh',
      os: 'Windows 11',
      weight: '1.74 kg',
      dimensions: '358 x 235 x 18.9 mm',
      connectivity: 'Wi-Fi 6/Bluetooth 5.2'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=HP+Pavilion']),
    product_link: 'https://amazon.in/HP-Pavilion-15'
  },

  // Apple MacBook
  {
    title: 'MacBook Pro 14"',
    brand: 'Apple',
    category: 'Laptop',
    price: 199999,
    discounted_price: 179999,
    rating: 4.9,
    reviews: 720,
    seller: 'flipkart',
    vendor: 'flipkart',
    seller_name: 'Flipkart',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '14.2" Liquid Retina XDR',
      resolution: '3072 x 1920 pixels',
      processor: 'Apple M3 Max',
      ram: '18GB Unified',
      storage: '512GB SSD',
      gpu: '30-core GPU',
      battery: '69Wh',
      os: 'macOS Sonoma',
      weight: '1.6 kg',
      dimensions: '312 x 221 x 15.5 mm',
      connectivity: 'Wi-Fi 6E/Bluetooth 5.3'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=MacBook+Pro']),
    product_link: 'https://flipkart.com/macbook-pro-14'
  },

  // Lenovo Laptop
  {
    title: 'Lenovo ThinkBook 14',
    brand: 'Lenovo',
    category: 'Laptop',
    price: 54999,
    discounted_price: 44999,
    rating: 4.1,
    reviews: 310,
    seller: 'amazon',
    vendor: 'amazon',
    seller_name: 'Amazon',
    availability: 'In Stock',
    specifications: JSON.stringify({
      display: '14" FHD IPS',
      resolution: '1920 x 1080 pixels',
      processor: 'Intel Core i5-12500H',
      ram: '8GB DDR4',
      storage: '256GB SSD',
      gpu: 'Intel Iris Xe',
      battery: '52.5Wh',
      os: 'Windows 11',
      weight: '1.4 kg',
      dimensions: '323 x 217 x 18 mm',
      connectivity: 'Wi-Fi 6/Bluetooth 5.1'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Lenovo+ThinkBook']),
    product_link: 'https://amazon.in/Lenovo-ThinkBook-14'
  },

  // ============ MOBILE ACCESSORIES ============

  {
    title: 'iPhone Screen Protector',
    brand: 'Spigen',
    category: 'Mobile Accessories',
    price: 999,
    discounted_price: 599,
    rating: 4.4,
    reviews: 2300,
    seller: 'amazon',
    vendor: 'amazon',
    seller_name: 'Amazon',
    availability: 'In Stock',
    specifications: JSON.stringify({
      type: 'Tempered Glass',
      compatibility: 'iPhone 15 Pro',
      hardness: '9H',
      thickness: '0.33mm',
      features: 'Anti-fingerprint, Anti-shatter',
      quantity: 3
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Screen+Protector']),
    product_link: 'https://amazon.in/Spigen-iPhone-Screen-Protector'
  },

  {
    title: 'Samsung Phone Case',
    brand: 'Spigen',
    category: 'Mobile Accessories',
    price: 799,
    discounted_price: 449,
    rating: 4.5,
    reviews: 1890,
    seller: 'flipkart',
    vendor: 'flipkart',
    seller_name: 'Flipkart',
    availability: 'In Stock',
    specifications: JSON.stringify({
      type: 'TPU Rugged',
      compatibility: 'Samsung Galaxy S24',
      material: 'TPU + Polycarbonate',
      color: 'Black',
      protection: 'Military Grade Drop Protection'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Phone+Case']),
    product_link: 'https://flipkart.com/spigen-phone-case'
  },

  {
    title: 'USB-C Fast Charger 65W',
    brand: 'Anker',
    category: 'Mobile Accessories',
    price: 2999,
    discounted_price: 1899,
    rating: 4.6,
    reviews: 3120,
    seller: 'amazon',
    vendor: 'amazon',
    seller_name: 'Amazon',
    availability: 'In Stock',
    specifications: JSON.stringify({
      type: 'USB-C PD',
      wattage: '65W',
      ports: '2 USB-C',
      compatibility: 'iPhone, Samsung, OnePlus, Xiaomi',
      safety: 'FCC, CE Certified'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Charger']),
    product_link: 'https://amazon.in/Anker-65W-Charger'
  },

  {
    title: 'Wireless Earbuds Pro',
    brand: 'Apple',
    category: 'Mobile Accessories',
    price: 14999,
    discounted_price: 12499,
    rating: 4.7,
    reviews: 2540,
    seller: 'flipkart',
    vendor: 'flipkart',
    seller_name: 'Flipkart',
    availability: 'In Stock',
    specifications: JSON.stringify({
      type: 'TWS Earbuds',
      driver: '8.6mm',
      batterycase: '30 hours',
      connectivity: 'Bluetooth 5.3',
      features: 'ANC, Transparency mode, Adaptive Audio'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Earbuds']),
    product_link: 'https://flipkart.com/apple-airpods-pro'
  },

  {
    title: 'Phone Stand',
    brand: 'Logitech',
    category: 'Mobile Accessories',
    price: 1299,
    discounted_price: 799,
    rating: 4.3,
    reviews: 890,
    seller: 'amazon',
    vendor: 'amazon',
    seller_name: 'Amazon',
    availability: 'In Stock',
    specifications: JSON.stringify({
      type: 'Adjustable Stand',
      compatibility: 'Universal (4-7 inches)',
      material: 'Aluminum + Rubber',
      angle: '0-60 degrees adjustable',
      color: 'Silver'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Phone+Stand']),
    product_link: 'https://amazon.in/Logitech-Phone-Stand'
  },

  // ============ LAPTOP ACCESSORIES ============

  {
    title: 'Laptop Backpack',
    brand: 'Thermaltake',
    category: 'Laptop Accessories',
    price: 3999,
    discounted_price: 2499,
    rating: 4.4,
    reviews: 1240,
    seller: 'amazon',
    vendor: 'amazon',
    seller_name: 'Amazon',
    availability: 'In Stock',
    specifications: JSON.stringify({
      type: 'Tech Backpack',
      capacity: '40L',
      compatibility: 'Up to 17" Laptops',
      material: 'Nylon + TPU',
      features: 'USB Charging Port, Waterproof, Ventilated Laptop Compartment'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Backpack']),
    product_link: 'https://amazon.in/Thermaltake-Laptop-Backpack'
  },

  {
    title: 'Wireless Mouse',
    brand: 'Logitech',
    category: 'Laptop Accessories',
    price: 2499,
    discounted_price: 1499,
    rating: 4.5,
    reviews: 2100,
    seller: 'flipkart',
    vendor: 'flipkart',
    seller_name: 'Flipkart',
    availability: 'In Stock',
    specifications: JSON.stringify({
      type: 'Wireless 2.4GHz',
      dpi: '4000 DPI',
      battery: 'AA x 2',
      buttons: '6 Programmable',
      range: '10m'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Mouse']),
    product_link: 'https://flipkart.com/logitech-wireless-mouse'
  },

  {
    title: 'Mechanical Keyboard RGB',
    brand: 'Thermaltake',
    category: 'Laptop Accessories',
    price: 5999,
    discounted_price: 3999,
    rating: 4.6,
    reviews: 1890,
    seller: 'amazon',
    vendor: 'amazon',
    seller_name: 'Amazon',
    availability: 'In Stock',
    specifications: JSON.stringify({
      type: 'Mechanical RGB',
      switches: 'Cherry MX Blue',
      layout: 'Full Size',
      backlighting: 'RGB',
      connectivity: 'USB',
      features: 'Programmable Keys, Macro Support'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Keyboard']),
    product_link: 'https://amazon.in/Thermaltake-Mechanical-Keyboard'
  },

  {
    title: 'Laptop Cooling Pad',
    brand: 'Thermaltake',
    category: 'Laptop Accessories',
    price: 1999,
    discounted_price: 1299,
    rating: 4.2,
    reviews: 890,
    seller: 'flipkart',
    vendor: 'flipkart',
    seller_name: 'Flipkart',
    availability: 'In Stock',
    specifications: JSON.stringify({
      type: 'Active Cooling',
      fans: '2 x 80mm',
      compatibility: 'Up to 17" Laptops',
      material: 'Aluminum',
      noise: '18-22dB',
      color: 'Black'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Cooling+Pad']),
    product_link: 'https://flipkart.com/thermaltake-cooling-pad'
  },

  {
    title: 'USB-C Docking Station',
    brand: 'Anker',
    category: 'Laptop Accessories',
    price: 4999,
    discounted_price: 3299,
    rating: 4.5,
    reviews: 1560,
    seller: 'amazon',
    vendor: 'amazon',
    seller_name: 'Amazon',
    availability: 'In Stock',
    specifications: JSON.stringify({
      type: '13-in-1 Docking Station',
      ports: '2x USB-C, 3x USB-A, HDMI, DP, SD Card, Audio',
      maxpower: '100W USB-C PD',
      resolution: '8K',
      material: 'Aluminum'
    }),
    image_urls: JSON.stringify(['https://via.placeholder.com/300?text=Docking+Station']),
    product_link: 'https://amazon.in/Anker-Docking-Station'
  }
];

function insertProducts(db) {
  return new Promise((resolve, reject) => {
    const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];
    
    // Insert products into each vendor table
    let inserted = 0;
    const total = COMPREHENSIVE_PRODUCTS.length * vendors.length;
    
    vendors.forEach((vendor) => {
      const tableName = `${vendor}_products`;
      
      COMPREHENSIVE_PRODUCTS.forEach((product, index) => {
        // Generate unique ID for each product per vendor
        const productId = `${vendor}-${product.brand.toLowerCase()}-${index}-${product.category.toLowerCase()}`;
        
        const query = `
          INSERT INTO ${tableName} (
            title, brand, category, price, discounted_price, rating, reviews,
            image_urls, product_link, seller_name, availability, specifications, vendor
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
          product.title,
          product.brand,
          product.category,
          product.price,
          product.discounted_price,
          product.rating,
          product.reviews,
          product.image_urls,
          product.product_link,
          product.seller_name,
          product.availability,
          product.specifications,
          vendor
        ];
        
        db.run(query, params, (err) => {
          if (err) {
            console.error(`❌ Error inserting ${product.title} in ${vendor}:`, err.message);
          } else {
            inserted++;
            console.log(`✅ Inserted: ${product.title} (${vendor}) - ${inserted}/${total}`);
          }
          
          if (inserted === total) {
            resolve();
          }
        });
      });
    });
  });
}

async function populateDatabase() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Database connection error:', err);
      process.exit(1);
    } else {
      console.log('🔗 Connected to database');
      
      // First, clear existing demo products (keep schema)
      const tables = ['amazon_products', 'flipkart_products', 'croma_products', 'jiomart_products', 'vijaysales_products'];
      let cleared = 0;
      
      tables.forEach((table) => {
        db.run(`DELETE FROM ${table}`, (err) => {
          if (err) console.error(`Error clearing ${table}:`, err);
          else console.log(`✅ Cleared ${table}`);
          
          cleared++;
          if (cleared === tables.length) {
            // Now insert comprehensive products
            insertProducts(db).then(() => {
              console.log('\n✅ Database population completed!');
              console.log(`📊 Total products inserted: ${COMPREHENSIVE_PRODUCTS.length} products × 5 vendors = ${COMPREHENSIVE_PRODUCTS.length * 5} products`);
              console.log('\n📂 Categories covered:');
              console.log('   - Mobile (5 products)');
              console.log('   - Laptop (5 products)');
              console.log('   - Mobile Accessories (5 products)');
              console.log('   - Laptop Accessories (5 products)');
              console.log('\n🏷️  Brands included: Apple, Samsung, OnePlus, Xiaomi, Dell, HP, Lenovo, Spigen, Anker, Logitech, Thermaltake');
              console.log('\n✨ All filters now have proper data!');
              db.close();
              process.exit(0);
            }).catch((err) => {
              console.error('❌ Population error:', err);
              db.close();
              process.exit(1);
            });
          }
        });
      });
    }
  });
}

populateDatabase();
