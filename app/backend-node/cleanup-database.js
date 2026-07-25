#!/usr/bin/env node
/**
 * 🗑️ Database Cleanup Script
 * Removes all demo data from all vendor tables
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'products.db');

console.log('\n' + '='.repeat(80));
console.log('🗑️  DATABASE CLEANUP - REMOVING DEMO DATA');
console.log('='.repeat(80));

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Connected to database:', dbPath);
  
  // List of vendor tables
  const tables = [
    'amazon_products',
    'flipkart_products',
    'croma_products',
    'jiomart_products',
    'vijaysales_products',
    'reliance_digital_products',
    'snapdeal_products',
    'ebay_products',
    'myntra_products'
  ];
  
  let completedTables = 0;
  
  // Delete all rows from each table
  tables.forEach(table => {
    db.run(`DELETE FROM ${table}`, function(err) {
      if (err) {
        console.error(`❌ Error clearing ${table}:`, err.message);
      } else {
        console.log(`✅ Cleared ${table} - ${this.changes} rows deleted`);
      }
      
      completedTables++;
      
      // After all tables are cleared
      if (completedTables === tables.length) {
        console.log('\n' + '='.repeat(80));
        console.log('✅ CLEANUP COMPLETE');
        console.log('='.repeat(80));
        console.log('\nDatabase is now empty. Ready for fresh scraping!\n');
        console.log('Next steps:');
        console.log('  1. Run scraper: python scrape_comprehensive.py');
        console.log('  2. Or retry: python scrape_retry_flipkart_jiomart.py');
        console.log('');
        
        db.close();
        process.exit(0);
      }
    });
  });
});

db.on('error', (err) => {
  console.error('❌ Database error:', err.message);
  process.exit(1);
});
