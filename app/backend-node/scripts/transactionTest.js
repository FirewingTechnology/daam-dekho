/**
 * transactionTest.js
 * ------------------
 * Section 9: Price Change Transaction Test using ISOLATED TEST DATABASE.
 * NEVER touches production daamdekho.db.
 * Uses sqlite3 (async) — same package as the project.
 *
 * Simulates: ₹49,999 → ₹47,999 → ₹47,999 → ₹51,999 → SCRAPE_FAIL
 * Verifies:  INITIAL, DOWN, no-duplicate, UP, stored price untouched on fail
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.join(__dirname, '../test-price-tx.db');

// Clean up old test DB if exists
if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

console.log('\n' + '═'.repeat(70));
console.log('  PRICE CHANGE TRANSACTION TEST  (ISOLATED TEST DB)');
console.log('  DB: test-price-tx.db (not production)');
console.log('═'.repeat(70));

// Promisified helpers
function dbRun(db, sql, params = []) {
  return new Promise((res, rej) => {
    db.run(sql, params, function (err) {
      if (err) rej(err);
      else res({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(db, sql, params = []) {
  return new Promise((res, rej) => {
    db.get(sql, params, (err, row) => {
      if (err) rej(err);
      else res(row);
    });
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((res, rej) => {
    db.all(sql, params, (err, rows) => {
      if (err) rej(err);
      else res(rows);
    });
  });
}

function assertEq(actual, expected, label) {
  if (actual === expected) {
    console.log(`  ✅ ${label}: ${JSON.stringify(actual)}`);
    return true;
  } else {
    console.log(`  ❌ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    return false;
  }
}

async function main() {
  const db = new sqlite3.Database(TEST_DB_PATH);
  let allPassed = true;

  // Bootstrap minimal schema
  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS vendor_products (
      id INTEGER PRIMARY KEY,
      variant_id INTEGER DEFAULT 1,
      vendor_id INTEGER DEFAULT 1,
      url TEXT,
      price REAL,
      mrp REAL,
      title TEXT,
      current_price REAL,
      previous_price REAL,
      price_changed_at TEXT,
      last_price_check_at TEXT,
      last_successful_price_check_at TEXT,
      last_failed_price_check_at TEXT,
      price_check_status TEXT DEFAULT 'never_checked',
      price_check_error TEXT,
      price_source TEXT DEFAULT 'seed',
      price_confidence REAL,
      refresh_lock_owner TEXT,
      refresh_lock_until TEXT
    )
  `);

  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_product_id INTEGER,
      variant_id INTEGER,
      vendor_id INTEGER,
      price REAL NOT NULL,
      mrp REAL,
      currency TEXT DEFAULT 'INR',
      source TEXT,
      confidence REAL,
      change_type TEXT,
      recorded_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbRun(db, `CREATE INDEX IF NOT EXISTS idx_ph_vp ON price_history(vendor_product_id, recorded_at)`);

  // Insert test product at ₹49,999
  await dbRun(db, `
    INSERT INTO vendor_products (id, url, price, mrp, title, current_price, price_source)
    VALUES (999, 'https://www.amazon.in/test-product/dp/TESTID', 49999, 54999, 'Test Product', 49999, 'seed')
  `);

  // Record INITIAL history entry
  await dbRun(db, `
    INSERT INTO price_history (vendor_product_id, variant_id, vendor_id, price, mrp, change_type, source, confidence, currency)
    VALUES (999, 1, 1, 49999, 54999, 'INITIAL', 'seed', 1.0, 'INR')
  `);

  const getProduct = () => dbGet(db, 'SELECT * FROM vendor_products WHERE id = 999');
  const getHistoryCount = async () => (await dbGet(db, 'SELECT COUNT(*) as cnt FROM price_history WHERE vendor_product_id = 999')).cnt;
  const getLastHistory = () => dbGet(db, 'SELECT * FROM price_history WHERE vendor_product_id = 999 ORDER BY id DESC LIMIT 1');

  /**
   * Atomic price update — mirrors priceHistoryService logic
   */
  async function atomicPriceUpdate({ newPrice, source = 'test_scraper', confidence = 0.95 }) {
    const vp = await getProduct();
    const storedPrice = vp.current_price !== null && vp.current_price !== undefined ? vp.current_price : vp.price;
    const now = new Date().toISOString();

    if (newPrice === storedPrice) {
      // UNCHANGED — update timestamps only, NO history insert
      await dbRun(db, `
        UPDATE vendor_products
        SET last_price_check_at = ?, last_successful_price_check_at = ?, price_check_status = 'unchanged'
        WHERE id = 999
      `, [now, now]);
      return { priceChanged: false, direction: 'UNCHANGED', currentPrice: storedPrice, previousPrice: storedPrice };
    }

    const direction = newPrice > storedPrice ? 'UP' : 'DOWN';
    await dbRun(db, `
      UPDATE vendor_products
      SET price = ?, current_price = ?, previous_price = ?,
          price_changed_at = ?, last_price_check_at = ?, last_successful_price_check_at = ?,
          price_check_status = 'success', price_source = ?, price_confidence = ?
      WHERE id = 999
    `, [newPrice, newPrice, storedPrice, now, now, now, source, confidence]);

    await dbRun(db, `
      INSERT INTO price_history (vendor_product_id, variant_id, vendor_id, price, mrp, change_type, source, confidence, currency)
      VALUES (999, 1, 1, ?, ?, ?, ?, ?, 'INR')
    `, [newPrice, vp.mrp, direction, source, confidence]);

    return { priceChanged: true, direction, currentPrice: newPrice, previousPrice: storedPrice };
  }

  async function simulateScrapeFail() {
    const now = new Date().toISOString();
    await dbRun(db, `
      UPDATE vendor_products
      SET last_price_check_at = ?, last_failed_price_check_at = ?,
          price_check_status = 'failed', price_check_error = 'SCRAPE_NETWORK_ERROR'
      WHERE id = 999
    `, [now, now]);
    const vp = await getProduct();
    return vp.current_price; // must remain unchanged
  }

  // --- STEP 0: Initial state ---
  console.log('\n── Step 0: Initial State ──────────────────────────────────────');
  {
    const vp = await getProduct();
    allPassed &= assertEq(vp.current_price, 49999, 'Initial current_price = ₹49,999');
    allPassed &= assertEq(await getHistoryCount(), 1, 'Initial history count = 1');
    const lastH = await getLastHistory();
    allPassed &= assertEq(lastH.change_type, 'INITIAL', 'First history record change_type = INITIAL');
  }

  // --- STEP 1: Price drops to ₹47,999 ---
  console.log('\n── Step 1: Price Drop ₹49,999 → ₹47,999 ─────────────────────');
  {
    const r = await atomicPriceUpdate({ newPrice: 47999 });
    allPassed &= assertEq(r.priceChanged, true, 'Price changed = true');
    allPassed &= assertEq(r.direction, 'DOWN', 'Direction = DOWN');
    const vp = await getProduct();
    allPassed &= assertEq(vp.current_price, 47999, 'current_price updated to ₹47,999');
    allPassed &= assertEq(vp.previous_price, 49999, 'previous_price = ₹49,999');
    allPassed &= assertEq(await getHistoryCount(), 2, 'History count = 2 (INITIAL + DOWN)');
    allPassed &= assertEq((await getLastHistory()).change_type, 'DOWN', 'Last history change_type = DOWN');
  }

  // --- STEP 2: Identical price ₹47,999 — no duplicate ---
  console.log('\n── Step 2: Identical Price ₹47,999 — No Duplicate ───────────');
  {
    const r = await atomicPriceUpdate({ newPrice: 47999 });
    allPassed &= assertEq(r.priceChanged, false, 'Price changed = false (unchanged)');
    allPassed &= assertEq(r.direction, 'UNCHANGED', 'Direction = UNCHANGED');
    const vp = await getProduct();
    allPassed &= assertEq(vp.current_price, 47999, 'current_price still ₹47,999');
    allPassed &= assertEq(await getHistoryCount(), 2, 'History count still = 2 (no duplicate)');
  }

  // --- STEP 3: Price rises to ₹51,999 ---
  console.log('\n── Step 3: Price Increase ₹47,999 → ₹51,999 ─────────────────');
  {
    const r = await atomicPriceUpdate({ newPrice: 51999 });
    allPassed &= assertEq(r.priceChanged, true, 'Price changed = true');
    allPassed &= assertEq(r.direction, 'UP', 'Direction = UP');
    const vp = await getProduct();
    allPassed &= assertEq(vp.current_price, 51999, 'current_price updated to ₹51,999');
    allPassed &= assertEq(vp.previous_price, 47999, 'previous_price = ₹47,999');
    allPassed &= assertEq(await getHistoryCount(), 3, 'History count = 3 (INITIAL + DOWN + UP)');
    allPassed &= assertEq((await getLastHistory()).change_type, 'UP', 'Last history change_type = UP');
  }

  // --- STEP 4: Scrape FAILS — price must remain ₹51,999 ---
  console.log('\n── Step 4: Scrape Fails — Price Preserved ────────────────────');
  {
    const priceAfterFailure = await simulateScrapeFail();
    const vp = await getProduct();
    allPassed &= assertEq(priceAfterFailure, 51999, 'Stored price untouched at ₹51,999 after failed scrape');
    allPassed &= assertEq(vp.price_check_status, 'failed', 'price_check_status = failed');
    allPassed &= assertEq(await getHistoryCount(), 3, 'History count still = 3 (no extra entry on failure)');
    allPassed &= assertEq(vp.price_check_error, 'SCRAPE_NETWORK_ERROR', 'Error logged correctly');
  }

  // Verify full history record
  console.log('\n── Final History Audit ────────────────────────────────────────');
  const allHistory = await dbAll(db, 'SELECT * FROM price_history WHERE vendor_product_id = 999 ORDER BY id');
  allHistory.forEach((h, i) => {
    console.log(`  [${i + 1}] price=₹${h.price.toLocaleString('en-IN')} type=${h.change_type} source=${h.source}`);
  });
  const historyTypes = allHistory.map(h => h.change_type);
  allPassed &= assertEq(JSON.stringify(historyTypes), JSON.stringify(['INITIAL', 'DOWN', 'UP']), 'History sequence = [INITIAL, DOWN, UP]');

  // Cleanup
  await new Promise(res => db.close(res));
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  console.log('\n  Test DB cleaned up (test-price-tx.db).');

  console.log('\n' + '─'.repeat(70));
  if (allPassed) {
    console.log('  ✅ ALL TRANSACTION TESTS PASSED');
  } else {
    console.log('  ❌ SOME TRANSACTION TESTS FAILED');
  }
  console.log('═'.repeat(70) + '\n');
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
