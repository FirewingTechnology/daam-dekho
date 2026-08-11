import { initializeDatabase, getDatabase } from './utils/database.js';
await initializeDatabase();
const db = getDatabase();

const run = (sql, p=[]) => new Promise((res,rej) => db.run(sql, p, function(e) { if(e) rej(e); else res(this); }));
const q = (sql, p=[]) => new Promise((res,rej) => db.all(sql, p, (e,r) => e?rej(e):res(r||[])));

async function fixCpu() {
  await run("UPDATE product_variants SET cpu='Intel Core i9-14900HX' WHERE id=1 OR product_id=1 OR master_product_id=1");
  await run("UPDATE product_variants SET cpu='Apple A17 Pro' WHERE id=2 OR product_id=2 OR master_product_id=2");
  await run("UPDATE product_variants SET cpu='Snapdragon 8 Gen 3 for Galaxy' WHERE id=3 OR product_id=3 OR master_product_id=3");
  await run("UPDATE product_variants SET cpu='Apple M3' WHERE id=4 OR product_id=4 OR master_product_id=4");
  await run("UPDATE product_variants SET cpu='Apple M4' WHERE id=5 OR product_id=5 OR master_product_id=5");
  
  const allNull = await q("SELECT id, product_id, master_product_id FROM product_variants WHERE cpu IS NULL OR cpu = ''");
  console.log('Remaining null CPU variants:', allNull.length);
  for (const v of allNull) {
    await run("UPDATE product_variants SET cpu='Snapdragon 8 Gen 3' WHERE id=?", [v.id]);
  }
  console.log('✅ All CPU specs updated!');
  process.exit(0);
}

fixCpu();
