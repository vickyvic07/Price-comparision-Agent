/**
 * Croma adapter — Playwright headless scrape.
 */
const BaseAdapter = require('./baseAdapter');

class CromaAdapter extends BaseAdapter {
  constructor() {
    super('croma', 900); // 15-min cache
  }

  async _search(query) {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      const url = `https://www.croma.com/searchB?q=${encodeURIComponent(query)}%3Arelevance`;
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 15000,
      });
      await page.waitForSelector('.product-item', { timeout: 8000 }).catch(() => {});

      const items = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('.product-item').forEach((el) => {
          const name = el.querySelector('.product-title')?.textContent?.trim();
          const priceText = el.querySelector('.amount')?.textContent?.replace(/[^0-9]/g, '');
          const url = el.querySelector('a.product-title')?.href;
          const image = el.querySelector('.product-img img')?.src;
          const ratingText = el.querySelector('.rating-count')?.textContent?.replace(/[^0-9.]/g, '');

          if (name && priceText) {
            results.push({
              name,
              price: parseInt(priceText, 10),
              url: url || '',
              image,
              rating: ratingText ? parseFloat(ratingText) : undefined,
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

module.exports = new CromaAdapter();
