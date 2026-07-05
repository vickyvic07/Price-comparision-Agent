/**
 * Flipkart adapter.
 *
 * Strategy:
 *   1. SerpApi (google_shopping filtered to flipkart.com) if SERPAPI_KEY is set
 *   2. Playwright headless scrape as fallback
 */
const axios = require('axios');
const BaseAdapter = require('./baseAdapter');

class FlipkartAdapter extends BaseAdapter {
  constructor() {
    super('flipkart', 600);
  }

  async _search(query) {
    if (process.env.SERPAPI_KEY) {
      return this._searchViaSerpApi(query);
    }
    return this._searchViaPlaywright(query);
  }

  async _searchViaSerpApi(query) {
    const { data } = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_shopping',
        q: `${query} site:flipkart.com`,
        gl: 'in',
        hl: 'en',
        api_key: process.env.SERPAPI_KEY,
        num: 10,
      },
      timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 15000,
    });

    const items = data.shopping_results || [];
    return items.map((item) => ({
      name: item.title,
      price: parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')),
      currency: 'INR',
      rating: item.rating,
      reviewCount: item.reviews,
      url: item.link || item.product_link || '',
      image: item.thumbnail,
      deliveryEstimate: item.delivery,
      inStock: true,
    }));
  }

  async _searchViaPlaywright(query) {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 15000,
      });

      // Dismiss login modal if present
      try {
        await page.click('button._2KpZ6l._2doB4z', { timeout: 3000 });
      } catch { /* no modal */ }

      const items = await page.evaluate(() => {
        const results = [];
        // Works for grid-style search results
        document.querySelectorAll('._1AtVbE').forEach((el) => {
          const name = el.querySelector('._4rR01T, .s1Q9rs')?.textContent?.trim();
          const priceText = el.querySelector('._30jeq3')?.textContent?.replace(/[^0-9]/g, '');
          const origPriceText = el.querySelector('._3I9_wc')?.textContent?.replace(/[^0-9]/g, '');
          const discountText = el.querySelector('._3Ay6Sb')?.textContent?.replace(/[^0-9%]/g, '');
          const url = el.querySelector('a._1fQZEK, a.s1Q9rs, a._2rpwqI')?.href;
          const image = el.querySelector('img._396cs4')?.src;
          const ratingText = el.querySelector('._3LWZlK')?.textContent;
          const reviewText = el.querySelector('._2_R_DZ span')?.textContent?.replace(/[^0-9]/g, '');

          if (name && priceText) {
            results.push({
              name,
              price: parseInt(priceText, 10),
              originalPrice: origPriceText ? parseInt(origPriceText, 10) : undefined,
              discountPercent: discountText ? parseInt(discountText, 10) : 0,
              url: url ? (url.startsWith('http') ? url : `https://www.flipkart.com${url}`) : '',
              image,
              rating: ratingText ? parseFloat(ratingText) : undefined,
              reviewCount: reviewText ? parseInt(reviewText, 10) : 0,
            });
          }
        });
        return results.slice(0, 10);
      });

      return items;
    } finally {
      await browser.close();
    }
  }
}

module.exports = new FlipkartAdapter();
