/**
 * Per-site token-bucket rate limiter for outbound scraping.
 * Each site gets its own queue to prevent hammering.
 *
 * Usage:
 *   await scraperRateLimiter.throttle('amazon');
 *   // now safe to make the request
 */
const logger = require('./logger');

// Minimum delay between consecutive requests per site (ms)
const SITE_DELAYS = {
  amazon: 1500,
  flipkart: 1200,
  croma: 1000,
  reliance_digital: 1000,
  serpapi: 500,
  default: 1000,
};

const lastRequestTime = new Map(); // site -> timestamp

const throttle = async (site) => {
  const delay = SITE_DELAYS[site] || SITE_DELAYS.default;
  const last = lastRequestTime.get(site) || 0;
  const elapsed = Date.now() - last;

  if (elapsed < delay) {
    const wait = delay - elapsed;
    logger.debug(`Rate limiter: waiting ${wait}ms before next ${site} request`);
    await new Promise((r) => setTimeout(r, wait));
  }

  lastRequestTime.set(site, Date.now());
};

module.exports = { throttle };
