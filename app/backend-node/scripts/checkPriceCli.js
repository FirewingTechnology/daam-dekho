import 'dotenv/config';
import { connectDB, closeDB, get } from '../utils/db.js';
import { refreshVendorProduct } from '../services/priceRefreshService.js';

async function main() {
  await connectDB();

  const args = process.argv.slice(2);
  let vendorProductId = null;
  let commit = false;

  for (const arg of args) {
    if (arg.startsWith('--vendor-product-id=')) {
      vendorProductId = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--commit') {
      commit = true;
    }
  }

  if (!vendorProductId) {
    const sample = await get(
      `SELECT id FROM vendor_products 
       WHERE url IS NOT NULL AND url != '' AND url != '#' 
       ORDER BY last_price_check_at ASC NULLS FIRST 
       LIMIT 1`
    );
    if (sample) {
      vendorProductId = sample.id;
      console.log(`ℹ️ No --vendor-product-id specified. Using next eligible stale product ID: ${vendorProductId}`);
    } else {
      console.error('❌ No vendor products found with a valid URL.');
      await closeDB();
      process.exit(1);
    }
  }

  console.log(`\n🔍 Checking Vendor Product ID #${vendorProductId} (Mode: ${commit ? 'COMMIT' : 'DRY-RUN'})...\n`);

  const result = await refreshVendorProduct(vendorProductId, {
    dryRun: !commit,
    workerId: 'cli_' + process.pid
  });

  console.log('=== RESULT ===');
  console.log(JSON.stringify(result, null, 2));

  await closeDB();
}

main().catch(err => {
  console.error('CLI execution error:', err);
  process.exit(1);
});
