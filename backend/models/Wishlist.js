const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    thresholdPrice: {
      type: Number,
      required: [true, 'Threshold price is required'],
      min: [0, 'Threshold price must be positive'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notifiedAt: {
      type: Date, // last time an alert was sent for this wishlist item
    },
  },
  { timestamps: true }
);

// A user can only add the same product once to their wishlist
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
