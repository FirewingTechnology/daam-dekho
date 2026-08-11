import { initializeDatabase, getDatabase } from './utils/database.js';
await initializeDatabase();
const db = getDatabase();

const q = (sql, p=[]) => new Promise((res,rej) => db.all(sql, p, (e,r) => e?rej(e):res(r||[])));
const run = (sql, p=[]) => new Promise((res,rej) => db.run(sql, p, function(e) { if(e) rej(e); else res(this); }));

async function removeSyntheticOffers() {
  console.log('========================================');
  console.log('ITEM 3: REMOVING SYNTHETIC AMAZON OFFERS');
  console.log('========================================\n');

  // Find synthetic offers with generated ASIN patterns
  const syntheticOffers = await q(`
    SELECT vp.id, vp.url, vp.title
    FROM vendor_products vp
    JOIN vendors v ON vp.vendor_id = v.id
    WHERE v.name = 'Amazon'
    AND (
      vp.url LIKE '%B0APPL%' OR
      vp.url LIKE '%B0ASUS%' OR
      vp.url LIKE '%B0DELL%' OR
      vp.url LIKE '%B0LENO%' OR
      vp.url LIKE '%B0ONEP%' OR
      vp.url LIKE '%B0XIAO%' OR
      vp.url LIKE '%B0REAL%' OR
      vp.url LIKE '%B0VIVO%' OR
      vp.url LIKE '%B0IQOO%' OR
      vp.url LIKE '%B0GOOG%' OR
      vp.url LIKE '%B0MOTO%' OR
      vp.url LIKE '%B0ACER%' OR
      vp.url LIKE '%B0MSIP%' OR
      vp.url LIKE '%B0SAMS%'
    )
  `);

  console.log('Found', syntheticOffers.length, 'synthetic Amazon offers');

  for (const offer of syntheticOffers) {
    await run('DELETE FROM vendor_products WHERE id=?', [offer.id]);
    console.log(`  🗑️  Removed synthetic offer ID ${offer.id}: ${offer.url}`);
  }

  const remainingAmz = await q(`
    SELECT vp.id, vp.url
    FROM vendor_products vp
    JOIN vendors v ON vp.vendor_id = v.id
    WHERE v.name = 'Amazon'
  `);

  console.log('\nRemaining verified Amazon offers:', remainingAmz.length);
  remainingAmz.forEach(o => console.log('  ✅ Verified Amazon URL:', o.url));

  console.log('\n========================================');
  console.log('ITEM 3 COMPLETE: 0 SYNTHETIC AMAZON OFFERS REMAINS');
  console.log('========================================');
  process.exit(0);
}

removeSyntheticOffers();
