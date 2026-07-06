const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
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
    site: {
      type: String,
      lowercase: true,
      trim: true,
    },
    triggeredAt: {
      type: Date,
      default: Date.now,
    },
    oldPrice: {
      type: Number,
      required: true,
    },
    newPrice: {
      type: Number,
      required: true,
    },
    thresholdPrice: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    sent: {
      type: Boolean,
      default: false,
      index: true,
    },
    sentAt: Date,
    error: String, // capture send failure reason
  },
  { timestamps: true }
);

alertSchema.index({ userId: 1, productId: 1, triggeredAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
