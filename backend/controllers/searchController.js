const stringSimilarity = require('string-similarity');
const Product = require('../models/Product');
const PriceListing = require('../models/PriceListing');
const PriceHistory = require('../models/PriceHistory');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { cache } = require('../config/redis');
const adapterRegistry = require('../adapters');
const affiliateService = require('../services/affiliateService');
const logger = require('../utils/logger');

/**
 * POST /api/search
 * Body: { query, category?, minPrice?, maxPrice?, currency?, sites? }
 *
 * 1. Check Redis cache
 * 2. Fan-out to all (or requested) site adapters in parallel
 * 3. Normalise & deduplicate results into Product + PriceListing docs
 * 4. Apply affiliate tags to outbound URLs
 * 5. Return ranked comparison
 */
exports.search = asyncHandler(async (req, res, next) => {
  const { query, category, minPrice, maxPrice, currency = 'INR', sites } = req.body;

  const cacheKey = `search:${query}:${JSON.stringify({ category, minPrice, maxPrice, sites })}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return res.status(200).json({ status: 'success', source: 'cache', data: cached });
  }

  // Determine which adapters to run
  const targetSites = sites || Object.keys(adapterRegistry);
  const adapterEntries = targetSites
    .filter((s) => adapterRegistry[s])
    .map((s) => [s, adapterRegistry[s]]);

  if (adapterEntries.length === 0) {
    return next(new AppError('No adapters available for the requested sites.', 400, 'NO_ADAPTERS'));
  }

  // Fan-out scraping — failures are isolated per adapter
  const scraperResults = await Promise.allSettled(
    adapterEntries.map(([site, adapter]) =>
      adapter.search(query).then((results) => ({ site, results }))
    )
  );

  const allListings = [];
  for (const result of scraperResults) {
    if (result.status === 'fulfilled') {
      allListings.push(...result.value.results.map((r) => ({ ...r, site: r.site || result.value.site })));
    } else {
      logger.warn(`Adapter error: ${result.reason?.message}`);
    }
  }

  if (allListings.length === 0) {
    // All adapters failed or returned nothing.
    // Fall back to searching seeded/cached products in the DB so the UI
    // still shows results rather than a blank page.
    logger.warn(`[search] All adapters returned 0 results for "${query}" — falling back to DB search`);

    const dbProducts = await Product.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .lean();

    // Also try a regex fallback if text search returns nothing
    const fallbackProducts = dbProducts.length > 0
      ? dbProducts
      : await Product.find({
          name: { $regex: query.split(' ')[0], $options: 'i' },
        }).limit(20).lean();

    if (fallbackProducts.length === 0) {
      return res.status(200).json({
        status: 'success',
        source: 'db_fallback',
        data: { products: [], message: `No results found for "${query}". Try a different search term.` },
      });
    }

    const fallbackResponse = [];
    for (const product of fallbackProducts) {
      const listings = await PriceListing.find({ productId: product._id }).sort({ price: 1 }).lean();
      if (listings.length) {
        fallbackResponse.push({ product, listings });
      }
    }

    return res.status(200).json({
      status: 'success',
      source: 'db_fallback',
      data: { products: fallbackResponse, query, totalResults: fallbackResponse.length },
    });
  }

  // ── Normalise & match products ──────────────────────────────────────────
  const normalizedQuery = query.toLowerCase().trim();
  const productMap = new Map(); // normalizedName -> { product, listings[] }

  for (const listing of allListings) {
    // Price filters
    if (minPrice != null && listing.price < minPrice) continue;
    if (maxPrice != null && listing.price > maxPrice) continue;

    const normalizedName = listing.name.toLowerCase().trim();

    // Find best matching existing group
    const existingKeys = [...productMap.keys()];
    let bestKey = null;
    if (existingKeys.length > 0) {
      const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(
        normalizedName,
        existingKeys
      );
      if (bestMatch.rating >= 0.7) bestKey = existingKeys[bestMatchIndex];
    }

    const key = bestKey || normalizedName;
    if (!productMap.has(key)) {
      productMap.set(key, { name: listing.name, normalizedName: key, listings: [] });
    }
    productMap.get(key).listings.push(listing);
  }

  // ── Upsert Products & PriceListings into DB ─────────────────────────────
  const responseProducts = [];

  for (const [, group] of productMap) {
    // Find or create Product doc
    let product = await Product.findOne({ normalizedName: group.normalizedName });
    if (!product) {
      product = await Product.create({
        name: group.name,
        normalizedName: group.normalizedName,
        category: category || group.listings[0]?.category,
        images: group.listings.flatMap((l) => l.images || []).slice(0, 5),
      });
    }

    const enrichedListings = [];
    for (const l of group.listings) {
      // Upsert PriceListing (one per product+site)
      const listingDoc = await PriceListing.findOneAndUpdate(
        { productId: product._id, site: l.site },
        {
          storeName: l.storeName || '',
          price: l.price,
          currency: l.currency || currency,
          originalPrice: l.originalPrice,
          discountPercent: l.discountPercent || 0,
          rating: l.rating,
          reviewCount: l.reviewCount || 0,
          deliveryEstimate: l.deliveryEstimate,
          inStock: l.inStock !== false,
          url: affiliateService.appendTag(l.url, l.site),
          lastCheckedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      enrichedListings.push(listingDoc);

      // Save history snapshot if this is a new price point or first check of the day
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const existingHistory = await PriceHistory.findOne({
          productId: product._id,
          site: l.site,
          timestamp: { $gte: todayStart }
        });

        if (!existingHistory || existingHistory.price !== l.price) {
          await PriceHistory.create({
            productId: product._id,
            site: l.site,
            price: l.price,
            currency: l.currency || currency,
            timestamp: new Date()
          });
        }
      } catch (historyErr) {
        logger.warn(`Failed to write initial PriceHistory: ${historyErr.message}`);
      }
    }

    responseProducts.push({
      product,
      listings: enrichedListings.sort((a, b) => a.price - b.price),
    });
  }

  // Sort product groups by their best (lowest) price
  responseProducts.sort((a, b) => a.listings[0]?.price - b.listings[0]?.price);

  const responseData = { products: responseProducts, query, totalResults: responseProducts.length };

  // Cache for 10 minutes
  await cache.set(cacheKey, responseData, 600);

  res.status(200).json({ status: 'success', source: 'live', data: responseData });
});
