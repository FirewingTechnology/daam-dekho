import app from './app.js';
import { CONFIG, refreshStaleBatch } from './services/priceRefreshService.js';

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  // Safe in-process scheduler if enabled
  if (CONFIG.enabled && process.env.PRICE_REFRESH_EMBEDDED_SCHEDULER === 'true') {
    const intervalMs = CONFIG.intervalMinutes * 60 * 1000;
    console.log(`⏱ Embedded price refresh scheduler enabled (interval: ${CONFIG.intervalMinutes}m, batch: ${CONFIG.batchSize})`);
    setInterval(() => {
      refreshStaleBatch().catch(err => console.error('[SCHEDULER_ERROR]', err.message));
    }, intervalMs);
  }
});
