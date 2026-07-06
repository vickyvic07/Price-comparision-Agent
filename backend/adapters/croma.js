/**
 * Croma adapter — Playwright headless scrape.
 */
const BaseAdapter = require('./baseAdapter');
const logger = require('../utils/logger');

class CromaAdapter extends BaseAdapter {
  constructor() {
    super('croma', 900); // 15-min cache
  }

  async _search(query) {
    const { chromium } = require('playwright');
    let browser;
    try {
      browser = await chromium.launch({ headless: true, channel: 'chrome' });
    } catch (err) {
      logger.warn(`Croma: Failed to launch with chrome channel, falling back to bundled chromium: ${err.message}`);
      try {
        browser = await chromium.launch({ headless: true });
      } catch (innerErr) {
        logger.warn(`Croma: Playwright unavailable — skipping scrape: ${innerErr.message}`);
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
      const url = `https://www.croma.com/searchB?q=${encodeURIComponent(query)}%3Arelevance`;
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 15000,
      });
      await page.waitForSelector('.product-item', { timeout: 8000 }).catch(() => {});

      const items = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('.product-item').forEach((el) => {
          const nameEl = el.querySelector('.product-title');
          const name = nameEl?.textContent?.trim();
          
          const anchor = el.querySelector('.product-title a') || el.querySelector('a');
          const url = anchor ? anchor.href : '';

          const priceEl = el.querySelector('[data-testid="new-price"]') || el.querySelector('.new-price .amount') || el.querySelector('.amount');
          const priceText = priceEl?.textContent?.replace(/[^0-9]/g, '');

          const origPriceEl = el.querySelector('[data-testid="old-price"]') || el.querySelector('.old-price .amount');
          const origPriceText = origPriceEl?.textContent?.replace(/[^0-9]/g, '');
          
          const discountEl = el.querySelector('.discount');
          const discountText = discountEl?.textContent?.replace(/[^0-9%]/g, '');

          const imgEl = el.querySelector('.product-img img');
          const image = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || '') : '';

          const ratingEl = el.querySelector('.rating-text') || el.querySelector('.rating-count') || el.querySelector('.cp-rating');
          const ratingText = ratingEl?.textContent?.replace(/[^0-9.]/g, '');

          const deliveryEl = el.querySelector('.delivery-text-msg');
          const delivery = deliveryEl?.textContent?.trim();

          if (name && priceText) {
            results.push({
              name,
              price: parseInt(priceText, 10),
              originalPrice: origPriceText ? parseInt(origPriceText, 10) : undefined,
              discountPercent: discountText ? parseInt(discountText, 10) : 0,
              url: url || '',
              image,
              rating: ratingText ? parseFloat(ratingText) : undefined,
              deliveryEstimate: delivery,
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
