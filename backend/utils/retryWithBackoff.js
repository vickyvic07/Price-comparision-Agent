const logger = require('./logger');

/**
 * Retry an async function with exponential back-off.
 *
 * @param {Function} fn       - async function to retry
 * @param {number}   attempts - max attempts (default from env or 3)
 * @param {number}   delay    - initial delay in ms (default from env or 2000)
 * @param {string}   label    - label for log messages
 */
const retryWithBackoff = async (
  fn,
  attempts = parseInt(process.env.SCRAPER_RETRY_ATTEMPTS, 10) || 3,
  delay = parseInt(process.env.SCRAPER_RETRY_DELAY, 10) || 2000,
  label = 'operation'
) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        const wait = delay * Math.pow(2, attempt - 1);
        logger.warn(`${label}: attempt ${attempt}/${attempts} failed — retrying in ${wait}ms. Error: ${err.message}`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastError;
};

module.exports = retryWithBackoff;
