#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to products.db - checking both local and parent dir
const dbPath = path.join(__dirname, 'products.db');
const db = new sqlite3.Database(dbPath);

const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];

async function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

async function getRows(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function cleanDatabase() {
    console.log('🚀 Starting Smart Database Cleanup...\n');

    for (const vendor of vendors) {
        const tableName = `${vendor}_products`;
        console.log(`📊 Processing ${vendor.toUpperCase()}...`);

        try {
            // 1. Remove products with invalid prices
            const invalidPriceChanges = await runQuery(`DELETE FROM ${tableName} WHERE price <= 0 OR price IS NULL`);
            if (invalidPriceChanges > 0) console.log(`   🗑️  Removed ${invalidPriceChanges} products with invalid prices.`);

            // 2. Remove products with empty titles or very short titles
            const invalidTitleChanges = await runQuery(`DELETE FROM ${tableName} WHERE length(title) < 5 OR title IS NULL`);
            if (invalidTitleChanges > 0) console.log(`   🗑️  Removed ${invalidTitleChanges} products with invalid titles.`);

            // 3. Remove products without images (optional, but usually desired for quality)
            const noImageChanges = await runQuery(`DELETE FROM ${tableName} WHERE image_urls = '[]' OR image_urls IS NULL OR image_urls = ''`);
            if (noImageChanges > 0) console.log(`   🗑️  Removed ${noImageChanges} products without images.`);

            // 4. Deduplicate (Keep the one with the highest rating/reviews or most recent)
            // Strategy: Keep the one with lowest ID among those with same title+brand
            const duplicates = await getRows(`
                SELECT title, brand, count(*) as count 
                FROM ${tableName} 
                GROUP BY title, brand 
                HAVING count > 1
            `);

            let dupeCount = 0;
            for (const dupe of duplicates) {
                const result = await runQuery(`
                    DELETE FROM ${tableName} 
                    WHERE title = ? AND brand = ? 
                    AND id NOT IN (SELECT id FROM ${tableName} WHERE title = ? AND brand = ? LIMIT 1)
                `, [dupe.title, dupe.brand, dupe.title, dupe.brand]);
                dupeCount += result;
            }
            if (dupeCount > 0) console.log(`   👯  Removed ${dupeCount} duplicate products.`);

            // 5. Standardize Categories
            await runQuery(`UPDATE ${tableName} SET category = 'Mobile' WHERE LOWER(category) IN ('mobiles', 'smartphone', 'smartphones', 'cell phones')`);
            await runQuery(`UPDATE ${tableName} SET category = 'Laptop' WHERE LOWER(category) IN ('laptops', 'notebook', 'notebooks', 'ultrabook')`);
            
            // 6. Fix for HP 15 miscategorization
            await runQuery(`UPDATE ${tableName} SET category = 'Laptop' WHERE LOWER(title) LIKE '%hp 15%' OR LOWER(title) LIKE '%laptop%'`);

            // 7. Clean backslashes from image_urls and offers
            const rowsToClean = await getRows(`SELECT id, image_urls, offers FROM ${tableName}`);
            for (const row of rowsToClean) {
                let needsUpdate = false;
                let updatedImageUrls = row.image_urls;
                let updatedOffers = row.offers;

                if (row.image_urls && row.image_urls.includes('\\/')) {
                    updatedImageUrls = row.image_urls.replace(/\\\//g, '/');
                    needsUpdate = true;
                }
                
                if (row.offers && row.offers.includes('\\\\')) {
                    updatedOffers = row.offers.replace(/\\\\/g, '\\');
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await runQuery(`UPDATE ${tableName} SET image_urls = ?, offers = ? WHERE id = ?`, [updatedImageUrls, updatedOffers, row.id]);
                }
            }

            console.log(`   ✅ ${vendor.toUpperCase()} cleanup complete.\n`);
        } catch (err) {
            console.error(`   ❌ Error cleaning ${vendor}:`, err.message);
        }
    }

    // 7. Vacuum the database to reclaim space
    console.log('🧹 Vacuuming database...');
    db.run('VACUUM', (err) => {
        if (err) console.error('   ❌ Vacuum failed:', err.message);
        else console.log('   ✅ Database vacuumed successfully.');

        console.log('\n✨ Database cleaning complete!');
        db.close();
        process.exit(0);
    });
}

cleanDatabase();
