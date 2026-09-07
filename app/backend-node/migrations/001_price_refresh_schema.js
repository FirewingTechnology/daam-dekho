import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../../daamdekho.db');

export async function runMigration() {
  console.log('🚀 Running 001_price_refresh_schema migration on:', DB_PATH);

  const db = new sqlite3.Database(DB_PATH);

  const exec = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

  const queryAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  const queryGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  try {
    // 1. Record pre-migration counts
    const prePm = (await queryGet('SELECT COUNT(*) as cnt FROM products_master')).cnt;
    const prePv = (await queryGet('SELECT COUNT(*) as cnt FROM product_variants')).cnt;
    const preVp = (await queryGet('SELECT COUNT(*) as cnt FROM vendor_products')).cnt;
    const prePh = (await queryGet('SELECT COUNT(*) as cnt FROM price_history')).cnt;

    console.log(`📊 Pre-migration counts:`);
    console.log(`   products_master:  ${prePm}`);
    console.log(`   product_variants: ${prePv}`);
    console.log(`   vendor_products:  ${preVp}`);
    console.log(`   price_history:    ${prePh}`);

    // 2. Check vendor_products columns
    const vpCols = (await queryAll('PRAGMA table_info(vendor_products)')).map(c => c.name);

    const vpNewCols = [
      { name: 'current_price', type: 'REAL' },
      { name: 'previous_price', type: 'REAL' },
      { name: 'price_changed_at', type: 'TIMESTAMP' },
      { name: 'last_price_check_at', type: 'TIMESTAMP' },
      { name: 'last_successful_price_check_at', type: 'TIMESTAMP' },
      { name: 'last_failed_price_check_at', type: 'TIMESTAMP' },
      { name: 'price_check_status', type: 'TEXT DEFAULT "idle"' },
      { name: 'price_check_error', type: 'TEXT' },
      { name: 'price_source', type: 'TEXT' },
      { name: 'price_confidence', type: 'REAL' },
      { name: 'refresh_lock_owner', type: 'TEXT' },
      { name: 'refresh_lock_until', type: 'TIMESTAMP' }
    ];

    for (const col of vpNewCols) {
      if (!vpCols.includes(col.name)) {
        console.log(`   + Adding column vendor_products.${col.name}`);
        await exec(`ALTER TABLE vendor_products ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // 3. Backfill current_price if null
    await exec(`
      UPDATE vendor_products
      SET current_price = price
      WHERE current_price IS NULL AND price IS NOT NULL
    `);

    await exec(`
      UPDATE vendor_products
      SET last_price_check_at = last_scraped_at,
          last_successful_price_check_at = last_scraped_at
      WHERE last_price_check_at IS NULL AND last_scraped_at IS NOT NULL
    `);

    // 4. Check price_history columns
    const phCols = (await queryAll('PRAGMA table_info(price_history)')).map(c => c.name);

    const phNewCols = [
      { name: 'variant_id', type: 'INTEGER' },
      { name: 'vendor_id', type: 'INTEGER' },
      { name: 'currency', type: 'TEXT DEFAULT "INR"' },
      { name: 'source', type: 'TEXT' },
      { name: 'confidence', type: 'REAL' },
      { name: 'change_type', type: 'TEXT' }
    ];

    for (const col of phNewCols) {
      if (!phCols.includes(col.name)) {
        console.log(`   + Adding column price_history.${col.name}`);
        await exec(`ALTER TABLE price_history ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // Backfill variant_id and vendor_id in price_history from vendor_products
    await exec(`
      UPDATE price_history
      SET variant_id = (SELECT vp.variant_id FROM vendor_products vp WHERE vp.id = price_history.vendor_product_id),
          vendor_id = (SELECT vp.vendor_id FROM vendor_products vp WHERE vp.id = price_history.vendor_product_id)
      WHERE variant_id IS NULL AND vendor_product_id IS NOT NULL
    `);

    // 5. Create indexes
    await exec(`CREATE INDEX IF NOT EXISTS idx_vp_price_check ON vendor_products (last_price_check_at, refresh_lock_until)`);
    await exec(`CREATE INDEX IF NOT EXISTS idx_ph_vp_recorded ON price_history (vendor_product_id, recorded_at)`);
    await exec(`CREATE INDEX IF NOT EXISTS idx_ph_variant_recorded ON price_history (variant_id, recorded_at)`);
    await exec(`CREATE INDEX IF NOT EXISTS idx_ph_vendor_recorded ON price_history (vendor_id, recorded_at)`);

    // 6. Verification
    const postPm = (await queryGet('SELECT COUNT(*) as cnt FROM products_master')).cnt;
    const postPv = (await queryGet('SELECT COUNT(*) as cnt FROM product_variants')).cnt;
    const postVp = (await queryGet('SELECT COUNT(*) as cnt FROM vendor_products')).cnt;
    const postPh = (await queryGet('SELECT COUNT(*) as cnt FROM price_history')).cnt;

    if (prePm !== postPm || prePv !== postPv || preVp !== postVp) {
      throw new Error(`Data integrity violation! Record counts changed unexpectedly during migration.`);
    }

    const integrity = await queryGet('PRAGMA integrity_check');
    console.log(`✅ Integrity check: ${integrity.integrity_check}`);

    console.log(`📊 Post-migration counts:`);
    console.log(`   products_master:  ${postPm} (unchanged)`);
    console.log(`   product_variants: ${postPv} (unchanged)`);
    console.log(`   vendor_products:  ${postVp} (unchanged)`);
    console.log(`   price_history:    ${postPh}`);
    console.log('🎉 Migration 001 completed successfully!');
  } finally {
    db.close();
  }
}

// Auto-run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigration().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
}
