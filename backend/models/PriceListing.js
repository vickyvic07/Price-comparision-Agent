const mongoose = require('mongoose');

const priceListingSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    site: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      // slug: 'amazon', 'flipkart', 'croma', 'vijay_sales', etc.
    },
    // Human-readable merchant name from the source (e.g. "Amazon.in", "Vijay Sales")
    storeName: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    discountPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    deliveryEstimate: {
      type: String, // e.g. "2-3 days", "Free delivery by Mon"
      trim: true,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// One listing per product+site (upsert pattern)
priceListingSchema.index({ productId: 1, site: 1 }, { unique: true });

module.exports = mongoose.model('PriceListing', priceListingSchema);
