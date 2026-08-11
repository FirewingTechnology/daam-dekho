/**
 * BUG #2 FIX — Create product_variants for legacy products (ID 1–9)
 * These products exist in products_master but have NO entries in product_variants,
 * so their vendor_products are orphaned.
 */
import { initializeDatabase, getDatabase } from './utils/database.js';
await initializeDatabase();
const db = getDatabase();

const q = (sql, p=[]) => new Promise((res,rej) => db.all(sql, p, (e,r) => e?rej(e):res(r||[])));
const g = (sql, p=[]) => new Promise((res,rej) => db.get(sql, p, (e,r) => e?rej(e):res(r)));
const run = (sql, p=[]) => new Promise((res,rej) => db.run(sql, p, function(e) { if(e) rej(e); else res(this); }));

console.log('=== BUG #2 FIX: Legacy product_variants ===');

// These are old products. Their vendor_products exist but variant_id is set 
// to the product ID directly (before the product_variants table existed).
// We need to: 1) insert a product_variant row for each, 2) link vendor_products to it.

const legacyProducts = [
  { id: 1, cpu: 'Intel Core i9-14900HX', ram: '24 GB', storage: '2 TB SSD', color: 'Eclipse Gray', network: null },
  { id: 2, cpu: 'Apple A17 Pro', ram: '8 GB', storage: '256 GB', color: 'Natural Titanium', network: '5G' },
  { id: 3, cpu: 'Snapdragon 8 Gen 3 for Galaxy', ram: '12 GB', storage: '256 GB', color: 'Titanium Gray', network: '5G' },
  { id: 4, cpu: 'Apple M3', ram: '16 GB', storage: '512 GB', color: 'Space Gray', network: null },
  { id: 5, cpu: 'Apple M4', ram: '8 GB', storage: '256 GB', color: 'Space Gray', network: 'Wi-Fi' },
  { id: 6, cpu: null, ram: null, storage: null, color: 'Black', network: null },
  { id: 7, cpu: null, ram: null, storage: null, color: 'White', network: null },
  { id: 8, cpu: null, ram: null, storage: null, color: 'Black', network: null },
  { id: 9, cpu: null, ram: null, storage: null, color: 'Black', network: null },
];

let created = 0;

for (const prod of legacyProducts) {
  // Check if a variant already exists for this master
  const existingVariant = await g('SELECT id FROM product_variants WHERE master_product_id=?', [prod.id]);
  if (existingVariant) {
    console.log(`  ⏭️  Product ${prod.id}: variant already exists (id=${existingVariant.id})`);
    continue;
  }
  
  // Check if any vendor_products exist with variant_id = product.id (legacy link)
  const legacyVendorProducts = await q('SELECT id FROM vendor_products WHERE variant_id=?', [prod.id]);
  
  // Create a proper product_variant
  const hash = `legacy_variant_${prod.id}_${Date.now()}`;
  const result = await run(`
    INSERT INTO product_variants 
    (master_product_id, product_id, variant_identity_hash, cpu, ram, storage, color, network, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `, [prod.id, prod.id, hash, prod.cpu, prod.ram, prod.storage, prod.color, prod.network]);
  
  const newVariantId = result.lastID;
  console.log(`  ✅ Created variant id=${newVariantId} for product ${prod.id}`);
  
  // If vendor_products existed with variant_id=prod.id, they were already linking here
  // (The legacy system used product_id as variant_id directly)
  // We don't need to update them since they already use prod.id as variant_id
  // and now our new variant has master_product_id=prod.id
  
  if (legacyVendorProducts.length > 0) {
    console.log(`    ℹ️  ${legacyVendorProducts.length} vendor_products already link to variant_id=${prod.id} (legacy - no update needed)`);
  }
  
  created++;
}

console.log(`\nBUG #2 COMPLETE: ${created} product_variants created for legacy products`);

// Verify the fix
console.log('\n=== VERIFICATION ===');
for (const prod of legacyProducts) {
  const variant = await g('SELECT id, cpu, ram, storage FROM product_variants WHERE master_product_id=?', [prod.id]);
  const vpCount = await g('SELECT COUNT(*) as cnt FROM vendor_products WHERE variant_id=?', [variant?.id || prod.id]);
  console.log(`  Product ${prod.id}: variant=${variant?.id||'NONE'} | vendors=${vpCount?.cnt} | cpu=${variant?.cpu||'N/A'}`);
}

// Now verify the full JOIN works
const joinTest = await q(`
  SELECT pm.id, pm.title, COUNT(DISTINCT vp.vendor_id) as vendor_count
  FROM products_master pm
  LEFT JOIN product_variants pv ON pv.master_product_id = pm.id
  LEFT JOIN vendor_products vp ON vp.variant_id = pv.id
  WHERE pm.id <= 9
  GROUP BY pm.id
  ORDER BY pm.id
`);

console.log('\nJoin verification (should show vendors > 0):');
joinTest.forEach(r => {
  console.log(`  pm.id=${r.id}: vendors=${r.vendor_count} | ${r.vendor_count > 0 ? '✅' : '🔴'} ${r.title?.substring(0,35)}`);
});

process.exit(0);
