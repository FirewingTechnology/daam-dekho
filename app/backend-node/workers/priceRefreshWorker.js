import 'dotenv/config';
import { connectDB, closeDB, run } from '../utils/db.js';
import { refreshStaleBatch, CONFIG } from '../services/priceRefreshService.js';

const WORKER_ID = `worker_${process.pid}_${Date.now()}`;
let isRunning = false;
let shouldStop = false;
let currentTimer = null;

async function runWorkerCycle() {
  if (shouldStop || isRunning) return;
  isRunning = true;

  try {
    console.log(`[WORKER_${WORKER_ID}] 🔄 Running price refresh cycle at ${new Date().toISOString()}`);
    const result = await refreshStaleBatch({ workerId: WORKER_ID });
    console.log(`[WORKER_${WORKER_ID}] ✅ Cycle complete: processed=${result.processed}, success=${result.successful}, failed=${result.failed}, changes=${result.priceChanges}`);
  } catch (err) {
    console.error(`[WORKER_${WORKER_ID}] ❌ Error during refresh cycle:`, err.message);
  } finally {
    isRunning = false;
    if (!shouldStop) {
      const intervalMs = CONFIG.intervalMinutes * 60 * 1000;
      console.log(`[WORKER_${WORKER_ID}] ⏱ Next cycle in ${CONFIG.intervalMinutes} minutes...`);
      currentTimer = setTimeout(runWorkerCycle, intervalMs);
    }
  }
}

async function shutdown() {
  console.log(`\n[WORKER_${WORKER_ID}] 🛑 Gracefully shutting down worker...`);
  shouldStop = true;
  if (currentTimer) clearTimeout(currentTimer);

  try {
    // Release any stale locks held by this worker
    await run(
      `UPDATE vendor_products 
       SET refresh_lock_owner = NULL, refresh_lock_until = NULL 
       WHERE refresh_lock_owner = ?`,
      [WORKER_ID]
    );
    console.log(`[WORKER_${WORKER_ID}] 🔓 Released any held locks.`);
    await closeDB();
  } catch (err) {
    console.error(`[WORKER_${WORKER_ID}] Error releasing locks:`, err.message);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export async function startWorker() {
  if (!CONFIG.enabled) {
    console.log(`[WORKER] Price refresh is disabled (PRICE_REFRESH_ENABLED=false). Worker not started.`);
    return;
  }

  await connectDB();
  console.log(`[WORKER_${WORKER_ID}] 🚀 Price refresh background worker started (interval=${CONFIG.intervalMinutes}m, batch=${CONFIG.batchSize}, concurrency=${CONFIG.concurrency})`);
  runWorkerCycle();
}

if (process.argv[1].endsWith('priceRefreshWorker.js')) {
  startWorker().catch(err => {
    console.error('Fatal worker error:', err);
    process.exit(1);
  });
}
