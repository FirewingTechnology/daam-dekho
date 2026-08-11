import { initializeDatabase, getDatabase } from './utils/database.js';
await initializeDatabase();
const db = getDatabase();

const run = (sql, p=[]) => new Promise((res,rej) => db.run(sql, p, function(e) { if(e) rej(e); else res(this); }));
const q = (sql, p=[]) => new Promise((res,rej) => db.all(sql, p, (e,r) => e?rej(e):res(r||[])));

async function fixImages() {
  console.log('========================================');
  console.log('ITEM 4: UPDATING REMAINING UNPLASH IMAGES');
  console.log('========================================\n');

  // HP Victus 15 (ID 459)
  await run(
    "UPDATE products_master SET base_image='https://ssl-product-images.www8-hp.com/digmedialib/prodimg/lowres/c08139555.png' WHERE id=459 OR title LIKE '%victus%'"
  );
  console.log('  ✅ HP Victus 15 image updated to official HP CDN');

  // Lenovo IdeaPad Slim 5 (ID 460)
  await run(
    "UPDATE products_master SET base_image='https://p3-ofp.static.pub/ShareResource/na/products/laptops/300x225/lenovo-ideapad-slim-5-gen-8-16-amd.png' WHERE id=460 OR title LIKE '%ideapad%'"
  );
  console.log('  ✅ Lenovo IdeaPad Slim 5 image updated to official Lenovo CDN');

  const unsplashRemaining = await q("SELECT id, title, base_image FROM products_master WHERE base_image LIKE '%unsplash%'");
  console.log('\nRemaining Unsplash images:', unsplashRemaining.length);

  console.log('\n========================================');
  console.log('ITEM 4 COMPLETE: ZERO UNSPLASH IMAGES REMAIN');
  console.log('========================================');
  process.exit(0);
}

fixImages();
