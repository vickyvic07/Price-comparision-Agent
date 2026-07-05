const Wishlist = require('../models/Wishlist');
const PriceListing = require('../models/PriceListing');
const Product = require('../models/Product');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// ─── POST /api/wishlist  (protected) ─────────────────────────────────────────

exports.addToWishlist = asyncHandler(async (req, res, next) => {
  const { productId, thresholdPrice, currency = 'INR' } = req.body;
  const userId = req.user._id;

  // Verify product exists
  const product = await Product.findById(productId).lean();
  if (!product) return next(new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND'));

  // Upsert — update threshold if item already exists
  const wishlistItem = await Wishlist.findOneAndUpdate(
    { userId, productId },
    { thresholdPrice, currency, isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Keep User.wishlists array in sync
  await User.findByIdAndUpdate(userId, {
    $addToSet: { wishlists: wishlistItem._id },
  });

  res.status(201).json({
    status: 'success',
    data: { wishlistItem },
  });
});

// ─── GET /api/wishlist/:userId  (protected, own list only) ───────────────────

exports.getWishlist = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  // Users may only access their own wishlist
  if (req.user._id.toString() !== userId) {
    return next(new AppError('Access denied.', 403, 'FORBIDDEN'));
  }

  const items = await Wishlist.find({ userId, isActive: true })
    .populate('productId', 'name normalizedName category images')
    .lean();

  // Attach current best price per item
  const enriched = await Promise.all(
    items.map(async (item) => {
      const listings = await PriceListing.find({ productId: item.productId._id, inStock: true })
        .sort({ price: 1 })
        .limit(5)
        .lean();

      const bestPrice = listings[0]?.price ?? null;
      const isBelowThreshold = bestPrice !== null && bestPrice <= item.thresholdPrice;

      return { ...item, currentListings: listings, bestPrice, isBelowThreshold };
    })
  );

  res.status(200).json({
    status: 'success',
    data: { wishlist: enriched, total: enriched.length },
  });
});

// ─── DELETE /api/wishlist/:itemId  (protected) ───────────────────────────────

exports.removeFromWishlist = asyncHandler(async (req, res, next) => {
  const item = await Wishlist.findById(req.params.itemId);

  if (!item) return next(new AppError('Wishlist item not found.', 404, 'NOT_FOUND'));
  if (item.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('Access denied.', 403, 'FORBIDDEN'));
  }

  item.isActive = false;
  await item.save();

  res.status(200).json({ status: 'success', message: 'Item removed from wishlist.' });
});

// ─── PATCH /api/wishlist/:itemId  (protected) — update threshold ─────────────

exports.updateThreshold = asyncHandler(async (req, res, next) => {
  const item = await Wishlist.findById(req.params.itemId);

  if (!item) return next(new AppError('Wishlist item not found.', 404, 'NOT_FOUND'));
  if (item.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('Access denied.', 403, 'FORBIDDEN'));
  }

  const { thresholdPrice } = req.body;
  if (thresholdPrice != null) item.thresholdPrice = thresholdPrice;
  await item.save();

  res.status(200).json({ status: 'success', data: { wishlistItem: item } });
});
