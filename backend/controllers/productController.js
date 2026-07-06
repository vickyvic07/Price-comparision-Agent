const Product = require('../models/Product');
const PriceListing = require('../models/PriceListing');
const PriceHistory = require('../models/PriceHistory');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { cache } = require('../config/redis');
const reviewSummaryService = require('../services/reviewSummaryService');

// ─── GET /api/products/:id/history ──────────────────────────────────────────

exports.getPriceHistory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { site, days = 30 } = req.query;

  const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

  const filter = { productId: id, timestamp: { $gte: since } };
  if (site) filter.site = site.toLowerCase();

  const history = await PriceHistory.find(filter).sort({ timestamp: 1 }).lean();

  if (history.length === 0) {
    // Verify product exists first
    const product = await Product.findById(id).lean();
    if (!product) return next(new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND'));
  }

  // Group by site for charting
  const bySite = history.reduce((acc, entry) => {
    if (!acc[entry.site]) acc[entry.site] = [];
    acc[entry.site].push({ timestamp: entry.timestamp, price: entry.price, currency: entry.currency });
    return acc;
  }, {});

  res.status(200).json({
    status: 'success',
    data: { productId: id, days: Number(days), bySite },
  });
});

// ─── GET /api/products/:id/best-value ────────────────────────────────────────

/**
 * Weighted scoring formula:
 *   score = (1 - normPrice)*0.5 + normRating*0.25 + normReviews*0.15 + normDelivery*0.10
 *
 * Lower price → higher score; higher rating/reviews → higher score.
 */
exports.getBestValue = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const product = await Product.findById(id).lean();
  if (!product) return next(new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND'));

  const listings = await PriceListing.find({ productId: id, inStock: true }).lean();
  if (listings.length === 0) {
    return res.status(200).json({
      status: 'success',
      data: { product, rankedListings: [], message: 'No in-stock listings found.' },
    });
  }

  // Normalisation helpers
  const prices = listings.map((l) => l.price);
  const ratings = listings.map((l) => l.rating || 0);
  const reviews = listings.map((l) => l.reviewCount || 0);

  const minVal = (arr) => Math.min(...arr);
  const maxVal = (arr) => Math.max(...arr);
  const norm = (val, min, max) => (max === min ? 0.5 : (val - min) / (max - min));

  const DELIVERY_SCORE = {
    same: 1.0,
    'next day': 0.9,
    '1-2': 0.75,
    '2-3': 0.6,
    '3-5': 0.45,
    '5-7': 0.3,
    '7+': 0.1,
    default: 0.5,
  };

  const deliveryScore = (estimate) => {
    if (!estimate) return DELIVERY_SCORE.default;
    const lower = estimate.toLowerCase();
    for (const [key, val] of Object.entries(DELIVERY_SCORE)) {
      if (lower.includes(key)) return val;
    }
    return DELIVERY_SCORE.default;
  };

  const minPrice = minVal(prices);
  const maxPrice = maxVal(prices);
  const minRating = minVal(ratings);
  const maxRating = maxVal(ratings);
  const minReviews = minVal(reviews);
  const maxReviews = maxVal(reviews);

  const scored = listings.map((l) => {
    const normPrice = 1 - norm(l.price, minPrice, maxPrice); // low price → high score
    const normRating = norm(l.rating || 0, minRating, maxRating);
    const normReviews = norm(l.reviewCount || 0, minReviews, maxReviews);
    const normDelivery = deliveryScore(l.deliveryEstimate);

    const score = normPrice * 0.5 + normRating * 0.25 + normReviews * 0.15 + normDelivery * 0.1;

    return { ...l, score: Math.round(score * 100) / 100 };
  });

  scored.sort((a, b) => b.score - a.score);

  res.status(200).json({
    status: 'success',
    data: { product, rankedListings: scored },
  });
});

// ─── GET /api/products/:id/reviews-summary ───────────────────────────────────

exports.getReviewsSummary = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) return next(new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND'));

  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const summaryText = product.reviewSummary?.summary || '';
  const containsSerpApi = summaryText.toLowerCase().includes('serpapi');
  const summaryFresh =
    product.reviewSummary?.generatedAt &&
    !containsSerpApi &&
    Date.now() - new Date(product.reviewSummary.generatedAt).getTime() < ONE_WEEK_MS;

  if (summaryFresh) {
    return res.status(200).json({
      status: 'success',
      source: 'cache',
      data: { productId: id, ...product.reviewSummary },
    });
  }

  // Generate fresh summary via LLM
  const listings = await PriceListing.find({ productId: id }).lean();
  const summary = await reviewSummaryService.generateSummary(product, listings);

  // Persist to product doc
  product.reviewSummary = { ...summary, generatedAt: new Date() };
  await product.save();

  res.status(200).json({
    status: 'success',
    source: 'generated',
    data: { productId: id, ...summary },
  });
});

// ─── GET /api/products  — featured products for homepage ────────────────────

exports.getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 12, 30);

  // Pull products that have at least one listing, sorted by most recently updated listing
  const listings = await PriceListing.find({ inStock: true })
    .sort({ lastCheckedAt: -1 })
    .limit(limit * 3) // over-fetch to allow dedup
    .populate('productId', 'name normalizedName category brand images')
    .lean();

  // Deduplicate by product — keep cheapest listing per product
  const seen = new Map();
  for (const l of listings) {
    const pid = l.productId?._id?.toString();
    if (!pid) continue;
    if (!seen.has(pid) || l.price < seen.get(pid).price) {
      seen.set(pid, { ...l });
    }
    if (seen.size >= limit) break;
  }

  const featured = [...seen.values()].map((l) => ({
    product:    l.productId,
    bestListing: {
      _id:             l._id,
      site:            l.site,
      storeName:       l.storeName || '',
      price:           l.price,
      originalPrice:   l.originalPrice,
      discountPercent: l.discountPercent,
      rating:          l.rating,
      reviewCount:     l.reviewCount,
      deliveryEstimate:l.deliveryEstimate,
      url:             l.url,
      currency:        l.currency,
    },
  }));

  res.status(200).json({ status: 'success', data: { products: featured } });
});

// ─── GET /api/products/:id ───────────────────────────────────────────────────

exports.getProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) return next(new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND'));

  let listings = await PriceListing.find({ productId: id }).lean();

  // Self-healing: if a product has no listings, or if they are older than 10 minutes,
  // trigger a search to fetch fresh listings and create history points
  const TEN_MIN_MS = 10 * 60 * 1000;
  const needsUpdate = listings.length === 0 || 
    (listings[0] && (Date.now() - new Date(listings[0].lastCheckedAt).getTime() > TEN_MIN_MS));

  if (needsUpdate) {
    const logger = require('../utils/logger');
    try {
      logger.info(`Product detail self-healing: updating listings for "${product.name}"`);
      
      const adapterRegistry = require('../adapters');
      const affiliateService = require('../services/affiliateService');

      const targetSites = Object.keys(adapterRegistry);
      const adapterEntries = targetSites
        .filter((s) => adapterRegistry[s])
        .map((s) => [s, adapterRegistry[s]]);

      const scraperResults = await Promise.allSettled(
        adapterEntries.map(([site, adapter]) =>
          adapter.search(product.name).then((results) => ({ site, results }))
        )
      );

      const allListings = [];
      for (const result of scraperResults) {
        if (result.status === 'fulfilled') {
          allListings.push(...result.value.results.map((r) => ({ ...r, site: r.site || result.value.site })));
        }
      }

      if (allListings.length > 0) {
        // Clear any old listings first
        await PriceListing.deleteMany({ productId: id });

        const enrichedListings = [];
        for (const l of allListings) {
          const listingDoc = await PriceListing.findOneAndUpdate(
            { productId: id, site: l.site },
            {
              storeName: l.storeName || '',
              price: l.price,
              currency: l.currency || 'INR',
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
          enrichedListings.push(listingDoc.toObject ? listingDoc.toObject() : listingDoc);

          // Write price history point
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const existingHistory = await PriceHistory.findOne({
            productId: id,
            site: l.site,
            timestamp: { $gte: todayStart }
          });

          if (!existingHistory || existingHistory.price !== l.price) {
            await PriceHistory.create({
              productId: id,
              site: l.site,
              price: l.price,
              currency: l.currency || 'INR',
              timestamp: new Date()
            });
          }
        }
        listings = enrichedListings;
      }
    } catch (updateErr) {
      logger.error(`Product self-healing failed for ${id}: ${updateErr.message}`);
    }
  }

  res.status(200).json({
    status: 'success',
    data: { product, listings },
  });
});
