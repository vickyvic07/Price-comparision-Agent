/**
 * Shopping Search adapter — ZenSerp / SerpApi / ValueSerp
 *
 * Auto-detects key format:
 *   UUID  (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) → ZenSerp  (app.zenserp.com)
 *   UUID  → also tried as ValueSerp              (api.valueserp.com)
 *   64-char hex                                  → SerpApi  (serpapi.com)
 */
const axios = require('axios');
const BaseAdapter = require('./baseAdapter');
const logger = require('../utils/logger');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class SerpApiAdapter extends BaseAdapter {
  constructor() {
    super('serpapi', 600);
  }

  _isUUID(key) {
    return UUID_RE.test(key?.trim());
  }

  async _search(query) {
    const key = process.env.SERPAPI_KEY;
    if (!key) throw new Error('SERPAPI_KEY not configured.');

    if (this._isUUID(key)) {
      return this._searchZenSerp(query, key);
    }
    return this._searchSerpApi(query, key);
  }

  // ── ZenSerp (UUID key, apikey header) ──────────────────────────────────────
  async _searchZenSerp(query, key) {
    logger.debug(`SerpApi adapter: using ZenSerp for "${query}"`);
    const { data } = await axios.get('https://app.zenserp.com/api/v2/search', {
      headers: { apikey: key },
      params: {
        q:           `${query}`,
        search_type: 'shopping',
        gl:          'in',
        hl:          'en',
        num:         20,
      },
      timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 30000,
    });

    // ZenSerp shopping returns results under "shopping_results" or "organic"
    const items = data.shopping_results || data.organic || [];
    return this._normaliseZenSerpItems(items);
  }

  _normaliseZenSerpItems(items) {
    return items
      .map((item) => {
        const storeName = item.source || item.merchant || '';
        const site = this._inferSiteFromUrl(item.url || item.link || '');

        const rawPrice =
          item.price_parsed?.value ??
          item.extracted_price ??
          item.price;

        const price =
          typeof rawPrice === 'number'
            ? rawPrice
            : parseFloat(String(rawPrice || '0').replace(/[^0-9.]/g, '')) || 0;

        return {
          name:             item.title || '',
          price,
          currency:         'INR',
          rating:           item.stars ?? item.rating,
          reviewCount:      item.reviews ?? item.review_count,
          url:              item.url || item.link || '',
          image:            item.thumbnail || item.image,
          deliveryEstimate: item.delivery,
          inStock:          true,
          site,
          storeName,
        };
      })
      .filter((r) => r.name && r.price > 0);
  }

  // ── SerpApi.com (64-char hex key) ─────────────────────────────────────────
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
    return items
      .map((item) => {
        const storeName = item.source || item.store || '';
        const site = this._slugify(storeName) || this._inferSiteFromUrl(item.link || '');
        const rawPrice = item.extracted_price ?? item.price_parsed ?? item.price;
        const price =
          typeof rawPrice === 'number'
            ? rawPrice
            : parseFloat(String(rawPrice || '0').replace(/[^0-9.]/g, '')) || 0;

        return {
          name:             item.title || '',
          price,
          currency:         'INR',
          rating:           item.rating,
          reviewCount:      item.reviews,
          url:              item.link || item.product_link || '',
          image:            item.thumbnail,
          deliveryEstimate: item.delivery,
          inStock:          true,
          site,
          storeName,
        };
      })
      .filter((r) => r.name && r.price > 0);
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
