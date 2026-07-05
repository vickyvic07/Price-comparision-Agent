/**
 * SerpApi adapter — aggregated Google Shopping fallback.
 * Returns results from multiple retailers at once.
 *
 * Key fix: uses item.source (the actual merchant name from Google Shopping,
 * e.g. "Flipkart", "Amazon.in", "Croma") rather than inferring from the URL.
 * The normalised `site` key stored in DB is the slug; `storeName` is the
 * human-readable label passed through to the frontend.
 */
const axios = require('axios');
const BaseAdapter = require('./baseAdapter');
const AppError = require('../utils/AppError');

class SerpApiAdapter extends BaseAdapter {
  constructor() {
    super('serpapi', 600);
  }

  async _search(query) {
    if (!process.env.SERPAPI_KEY) {
      throw new AppError('SERPAPI_KEY not configured.', 503, 'SERPAPI_MISSING');
    }

    const { data } = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_shopping',
        q: query,
        gl: 'in',
        hl: 'en',
        api_key: process.env.SERPAPI_KEY,
        num: 20,
      },
      timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 15000,
    });

    const items = data.shopping_results || [];
    return items.map((item) => {
      // item.source is the actual merchant name Google Shopping returns
      // e.g. "Flipkart", "Amazon.in", "Croma", "Vijay Sales"
      const storeName = item.source || '';
      const site      = this._slugify(storeName) || this._inferSiteFromUrl(item.link || '');

      return {
        name:             item.title,
        price:            parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')),
        currency:         'INR',
        rating:           item.rating,
        reviewCount:      item.reviews,
        url:              item.link || item.product_link || '',
        image:            item.thumbnail,
        deliveryEstimate: item.delivery,
        inStock:          true,
        site,
        storeName,        // preserved for display — e.g. "Amazon.in", "Vijay Sales"
      };
    });
  }

  /**
   * Convert a merchant display name to a lowercase slug.
   * "Amazon.in"     → "amazon"
   * "Vijay Sales"   → "vijay_sales"
   * "Croma"         → "croma"
   */
  _slugify(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\.in$|\.com$/, '')   // strip TLDs
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  /** Fallback when source is absent */
  _inferSiteFromUrl(url) {
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
