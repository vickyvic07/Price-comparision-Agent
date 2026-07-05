/**
 * Affiliate Service — appends site-specific affiliate query parameters
 * to outbound product URLs.
 *
 * Config is driven by /config/affiliateTags.json so adding a new retailer
 * requires no code changes.
 */
const affiliateTags = require('../config/affiliateTags.json');
const logger = require('../utils/logger');

/**
 * Append the configured affiliate tag to a product URL.
 *
 * @param {string} url  - Original product URL
 * @param {string} site - Site key (must match a key in affiliateTags.json)
 * @returns {string}    - URL with affiliate parameter appended
 */
const appendTag = (url, site) => {
  if (!url || !site) return url || '';

  const config = affiliateTags[site.toLowerCase()];
  if (!config) return url; // no affiliate tag configured for this site

  try {
    const parsed = new URL(url);
    parsed.searchParams.set(config.param, config.value);
    return parsed.toString();
  } catch (err) {
    // Invalid URL — return original rather than crashing
    logger.warn(`affiliateService: could not parse URL "${url}" for site "${site}": ${err.message}`);
    return url;
  }
};

/**
 * Build a clean affiliate URL given a base URL and site.
 * Removes existing affiliate params first to avoid double-tagging.
 */
const buildAffiliateUrl = (url, site) => {
  if (!url || !site) return url || '';

  const config = affiliateTags[site.toLowerCase()];
  if (!config) return url;

  try {
    const parsed = new URL(url);
    // Remove any existing tag with the same param name
    parsed.searchParams.delete(config.param);
    parsed.searchParams.set(config.param, config.value);
    return parsed.toString();
  } catch {
    return url;
  }
};

/**
 * Get the configured affiliate tag for a site (for debugging/admin).
 */
const getTagConfig = (site) => affiliateTags[site?.toLowerCase()] || null;

module.exports = { appendTag, buildAffiliateUrl, getTagConfig };
