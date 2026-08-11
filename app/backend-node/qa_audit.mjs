import { initializeDatabase, getDatabase } from './utils/database.js';
await initializeDatabase();
const db = getDatabase();

const q = (sql, p=[]) => new Promise((res,rej) => db.all(sql, p, (e,r) => e?rej(e):res(r||[])));
const g = (sql, p=[]) => new Promise((res,rej) => db.get(sql, p, (e,r) => e?rej(e):res(r)));

console.log('=================================================================');
console.log('DAAMDEKHO — COMPREHENSIVE QA AUDIT REPORT');
console.log('=================================================================\n');

// --- 1. SPECS COVERAGE ---
const totalVariants = await g('SELECT COUNT(*) as cnt FROM product_variants');
const variantsWithCpu = await g("SELECT COUNT(*) as cnt FROM product_variants WHERE cpu IS NOT NULL AND cpu != ''");
const variantsWithRam = await g("SELECT COUNT(*) as cnt FROM product_variants WHERE ram IS NOT NULL AND ram != ''");
const variantsWithStorage = await g("SELECT COUNT(*) as cnt FROM product_variants WHERE storage IS NOT NULL AND storage != ''");
const variantsWithColor = await g("SELECT COUNT(*) as cnt FROM product_variants WHERE color IS NOT NULL AND color != ''");
console.log('--- BUG #1: SPECIFICATION COVERAGE ---');
console.log('Total Variants:', totalVariants.cnt);
console.log('With CPU:    ', variantsWithCpu.cnt, '/', totalVariants.cnt, variantsWithCpu.cnt === 0 ? '🔴 CRITICAL' : variantsWithCpu.cnt < totalVariants.cnt ? '⚠️ PARTIAL' : '✅');
console.log('With RAM:    ', variantsWithRam.cnt, '/', totalVariants.cnt, variantsWithRam.cnt === 0 ? '🔴 CRITICAL' : variantsWithRam.cnt < totalVariants.cnt ? '⚠️ PARTIAL' : '✅');
console.log('With Storage:', variantsWithStorage.cnt, '/', totalVariants.cnt, variantsWithStorage.cnt === 0 ? '🔴 CRITICAL' : '✅');
console.log('With Color:  ', variantsWithColor.cnt, '/', totalVariants.cnt, variantsWithColor.cnt === 0 ? '🔴 CRITICAL' : '✅');

// --- 2. URL QUALITY AUDIT ---
const totalVendorProducts = await g('SELECT COUNT(*) as cnt FROM vendor_products');
const badAmazonUrls = await g("SELECT COUNT(*) as cnt FROM vendor_products vp JOIN vendors v ON vp.vendor_id=v.id WHERE v.name='Amazon' AND vp.url LIKE '%amazon.com/product/%'");
const goodAmazonUrls = await g("SELECT COUNT(*) as cnt FROM vendor_products vp JOIN vendors v ON vp.vendor_id=v.id WHERE v.name='Amazon' AND vp.url LIKE '%amazon.in/dp/%'");
const nullUrls = await g("SELECT COUNT(*) as cnt FROM vendor_products WHERE url IS NULL OR url=''");
console.log('\n--- BUG #2: VENDOR URL INTEGRITY ---');
console.log('Total vendor_products:', totalVendorProducts.cnt);
console.log('Amazon (amazon.com/product/... constructed URLs): ', badAmazonUrls.cnt, badAmazonUrls.cnt > 0 ? '🔴 CRITICAL — NOT REAL SCRAPE URLs' : '✅');
console.log('Amazon (amazon.in/dp/... real PDP URLs):         ', goodAmazonUrls.cnt, goodAmazonUrls.cnt > 0 ? '✅ REAL' : '🔴 NONE');
console.log('Null/empty URLs:                                 ', nullUrls.cnt, nullUrls.cnt > 0 ? '⚠️' : '✅');

// --- 3. VARIANT LABEL COVERAGE ---
const variantsWithLabel = await g("SELECT COUNT(*) as cnt FROM product_variants WHERE (ram IS NOT NULL AND ram != '') OR (storage IS NOT NULL AND storage != '') OR (color IS NOT NULL AND color != '')");
console.log('\n--- BUG #3: VARIANT LABEL COVERAGE ---');
console.log('Variants with at least one label field (RAM/Storage/Color):', variantsWithLabel.cnt, '/', totalVariants.cnt);

// --- 4. PRODUCT IMAGE COVERAGE ---
const masterCount = await g('SELECT COUNT(*) as cnt FROM products_master');
const masterWithImage = await g("SELECT COUNT(*) as cnt FROM products_master WHERE base_image IS NOT NULL AND base_image != ''");
const masterUnsplash = await g("SELECT COUNT(*) as cnt FROM products_master WHERE base_image LIKE '%unsplash%'");
const masterReal = await g("SELECT COUNT(*) as cnt FROM products_master WHERE base_image NOT LIKE '%unsplash%' AND base_image IS NOT NULL AND base_image != ''");
console.log('\n--- BUG #4: PRODUCT IMAGE QUALITY ---');
console.log('Total products_master:', masterCount.cnt);
console.log('With base_image:     ', masterWithImage.cnt, '/', masterCount.cnt);
console.log('Unsplash (placeholder) images:', masterUnsplash.cnt, masterUnsplash.cnt > 0 ? '⚠️ NOT REAL PRODUCT IMAGES' : '✅');
console.log('Real product images: ', masterReal.cnt);

// --- 5. VENDOR COVERAGE PER PRODUCT ---
const vendorCoverage = await q(`
  SELECT pm.id, pm.title, COUNT(DISTINCT vp.vendor_id) as vendor_count
  FROM products_master pm
  LEFT JOIN product_variants pv ON pv.master_product_id = pm.id
  LEFT JOIN vendor_products vp ON vp.variant_id = pv.id
  GROUP BY pm.id
  HAVING vendor_count = 0
  LIMIT 20
`);
console.log('\n--- BUG #5: PRODUCTS WITH ZERO VENDORS ---');
console.log('Count:', vendorCoverage.length, vendorCoverage.length > 0 ? '🔴 CRITICAL' : '✅');
vendorCoverage.slice(0,5).forEach(r => console.log('  ID:', r.id, '|', r.title?.substring(0,40)));

// --- 6. DUPLICATE PRODUCTS ---
const dupes = await q(`
  SELECT title, COUNT(*) as cnt FROM products_master GROUP BY LOWER(TRIM(title)) HAVING cnt > 1 LIMIT 10
`);
console.log('\n--- BUG #6: DUPLICATE PRODUCT TITLES ---');
console.log('Count:', dupes.length, dupes.length > 0 ? '⚠️ DUPLICATE MASTER PRODUCTS' : '✅');
dupes.forEach(d => console.log('  [x'+d.cnt+']', d.title?.substring(0,50)));

// --- 7. CATEGORY DISTRIBUTION ---
const cats = await q("SELECT category, COUNT(*) as cnt FROM products_master GROUP BY category ORDER BY cnt DESC");
console.log('\n--- CATEGORY DISTRIBUTION ---');
cats.forEach(c => console.log(' ', c.cnt.toString().padStart(4), '|', c.category));

// --- 8. SEARCH ENDPOINT CHECK ---
try {
  const r = await fetch('http://localhost:8001/api/products?q=samsung');
  const d = await r.json();
  console.log('\n--- SEARCH API (/api/products?q=samsung) ---');
  console.log('Status:', r.status, r.ok ? '✅' : '🔴');
  console.log('Results:', d.products?.length ?? 0);
} catch(e) { console.log('🔴 SEARCH ERROR:', e.message); }

// --- 9. VENDORS TABLE ---
const vendors = await q('SELECT id, name FROM vendors');
console.log('\n--- VENDORS IN DB ---');
vendors.forEach(v => console.log('  ID:', v.id, '|', v.name));

console.log('\n=================================================================');
console.log('AUDIT COMPLETE');
console.log('=================================================================');
process.exit(0);
