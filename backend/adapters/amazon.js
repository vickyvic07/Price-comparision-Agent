/**
 * Amazon adapter.
 *
 * Strategy (in priority order):
 *   1. SerpApi Shopping API (if SERPAPI_KEY is set) — reliable, no browser needed
 *   2. Playwright headless scrape — fallback
 *
 * Both paths return the same NormalizedListing shape via BaseAdapter._normalise().
 */
const axios = require('axios');
const BaseAdapter = require('./baseAdapter');
const logger = require('../utils/logger');

class AmazonAdapter extends BaseAdapter {
  constructor() {
    super('amazon', 600); // 10-min cache
  }

  async _search(query) {
    if (process.env.SERPAPI_KEY) {
      try {
        return await this._searchViaSerpApi(query);
      } catch (err) {
        logger.warn(`${this.siteName}: SerpApi search failed (${err.message}). Falling back to Playwright.`);
      }
    }
    return this._searchViaPlaywright(query);
  }

  // ── SerpApi path ──────────────────────────────────────────────────────────

  _isUUID(key) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key?.trim());
  }

  async _searchViaSerpApi(query) {
    const key = process.env.SERPAPI_KEY;

    if (this._isUUID(key)) {
      // ZenSerp (UUID key) — apikey sent as header
      const { data } = await axios.get('https://app.zenserp.com/api/v2/search', {
        headers: { apikey: key },
        params: { q: `${query} amazon.in`, search_type: 'shopping', gl: 'in', hl: 'en', num: 10 },
        timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 15000,
      });
      return (data.shopping_results || data.organic || [])
        .filter((i) => (i.url || i.link || '').includes('amazon'))
        .map((item) => ({
          name:             item.title || '',
          price:            item.price_parsed?.value ?? this._parsePrice(item.price),
          currency:         'INR',
          rating:           item.stars ?? item.rating,
          reviewCount:      item.reviews,
          url:              item.url || item.link || '',
          image:            item.thumbnail,
          deliveryEstimate: item.delivery,
          inStock:          true,
        }))
        .filter((r) => r.name && r.price > 0);
    }

    // SerpApi.com (64-char hex key)
    const { data } = await axios.get('https://serpapi.com/search', {
      params: { engine: 'google_shopping', q: `${query} site:amazon.in`, gl: 'in', hl: 'en', api_key: key, num: 10 },
      timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 15000,
    });
    return (data.shopping_results || []).map((item) => ({
      name:             item.title,
      price:            this._parsePrice(item.price),
      currency:         'INR',
      rating:           item.rating,
      reviewCount:      item.reviews,
      url:              item.link || item.product_link || '',
      image:            item.thumbnail,
      deliveryEstimate: item.delivery,
      inStock:          true,
    }));
  }

  // ── Playwright path ───────────────────────────────────────────────────────

  async _searchViaPlaywright(query) {
    const { chromium } = require('playwright');
    let browser;
    try {
      browser = await chromium.launch({ headless: true, channel: 'chrome' });
    } catch (err) {
      logger.warn(`Amazon: Failed to launch with chrome channel, falling back to bundled chromium: ${err.message}`);
      try {
        browser = await chromium.launch({ headless: true });
      } catch (innerErr) {
        logger.warn(`Amazon: Playwright unavailable — skipping scrape: ${innerErr.message}`);
        return [];
      }
    }
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
    });
    const page = await context.newPage();

    try {
      const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 15000,
      });

      const items = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('[data-component-type="s-search-result"]').forEach((el) => {
          const name = el.querySelector('h2 span')?.textContent?.trim();
          const priceWhole = el.querySelector('.a-price-whole')?.textContent?.replace(/[^0-9]/g, '');
          const url = el.querySelector('h2 a.a-link-normal')?.href;
          const image = el.querySelector('img.s-image')?.src;
          const ratingText = el.querySelector('.a-icon-alt')?.textContent;
          const rating = ratingText ? parseFloat(ratingText.split(' ')[0]) : null;
          const reviewCount = parseInt(
            el.querySelector('.a-size-base.s-underline-text')?.textContent?.replace(/[^0-9]/g, '') || '0',
            10
          );
          const delivery = el.querySelector('.a-color-secondary.a-size-base .a-text-bold')?.textContent?.trim();
          const badge = el.querySelector('.a-badge-text')?.textContent;
          const inStock = !badge?.toLowerCase().includes('out of stock');

          if (name && priceWhole) {
            results.push({ name, price: parseInt(priceWhole, 10), url, image, rating, reviewCount, delivery, inStock });
          }
        });
        return results.slice(0, 10);
      });

      return items;
    } finally {
      await browser.close();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _parsePrice(str) {
    if (!str) return 0;
    return parseFloat(String(str).replace(/[^0-9.]/g, '')) || 0;
  }
}

module.exports = new AmazonAdapter();
