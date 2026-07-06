/**
 * Shopping Search adapter.
 *
 * Supports two APIs auto-detected from the key format:
 *   - SerpApi.com      → 64-char hex key  (SERPAPI_KEY)
 *   - ValueSerp.com    → UUID key         (SERPAPI_KEY)
 *
 * Uses item.source as the real merchant name (e.g. "Flipkart", "Amazon.in").
 */
const axios = require('axios');
const BaseAdapter = require('./baseAdapter');
const logger = require('../utils/logger');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class SerpApiAdapter extends BaseAdapter {
  constructor() {
    super('serpapi', 600);
  }

  _isValueSerp(key) {
    return UUID_RE.test(key?.trim());
  }

  async _search(query) {
    const key = process.env.SERPAPI_KEY;
    if (!key) {
      throw new Error('SERPAPI_KEY not configured.');
    }

    return this._isValueSerp(key)
      ? this._searchValueSerp(query, key)
      : this._searchSerpApi(query, key);
  }

  // ── ValueSerp (UUID key) ────────────────────────────────────────────────
  async _searchValueSerp(query, key) {
    logger.debug(`SerpApi adapter: using ValueSerp for "${query}"`);
    const { data } = await axios.get('https://api.valueserp.com/search', {
      params: {
        api_key:        key,
        q:              query,
        location:       'India',
        google_domain:  'google.co.in',
        gl:             'in',
        hl:             'en',
        search_type:    'shopping',
        num:            20,
      },
      timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 30000,
    });

    const items = data.shopping_results || [];
    return this._normaliseItems(items);
  }

  // ── SerpApi.com (64-char hex key) ────────────────────────────────────────
  async _searchSerpApi(query, key) {
    logger.debug(`SerpApi adapter: using SerpApi.com for "${query}"`);
    const { data } = await axios.get('https://serpapi.com/search', {
      params: {
        engine:  'google_shopping',
        q:       query,
        gl:      'in',
        hl:      'en',
        api_key: key,
        num:     20,
      },
      timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 30000,
    });

    const items = data.shopping_results || [];
    return this._normaliseItems(items);
  }

  _normaliseItems(items) {
    return items.map((item) => {
      const storeName = item.source || item.store || item.seller || '';
      const site      = this._slugify(storeName) || this._inferSiteFromUrl(item.link || '');

      // Price — handle "₹1,24,999" / "$1,234.99" / plain numbers
      const rawPrice = item.extracted_price
        ?? item.price_parsed
        ?? item.price;
      const price = typeof rawPrice === 'number'
        ? rawPrice
        : parseFloat(String(rawPrice || '0').replace(/[^0-9.]/g, '')) || 0;

      return {
        name:             item.title || item.name || '',
        price,
        currency:         'INR',
        rating:           item.rating ?? item.product_rating,
        reviewCount:      item.reviews ?? item.review_count,
        url:              item.link || item.product_link || item.url || '',
        image:            item.thumbnail || item.image,
        deliveryEstimate: item.delivery,
        inStock:          true,
        site,
        storeName,
      };
    }).filter((r) => r.name && r.price > 0);  // drop empty/zero-price results
  }

  _slugify(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\.in$|\.com$|\.co\.in$/, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  _inferSiteFromUrl(url) {
    if (!url) return 'other';
    if (url.includes('amazon'))          return 'amazon';
    if (url.includes('flipkart'))        return 'flipkart';
    if (url.includes('croma'))           return 'croma';
    if (url.includes('reliancedigital')) return 'reliance_digital';
    if (url.includes('vijaysales'))      return 'vijay_sales';
    if (url.includes('tatacliq'))        return 'tata_cliq';
    if (url.includes('myntra'))          return 'myntra';
    if (url.includes('meesho'))          return 'meesho';
    return 'other';
  }
}

module.exports = new SerpApiAdapter();
