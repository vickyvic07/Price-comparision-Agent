/**
 * Flipkart adapter.
 *
 * Strategy:
 *   1. SerpApi (google_shopping filtered to flipkart.com) if SERPAPI_KEY is set
 *   2. Playwright headless scrape as fallback
 */
const axios = require('axios');
const BaseAdapter = require('./baseAdapter');
const logger = require('../utils/logger');

class FlipkartAdapter extends BaseAdapter {
  constructor() {
    super('flipkart', 600);
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

  _isUUID(key) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key?.trim());
  }

  async _searchViaSerpApi(query) {
    const key = process.env.SERPAPI_KEY;

    if (this._isUUID(key)) {
      // ZenSerp (UUID key) — apikey sent as header
      const { data } = await axios.get('https://app.zenserp.com/api/v2/search', {
        headers: { apikey: key },
        params: { q: `${query} flipkart`, search_type: 'shopping', gl: 'in', hl: 'en', num: 10 },
        timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 15000,
      });
      return (data.shopping_results || data.organic || [])
        .filter((i) => (i.url || i.link || '').includes('flipkart'))
        .map((item) => ({
          name:             item.title || '',
          price:            item.price_parsed?.value ?? (parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0),
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
      params: { engine: 'google_shopping', q: `${query} site:flipkart.com`, gl: 'in', hl: 'en', api_key: key, num: 10 },
      timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 15000,
    });
    return (data.shopping_results || []).map((item) => ({
      name:             item.title,
      price:            parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')),
      currency:         'INR',
      rating:           item.rating,
      reviewCount:      item.reviews,
      url:              item.link || item.product_link || '',
      image:            item.thumbnail,
      deliveryEstimate: item.delivery,
      inStock:          true,
    }));
  }

  async _searchViaPlaywright(query) {
    const { chromium } = require('playwright');
    let browser;
    try {
      browser = await chromium.launch({ headless: true, channel: 'chrome' });
    } catch (err) {
      logger.warn(`Flipkart: Failed to launch with chrome channel, falling back to bundled chromium: ${err.message}`);
      try {
        browser = await chromium.launch({ headless: true });
      } catch (innerErr) {
        logger.warn(`Flipkart: Playwright unavailable — skipping scrape: ${innerErr.message}`);
        return [];
      }
    }

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 15000,
      });
      await page.waitForSelector('a[href*="/p/"]', { timeout: 5000 }).catch(() => {});

      // Dismiss login modal if present
      try {
        await page.click('button._2KpZ6l._2doB4z', { timeout: 2000 });
      } catch { /* no modal */ }

      const items = await page.evaluate(() => {
        const results = [];
        const anchors = Array.from(document.querySelectorAll('a')).filter(a => a.href && a.href.includes('/p/'));
        const seen = new Set();

        anchors.forEach((el) => {
          let url = el.href;
          if (!url) return;
          const cleanUrl = url.split('?')[0];
          if (seen.has(cleanUrl)) return;
          seen.add(cleanUrl);

          let name = el.querySelector('.RG5Slk, .wylgCw, ._4rR01T, .s1Q9rs')?.textContent?.trim();
          if (!name) {
            const img = el.querySelector('img');
            if (img && img.alt) {
              name = img.alt.trim();
            }
          }
          
          let priceText = el.querySelector('.hZ3P6w, .DeU9vF, .Nx9B5C, ._30jeq3')?.textContent;
          if (!priceText) {
            const elements = Array.from(el.querySelectorAll('*'));
            const priceElement = elements.find(e => e.textContent && e.textContent.trim().startsWith('₹') && e.children.length === 0);
            if (priceElement) {
              priceText = priceElement.textContent;
            }
          }
          
          if (priceText) {
            priceText = priceText.replace(/[^0-9]/g, '');
          }

          let origPriceText = el.querySelector('.y3E3mZ, ._3I9_wc')?.textContent?.replace(/[^0-9]/g, '');
          let discountText = el.querySelector('.UkC1Er, ._3Ay6Sb')?.textContent?.replace(/[^0-9%]/g, '');
          let image = el.querySelector('img')?.src;
          
          let ratingText = el.querySelector('.MKiFS6, ._3LWZlK, .CjyrHS')?.textContent?.trim();
          let rating = null;
          if (ratingText) {
            const match = ratingText.match(/^[0-9.]+/);
            if (match) rating = parseFloat(match[0]);
          }

          let reviewText = el.querySelector('.PvbNMB, ._2_R_DZ span')?.textContent?.replace(/[^0-9]/g, '');
          let reviewCount = reviewText ? parseInt(reviewText, 10) : 0;

          if (name && priceText) {
            results.push({
              name,
              price: parseInt(priceText, 10),
              originalPrice: origPriceText ? parseInt(origPriceText, 10) : undefined,
              discountPercent: discountText ? parseInt(discountText, 10) : 0,
              url,
              image,
              rating: rating || undefined,
              reviewCount,
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
