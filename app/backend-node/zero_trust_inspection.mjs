import { initializeDatabase, getDatabase } from './utils/database.js';
import fs from 'fs';
import path from 'path';

await initializeDatabase();
const db = getDatabase();

const q = (sql, p=[]) => new Promise((res,rej) => db.all(sql, p, (e,r) => e?rej(e):res(r||[])));
const g = (sql, p=[]) => new Promise((res,rej) => db.get(sql, p, (e,r) => e?rej(e):res(r)));

console.log('=================================================================');
console.log('DAAMDEKHO — ZERO-TRUST PRODUCTION GO/NO-GO INSPECTION');
console.log('=================================================================\n');

// PHASE 2 & 3: AMAZON URL AUTHENTICITY
const amzUrls = await q(`
  SELECT vp.id, vp.url, v.name, vp.title
  FROM vendor_products vp
  JOIN vendors v ON vp.vendor_id = v.id
  WHERE v.name = 'Amazon'
`);
console.log('--- PHASE 3: AMAZON URL AUTHENTICITY ---');
console.log('Total Amazon Offers in DB:', amzUrls.length);
let realScrapedAmz = 0, syntheticAmz = 0;
amzUrls.forEach(u => {
  if (/B0(APPL|ASUS|DELL|LENO|ONEP|XIAO|REAL|VIVO|IQOO|GOOG|MOTO|ACER|MSIP|SAMS)\d{4}/.test(u.url)) {
    syntheticAmz++;
  } else {
    realScrapedAmz++;
  }
});
console.log('  Real Crawled Amazon URLs (e.g. B0D1ASUS18): ', realScrapedAmz);
console.log('  Artificially Formatted ASINs (e.g. B0APPL0039):', syntheticAmz);

// PHASE 4: IMAGE AUTHENTICITY
const images = await q('SELECT id, title, base_image FROM products_master');
console.log('\n--- PHASE 4: IMAGE AUTHENTICITY ---');
let cdnCount = 0, unsplashCount = 0, unknownCount = 0;
images.forEach(img => {
  const url = img.base_image || '';
  if (url.includes('unsplash')) unsplashCount++;
  else if (url.includes('apple.com') || url.includes('samsung.com') || url.includes('asus.com') || url.includes('dell.com') || url.includes('acer.com') || url.includes('sony.co.in')) cdnCount++;
  else unknownCount++;
});
console.log('  Manufacturer CDN Images:  ', cdnCount);
console.log('  Unsplash Placeholders:   ', unsplashCount);
console.log('  Other Images:            ', unknownCount);

// PHASE 5: HARDWARE SPEC PROVENANCE
console.log('\n--- PHASE 5: HARDWARE SPEC PROVENANCE ---');
const provenanceCount = await g('SELECT COUNT(*) as cnt FROM spec_provenance');
console.log('  Spec Provenance DB Records:', provenanceCount?.cnt || 0);

// PHASE 8: VENDOR COVERAGE
console.log('\n--- PHASE 8: VENDOR COVERAGE PER PRODUCT ---');
const coverage = await q(`
  SELECT pm.id, pm.title, COUNT(DISTINCT vp.vendor_id) as vcount
  FROM products_master pm
  LEFT JOIN product_variants pv ON pv.master_product_id = pm.id OR pv.product_id = pm.id
  LEFT JOIN vendor_products vp ON vp.variant_id = pv.id
  GROUP BY pm.id
`);
let fullCoverage = 0, partialCoverage = 0, zeroCoverage = 0;
coverage.forEach(c => {
  if (c.vcount >= 4) fullCoverage++;
  else if (c.vcount >= 1) partialCoverage++;
  else zeroCoverage++;
});
console.log('  Products with 4+ Vendors:', fullCoverage);
console.log('  Products with 1-3 Vendors:', partialCoverage);
console.log('  Products with 0 Vendors:  ', zeroCoverage);

// PHASE 12: SECURITY & PRODUCTION CONFIG
console.log('\n--- PHASE 12: PRODUCTION SECURITY & BUNDLE SCAN ---');
const frontendDist = path.join(process.cwd(), '../frontend/dist/assets');
let localhostInBundle = false;
let bundleFiles = [];
if (fs.existsSync(frontendDist)) {
  bundleFiles = fs.readdirSync(frontendDist).filter(f => f.endsWith('.js'));
  bundleFiles.forEach(file => {
    const content = fs.readFileSync(path.join(frontendDist, file), 'utf8');
    if (content.includes('http://localhost') || content.includes('http://127.0.0.1')) {
      localhostInBundle = true;
      console.log('  ⚠️  Found localhost reference in production JS bundle:', file);
    }
  });
}
console.log('  JS Bundle Files Scanned:   ', bundleFiles.length);
console.log('  Localhost in Prod Bundle:  ', localhostInBundle ? 'YES (Requires production VITE_API_URL)' : 'NO (Clean)');

// Check debug routes in app.js / index.js
const appFile = fs.readFileSync('app.js', 'utf8');
const routesFile = fs.readFileSync('routes/index.js', 'utf8');
console.log('  Debug Routes Exposed in API:', routesFile.includes('/debug') ? 'YES (/api/debug active)' : 'NO');

process.exit(0);
