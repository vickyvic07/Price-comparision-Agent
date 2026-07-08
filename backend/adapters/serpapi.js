/**
 * Shopping Search adapter — SerpApi.com
 *
 * Uses Google Shopping engine via SerpApi.
 * Returns structured results with thumbnail images, prices, ratings.
 */
const axios = require('axios');
const BaseAdapter = require('./baseAdapter');
const logger = require('../utils/logger');

class SerpApiAdapter extends BaseAdapter {
  constructor() {
    super('serpapi', 600);
  }

  async _search(query) {
    const key = process.env.SERPAPI_KEY;
    if (!key) throw new Error('SERPAPI_KEY not configured.');
    return this._searchSerpApi(query, key);
  }

  async _searchSerpApi(query, key) {
    logger.debug(`SerpApi adapter: searching for "${query}"`);
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
    return items.map((item) => {
      const storeName = item.source || item.store || '';
      const site      = this._inferSiteFromUrl(item.link || item.product_link || '');

      const price =
        typeof item.extracted_price === 'number'
          ? item.extracted_price
          : parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0;

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
    }).filter((r) => r.name && r.price > 0);
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
