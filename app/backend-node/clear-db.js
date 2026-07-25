#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'products.db');
const db = new sqlite3.Database(dbPath);

console.log('Clearing database tables...\n');

const vendors = ['amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales'];

vendors.forEach(vendor => {
    const tableName = `${vendor}_products`;
    db.run(`DELETE FROM ${tableName}`, (err) => {
        if (err) {
            console.log(`❌ Error clearing ${tableName}:`, err.message);
        } else {
            console.log(`✅ Cleared ${tableName}`);
        }
    });
});

db.close(() => {
    console.log('\n✅ Database cleared');
    process.exit(0);
});
