/**
 * BUG #2 FIX (Part 2) — Repoint legacy vendor_products to correct variant IDs
 * The legacy vendor_products rows have variant_id = product_id (1-9)
 * The new product_variants have id = 38-46
 * We need to update vendor_products.variant_id to point to the new variant IDs
 */
import { initializeDatabase, getDatabase } from './utils/database.js';
await initializeDatabase();
const db = getDatabase();

const q = (sql, p=[]) => new Promise((res,rej) => db.all(sql, p, (e,r) => e?rej(e):res(r||[])));
const g = (sql, p=[]) => new Promise((res,rej) => db.get(sql, p, (e,r) => e?rej(e):res(r)));
const run = (sql, p=[]) => new Promise((res,rej) => db.run(sql, p, function(e) { if(e) rej(e); else res(this); }));

console.log('=== BUG #2 PART 2: Repointing legacy vendor_products variant_ids ===');

// Get the newly created variants for legacy products 1-9
const legacyVariants = await q(`
  SELECT pv.id as variant_id, pv.master_product_id as product_id
  FROM product_variants pv
  WHERE pv.master_product_id IN (1,2,3,4,5,6,7,8,9)
  ORDER BY pv.master_product_id
`);

console.log('New legacy variants:', legacyVariants.length);
legacyVariants.forEach(v => console.log(`  product_id=${v.product_id} → new variant_id=${v.variant_id}`));

// For each legacy product, the vendor_products currently have variant_id = product_id (1-9)
// We need to change those to point to the actual variant IDs (38-46)
let updated = 0;

for (const lv of legacyVariants) {
  const prodId = lv.product_id;
  const newVariantId = lv.variant_id;
  
  // Find vendor_products that use the old product ID as variant_id
  // but are NOT already pointing to the correct variant
  const oldVPs = await q(
    'SELECT id, url, vendor_id FROM vendor_products WHERE variant_id=? AND variant_id!=?',
    [prodId, newVariantId]
  );
  
  if (oldVPs.length > 0) {
    const result = await run(
      'UPDATE vendor_products SET variant_id=? WHERE variant_id=? AND variant_id!=?',
      [newVariantId, prodId, newVariantId]
    );
    console.log(`  ✅ Product ${prodId}: Updated ${oldVPs.length} vendor_products variant_id ${prodId} → ${newVariantId}`);
    updated += oldVPs.length;
  } else {
    console.log(`  ⏭️  Product ${prodId}: No old vendor_products to repoint`);
  }
}

console.log(`\nBUG #2 PART 2 COMPLETE: ${updated} vendor_products repointed to correct variant IDs`);

// Final verification
console.log('\n=== FINAL JOIN VERIFICATION ===');
const joinTest = await q(`
  SELECT pm.id, pm.title, COUNT(DISTINCT vp.vendor_id) as vendor_count
  FROM products_master pm
  LEFT JOIN product_variants pv ON pv.master_product_id = pm.id
  LEFT JOIN vendor_products vp ON vp.variant_id = pv.id
  WHERE pm.id <= 9
  GROUP BY pm.id
  ORDER BY pm.id
`);

joinTest.forEach(r => {
  console.log(`  pm.id=${r.id}: vendors=${r.vendor_count} ${r.vendor_count > 0 ? '✅' : '🔴'} | ${r.title?.substring(0,40)}`);
});

// Also check new products still work
const newJoin = await q(`
  SELECT pm.id, pm.title, COUNT(DISTINCT vp.vendor_id) as vendor_count
  FROM products_master pm
  LEFT JOIN product_variants pv ON pv.master_product_id = pm.id
  LEFT JOIN vendor_products vp ON vp.variant_id = pv.id
  WHERE pm.id > 400
  GROUP BY pm.id
  ORDER BY pm.id
  LIMIT 5
`);
console.log('\nNew products (id>400) join check:');
newJoin.forEach(r => {
  console.log(`  pm.id=${r.id}: vendors=${r.vendor_count} ${r.vendor_count > 0 ? '✅' : '🔴'} | ${r.title?.substring(0,40)}`);
});

process.exit(0);
