/**
 * Daily Review Refresh Job
 *
 * 1. Finds all products whose reviewSummary is older than 7 days (or absent)
 * 2. Regenerates the summary via OpenAI
 * 3. Cleans up PriceListings not refreshed in the last 48 hours (stale listings)
 */
const Product = require('../models/Product');
const PriceListing = require('../models/PriceListing');
const reviewSummaryService = require('../services/reviewSummaryService');
const logger = require('../utils/logger');

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_HOURS = 48;

const runReviewRefresh = async () => {
  logger.info('[ReviewRefreshJob] Starting daily review refresh');

  const cutoff = new Date(Date.now() - ONE_WEEK_MS);

  // Find products needing a summary refresh
  const products = await Product.find({
    $or: [
      { 'reviewSummary.generatedAt': { $lt: cutoff } },
      { 'reviewSummary.generatedAt': { $exists: false } },
    ],
  }).lean();

  logger.info(`[ReviewRefreshJob] ${products.length} products need review refresh`);

  let refreshed = 0;
  let errors = 0;

  for (const product of products) {
    try {
      const listings = await PriceListing.find({ productId: product._id }).lean();
      const summary = await reviewSummaryService.generateSummary(product, listings);

      await Product.findByIdAndUpdate(product._id, {
        reviewSummary: { ...summary, generatedAt: new Date() },
      });

      refreshed++;

      // Small delay to avoid hammering OpenAI rate limits
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      logger.error(`[ReviewRefreshJob] Failed for product ${product._id}: ${err.message}`);
      errors++;
    }
  }

  logger.info(`[ReviewRefreshJob] Review refresh done — ${refreshed} updated, ${errors} errors`);

  // ── Clean stale listings ────────────────────────────────────────────────
  const staleCutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
  const deleteResult = await PriceListing.deleteMany({
    lastCheckedAt: { $lt: staleCutoff },
  });

  logger.info(`[ReviewRefreshJob] Cleaned ${deleteResult.deletedCount} stale price listings`);
};

module.exports = { runReviewRefresh };
