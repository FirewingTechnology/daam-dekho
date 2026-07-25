import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../../daamdekho.db');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get vendor statistics
router.get('/vendors/stats', asyncHandler(async (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const vendors = [
    'amazon', 'flipkart', 'croma', 'jiomart', 'vijaysales',
    'reliance_digital', 'snapdeal', 'ebay', 'myntra'
  ];
  
  const stats = {};
  let totalProducts = 0;
  
  for (const vendor of vendors) {
    const tableName = `${vendor}_products`;
    const count = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
        if (err) resolve(0);
        else resolve(row?.count || 0);
      });
    });
    
    stats[vendor] = {
      products: count,
      vendor_name: vendor.replace('_', ' ').toUpperCase(),
      status: count > 0 ? 'Active' : 'Empty'
    };
    
    totalProducts += count;
  }
  
  db.close();
  
  res.json({
    timestamp: new Date().toISOString(),
    total_products: totalProducts,
    total_vendors: vendors.length,
    active_vendors: Object.values(stats).filter(s => s.products > 0).length,
    vendors: stats
  });
}));

// Get all products with optional filters
router.get('/scraped', asyncHandler(async (req, res) => {
  const { vendor, limit = 50, page = 1, search } = req.query;
  const offset = (page - 1) * limit;
  
  const db = new sqlite3.Database(dbPath);
  
  let query = `
    SELECT * FROM (
      SELECT 'amazon' as vendor, * FROM amazon_products
      UNION ALL
      SELECT 'flipkart' as vendor, * FROM flipkart_products
      UNION ALL
      SELECT 'croma' as vendor, * FROM croma_products
      UNION ALL
      SELECT 'jiomart' as vendor, * FROM jiomart_products
      UNION ALL
      SELECT 'vijaysales' as vendor, * FROM vijaysales_products
      UNION ALL
      SELECT 'reliance_digital' as vendor, * FROM reliance_digital_products
      UNION ALL
      SELECT 'snapdeal' as vendor, * FROM snapdeal_products
      UNION ALL
      SELECT 'ebay' as vendor, * FROM ebay_products
      UNION ALL
      SELECT 'myntra' as vendor, * FROM myntra_products
    ) products
  `;
  
  let whereClause = '1=1';
  const params = [];
  
  if (vendor) {
    whereClause += ` AND vendor = ?`;
    params.push(vendor);
  }
  
  if (search) {
    whereClause += ` AND (title LIKE ? OR brand LIKE ?)`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }
  
  query += ` WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  const products = await new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
  
  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total FROM (
      SELECT 'amazon' as vendor, * FROM amazon_products
      UNION ALL
      SELECT 'flipkart' as vendor, * FROM flipkart_products
      UNION ALL
      SELECT 'croma' as vendor, * FROM croma_products
      UNION ALL
      SELECT 'jiomart' as vendor, * FROM jiomart_products
      UNION ALL
      SELECT 'vijaysales' as vendor, * FROM vijaysales_products
      UNION ALL
      SELECT 'reliance_digital' as vendor, * FROM reliance_digital_products
      UNION ALL
      SELECT 'snapdeal' as vendor, * FROM snapdeal_products
      UNION ALL
      SELECT 'ebay' as vendor, * FROM ebay_products
      UNION ALL
      SELECT 'myntra' as vendor, * FROM myntra_products
    ) products WHERE ${whereClause}
  `;
  
  const countResult = await new Promise((resolve, reject) => {
    db.get(countQuery, params.slice(0, -2), (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  db.close();
  
  res.json({
    data: products,
    pagination: {
      total: countResult?.total || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil((countResult?.total || 0) / limit)
    }
  });
}));

// Get products by vendor
router.get('/vendor/:vendor', asyncHandler(async (req, res) => {
  const { vendor } = req.params;
  const { limit = 50, page = 1 } = req.query;
  const offset = (page - 1) * limit;
  
  const tableName = `${vendor}_products`;
  const db = new sqlite3.Database(dbPath);
  
  const products = await new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  
  const countResult = await new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as total FROM ${tableName}`, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  db.close();
  
  res.json({
    vendor,
    data: products,
    pagination: {
      total: countResult?.total || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    }
  });
}));

export default router;
