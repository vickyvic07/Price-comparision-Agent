/**
 * Base class for all site adapters.
 * Provides shared helpers: cache check, rate limiting, retry, result normalisation.
 */
const { cache } = require('../config/redis');
const retryWithBackoff = require('../utils/retryWithBackoff');
const { throttle } = require('../utils/scraperRateLimiter');
const logger = require('../utils/logger');

const ALLOWED_DOMAINS = [
  'amazon.in',
  'flipkart.com',
  'croma.com',
  'reliancedigital.in',
  'reliancedigital.co.in',
  'vijaysales.com',
  'meesho.com',
  'myntra.com',
  'ajio.com',
  'tatacliq.com',
  'snapdeal.com',
  'shopclues.com',
  'ebay.com',
  'walmart.com',
  'aliexpress.com'
];

const ALLOWED_SLUGS = [
  'amazon',
  'flipkart',
  'croma',
  'reliance_digital',
  'vijay_sales',
  'meesho',
  'myntra',
  'ajio',
  'tata_cliq',
  'tatacliq',
  'snapdeal',
  'shopclues',
  'ebay',
  'walmart',
  'aliexpress'
];

const isAllowedSite = (url = '', site = '') => {
  // Always allow if site slug is a known retailer
  if (site && site !== 'other') return true;

  const cleanUrl = url.toLowerCase();

  // Block only truly junk sources — empty URLs or obvious non-product pages
  if (!cleanUrl) return false;

  // Allow everything else — SerpApi returns google.com/shopping redirect
  // URLs that are perfectly valid product links
  return true;
};

class BaseAdapter {
  /**
   * @param {string} siteName - e.g. 'amazon', 'flipkart'
   * @param {number} cacheTtl - seconds to cache search results (default 10 min)
   */
  constructor(siteName, cacheTtl = 600) {
    this.siteName = siteName;
    this.cacheTtl = cacheTtl;
  }

  /**
   * Public search method — wraps _search with cache, rate-limit, and retry.
   * @param {string} query
   * @returns {Promise<NormalizedListing[]>}
   */
  async search(query) {
    const cacheKey = `adapter:${this.siteName}:${query.toLowerCase().trim()}`;

    // 1. Cache check
    const cached = await cache.get(cacheKey);
    if (cached) {
      logger.debug(`${this.siteName}: cache hit for "${query}"`);
      return cached;
    }

    // 2. Rate limit + retry
    await throttle(this.siteName);

    const results = await retryWithBackoff(
      () => this._search(query),
      parseInt(process.env.SCRAPER_RETRY_ATTEMPTS, 10) || 3,
      parseInt(process.env.SCRAPER_RETRY_DELAY, 10) || 2000,
      `${this.siteName}.search("${query}")`
    );

    // 3. Normalise + filter + cache
    const normalised = results
      .map((r) => this._normalise(r))
      .filter((r) => isAllowedSite(r.url, r.site));
    await cache.set(cacheKey, normalised, this.cacheTtl);

    logger.info(`${this.siteName}: ${normalised.length} results for "${query}"`);
    return normalised;
  }

  /**
   * Override in subclass — performs the actual HTTP / browser scrape.
   * @param {string} _query
   * @returns {Promise<RawListing[]>}
   */
  async _search(_query) {
    throw new Error(`${this.siteName} adapter must implement _search()`);
  }

  /**
   * Override in subclass if the raw shape differs.
   * Returns a NormalizedListing.
   */
  _normalise(raw) {
    const site = raw.site || this.siteName;
    return {
      name: raw.name || raw.title || '',
      price: Number(raw.price) || 0,
      originalPrice: raw.originalPrice ? Number(raw.originalPrice) : undefined,
      discountPercent: raw.discountPercent ? Number(raw.discountPercent) : 0,
      currency: raw.currency || 'INR',
      rating: raw.rating ? Number(raw.rating) : undefined,
      reviewCount: raw.reviewCount ? Number(raw.reviewCount) : 0,
      deliveryEstimate: raw.deliveryEstimate || raw.delivery || undefined,
      inStock: raw.inStock !== false,
      url: raw.url || raw.link || '',
      images: raw.images || (raw.image ? [raw.image] : []),
      category: raw.category || undefined,
      site,
      storeName: raw.storeName || site.charAt(0).toUpperCase() + site.slice(1).replace(/_/g, ' '),
    };
  }
}

module.exports = BaseAdapter;
