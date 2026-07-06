/**
 * Hourly Price Check Job
 *
 * For every active wishlist item:
 *   1. Re-runs the site adapter for the product
 *   2. Saves a PriceHistory snapshot
 *   3. Updates the PriceListing doc
 *   4. Triggers an Alert + email if the new price ≤ threshold
 */
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const PriceListing = require('../models/PriceListing');
const PriceHistory = require('../models/PriceHistory');
const Alert = require('../models/Alert');
const emailService = require('../services/emailService');
const affiliateService = require('../services/affiliateService');
const adapterRegistry = require('../adapters');
const logger = require('../utils/logger');

const runPriceCheck = async () => {
  logger.info('[PriceCheckJob] Starting hourly price check');

  const activeItems = await Wishlist.find({ isActive: true })
    .populate('userId', 'email name')
    .populate('productId')
    .lean();

  logger.info(`[PriceCheckJob] Processing ${activeItems.length} wishlist items`);

  let updated = 0;
  let alertsTriggered = 0;

  for (const item of activeItems) {
    const product = item.productId;
    if (!product) continue;

    // Run all enabled adapters for this product
    for (const [site, adapter] of Object.entries(adapterRegistry)) {
      try {
        const results = await adapter.search(product.name);
        if (!results.length) continue;

        // Pick the best (cheapest) matching result from this adapter
        const match = results.sort((a, b) => a.price - b.price)[0];

        // Save history snapshot
        await PriceHistory.create({
          productId: product._id,
          site,
          price: match.price,
          currency: match.currency || 'INR',
        });

        // Update PriceListing
        const listing = await PriceListing.findOneAndUpdate(
          { productId: product._id, site },
          {
            price: match.price,
            originalPrice: match.originalPrice,
            discountPercent: match.discountPercent || 0,
            rating: match.rating,
            reviewCount: match.reviewCount || 0,
            deliveryEstimate: match.deliveryEstimate,
            inStock: match.inStock !== false,
            url: affiliateService.appendTag(match.url, site),
            lastCheckedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        updated++;

        // ── Alert check ────────────────────────────────────────────────────
        if (match.price <= item.thresholdPrice) {
          // Prevent duplicate alert for exact same price
          const lastAlert = await Alert.findOne({
            userId: item.userId._id,
            productId: product._id,
          })
            .sort({ triggeredAt: -1 })
            .lean();

          if (lastAlert && lastAlert.newPrice === match.price) continue;

          const oldPrice = lastAlert?.newPrice ?? match.price + 1;

          const alert = await Alert.create({
            userId: item.userId._id,
            productId: product._id,
            site,
            oldPrice,
            newPrice: match.price,
            thresholdPrice: item.thresholdPrice,
            currency: item.currency || 'INR',
          });

          try {
            await emailService.sendPriceAlert({
              user: item.userId,
              product,
              listing,
              oldPrice,
              newPrice: match.price,
              thresholdPrice: item.thresholdPrice,
              currency: item.currency || 'INR',
            });
            alert.sent = true;
            alert.sentAt = new Date();
            await Wishlist.findByIdAndUpdate(item._id, { notifiedAt: new Date() });
            alertsTriggered++;
          } catch (emailErr) {
            alert.error = emailErr.message;
            logger.error(`[PriceCheckJob] Email send failed: ${emailErr.message}`);
          }

          await alert.save();
        }
      } catch (adapterErr) {
        logger.warn(`[PriceCheckJob] Adapter ${site} error for "${product.name}": ${adapterErr.message}`);
      }
    }
  }

  logger.info(`[PriceCheckJob] Done — ${updated} listings updated, ${alertsTriggered} alerts sent`);
};

module.exports = { runPriceCheck };
