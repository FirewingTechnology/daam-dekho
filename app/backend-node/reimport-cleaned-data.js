#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'products.db');
const dataDir = path.join(__dirname, '../Scraping_Ecommerce/database');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Failed to connect:', err);
        process.exit(1);
    }
});

const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];

console.log('=' .repeat(60));
console.log('RE-IMPORTING CLEANED DATA');
console.log('=' .repeat(60) + '\n');

function importVendor(vendor) {
    return new Promise((resolve) => {
        const filePath = path.join(dataDir, `cleaned_${vendor}_final.json`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  ${vendor.toUpperCase()}: File not found - ${filePath}`);
            resolve();
            return;
        }
        
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            
            if (!Array.isArray(data) || data.length === 0) {
                console.log(`⚠️  ${vendor.toUpperCase()}: No valid data in file`);
                resolve();
                return;
            }
            
            const tableName = `${vendor}_products`;
            let insertedCount = 0;
            let failedCount = 0;
            
            // Process each product
            const processProducts = (index) => {
                if (index >= data.length) {
                    console.log(`✅ ${vendor.toUpperCase()}: Imported ${insertedCount}/${data.length} products`);
                    resolve();
                    return;
                }
                
                const product = data[index];
                
                // Prepare values
                const id = product.id || Math.random() * 1000000000 | 0;
                const title = product.title || 'N/A';
                const brand = product.brand || 'Unknown';
                const category = product.category || 'Electronics';
                const price = parseFloat(product.price) || 0;
                const discountedPrice = parseFloat(product.discounted_price) || price;
                const rating = parseFloat(product.rating) || 0;
                const reviews = parseInt(product.reviews) || 0;
                const sellerName = product.seller_name || vendor;
                const availability = product.availability || 'In Stock';
                const specifications = JSON.stringify(product.specifications || {});
                const image_urls = JSON.stringify(product.image_urls || []);
                const product_link = product.product_link || '';
                const offers = JSON.stringify(product.offers || []);
                const scraped_at = new Date().toISOString();
                
                const sql = `
                    INSERT OR REPLACE INTO ${tableName} (
                        id, title, brand, category, price, discounted_price,
                        rating, reviews, seller_name, availability, specifications,
                        image_urls, product_link, offers, vendor, scraped_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                db.run(sql, [
                    id, title, brand, category, price, discountedPrice,
                    rating, reviews, sellerName, availability, specifications,
                    image_urls, product_link, offers, vendor, scraped_at, scraped_at, scraped_at
                ], (err) => {
                    if (err) {
                        failedCount++;
                    } else {
                        insertedCount++;
                    }
                    processProducts(index + 1);
                });
            };
            
            processProducts(0);
        } catch (error) {
            console.log(`❌ ${vendor.toUpperCase()}: Error reading file - ${error.message}`);
            resolve();
        }
    });
}

async function importAll() {
    for (const vendor of vendors) {
        await importVendor(vendor);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ RE-IMPORT COMPLETE');
    console.log('=' .repeat(60));
    
    db.close(() => {
        process.exit(0);
    });
}

importAll();
