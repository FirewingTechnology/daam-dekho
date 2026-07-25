#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'products.db');
const db = new sqlite3.Database(dbPath);

console.log('=' .repeat(70));
console.log('DATABASE QUALITY CHECK');
console.log('=' .repeat(70) + '\n');

const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];

function checkVendor(vendor) {
    return new Promise((resolve) => {
        const tableName = `${vendor}_products`;
        
        // Get total count
        db.get(`SELECT COUNT(*) as total FROM ${tableName}`, (err, row) => {
            if (err || !row) {
                console.log(`❌ ${vendor.toUpperCase()}: Query failed`);
                resolve();
                return;
            }
            
            const total = row.total;
            
            // Get products with images
            db.get(`SELECT COUNT(*) as count FROM ${tableName} WHERE json_array_length(image_urls) > 0`, (err, row2) => {
                const withImages = row2?.count || 0;
                
                // Get category distribution
                db.all(`SELECT category, COUNT(*) as cnt FROM ${tableName} GROUP BY category`, (err, rows) => {
                    const categories = {};
                    if (rows) {
                        rows.forEach(r => {
                            categories[r.category] = r.cnt;
                        });
                    }
                    
                    // Get first product sample
                    db.get(`SELECT title, category, image_urls FROM ${tableName} LIMIT 1`, (err, sample) => {
                        console.log(`📊 ${vendor.toUpperCase()}`);
                        console.log(`   Total: ${total}`);
                        console.log(`   With Images: ${withImages}/${total}`);
                        console.log(`   Categories: ${Object.entries(categories).map(([k, v]) => `${k}(${v})`).join(', ')}`);
                        if (sample) {
                            console.log(`   Sample: ${sample.title?.substring(0, 50)}...`);
                            try {
                                const imgs = JSON.parse(sample.image_urls);
                                console.log(`   Images: ${Array.isArray(imgs) ? imgs.length : 0}`);
                            } catch (e) {
                                console.log(`   Images: ERROR`);
                            }
                        }
                        console.log();
                        resolve();
                    });
                });
            });
        });
    });
}

async function checkAll() {
    for (const vendor of vendors) {
        await checkVendor(vendor);
    }
    
    console.log('=' .repeat(70));
    console.log('✅ QUALITY CHECK COMPLETE');
    console.log('=' .repeat(70));
    
    db.close(() => {
        process.exit(0);
    });
}

checkAll();
