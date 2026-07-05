const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
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
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Efficient queries for chart data: product + site + time window
priceHistorySchema.index({ productId: 1, site: 1, timestamp: -1 });

module.exports = mongoose.model('PriceHistory', priceHistorySchema);
