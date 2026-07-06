const Wishlist = require('../models/Wishlist');
const PriceListing = require('../models/PriceListing');
const PriceHistory = require('../models/PriceHistory');
const Alert = require('../models/Alert');
const User = require('../models/User');
const Product = require('../models/Product');
const emailService = require('../services/emailService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * POST /api/alerts/check
 *
 * Intended to be called by a cron job (or manually with a secret).
 * For each active wishlist item, checks if current best price ≤ threshold.
 * If yes: saves Alert doc + sends email notification.
 */
exports.checkAlerts = asyncHandler(async (req, res) => {
  const activeItems = await Wishlist.find({ isActive: true })
    .populate('userId', 'email name')
    .populate('productId', 'name images')
    .lean();

  let triggered = 0;
  let errors = 0;

  for (const item of activeItems) {
    try {
      const bestListing = await PriceListing.findOne({ productId: item.productId._id, inStock: true })
        .sort({ price: 1 })
        .lean();

      if (!bestListing) continue;

      const currentPrice = bestListing.price;

      if (currentPrice <= item.thresholdPrice) {
        // Find the previous Alert for this item to get "oldPrice"
        const lastAlert = await Alert.findOne({
          userId: item.userId._id,
          productId: item.productId._id,
        })
          .sort({ triggeredAt: -1 })
          .lean();

        const oldPrice = lastAlert?.newPrice ?? bestListing.price + 1; // fallback

        // Avoid duplicate alerts: don't fire again if price hasn't changed since last alert
        if (lastAlert && lastAlert.newPrice === currentPrice) continue;

        const alert = await Alert.create({
          userId: item.userId._id,
          productId: item.productId._id,
          site: bestListing.site,
          oldPrice,
          newPrice: currentPrice,
          thresholdPrice: item.thresholdPrice,
          currency: item.currency,
        });

        // Send email
        try {
          await emailService.sendPriceAlert({
            user: item.userId,
            product: item.productId,
            listing: bestListing,
            oldPrice,
            newPrice: currentPrice,
            thresholdPrice: item.thresholdPrice,
            currency: item.currency,
          });

          alert.sent = true;
          alert.sentAt = new Date();

          // Update wishlist notifiedAt
          await Wishlist.findByIdAndUpdate(item._id, { notifiedAt: new Date() });
        } catch (emailErr) {
          alert.error = emailErr.message;
          logger.error(`Failed to send alert email for user ${item.userId._id}: ${emailErr.message}`);
          errors++;
        }

        await alert.save();
        triggered++;
      }
    } catch (itemErr) {
      logger.error(`Alert check error for wishlist item ${item._id}: ${itemErr.message}`);
      errors++;
    }
  }

  res.status(200).json({
    status: 'success',
    data: { checked: activeItems.length, triggered, errors },
  });
});

// ─── GET /api/alerts/:userId — fetch alert history ───────────────────────────

exports.getUserAlerts = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  if (req.user._id.toString() !== userId) {
    return next(new AppError('Access denied.', 403, 'FORBIDDEN'));
  }

  const alerts = await Alert.find({ userId })
    .populate('productId', 'name images')
    .sort({ triggeredAt: -1 })
    .limit(50)
    .lean();

  res.status(200).json({
    status: 'success',
    data: { alerts, total: alerts.length },
  });
});
