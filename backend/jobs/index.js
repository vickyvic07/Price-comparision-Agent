/**
 * Job scheduler — registers all cron jobs.
 *
 * Uses node-cron for lightweight scheduling.
 * If you need a distributed queue (multiple worker instances),
 * swap the cron calls for Bull queue definitions here without
 * changing the job logic files.
 */
const cron = require('node-cron');
const { runPriceCheck } = require('./priceCheckJob');
const { runReviewRefresh } = require('./reviewRefreshJob');
const logger = require('../utils/logger');

// ─── Hourly: re-check prices for all wishlisted products ─────────────────────
// Runs at minute 0 of every hour: "0 * * * *"
cron.schedule('0 * * * *', async () => {
  try {
    await runPriceCheck();
  } catch (err) {
    logger.error(`[PriceCheckJob] Unhandled error: ${err.message}`);
  }
});

// ─── Daily: refresh review summaries + clean stale listings ──────────────────
// Runs every day at 03:00 UTC: "0 3 * * *"
cron.schedule('0 3 * * *', async () => {
  try {
    await runReviewRefresh();
  } catch (err) {
    logger.error(`[ReviewRefreshJob] Unhandled error: ${err.message}`);
  }
});

logger.info('Background jobs scheduled: PriceCheck (hourly), ReviewRefresh (daily 03:00)');

module.exports = { runPriceCheck, runReviewRefresh };
