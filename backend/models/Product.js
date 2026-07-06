const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: 'text',
    },
    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    images: [
      {
        type: String, // URL
      },
    ],
    // Cached aggregated review summary (refreshed weekly by daily job)
    reviewSummary: {
      pros: [String],
      cons: [String],
      summary: String,
      generatedAt: Date,
    },
  },
  { timestamps: true }
);

// Compound text index for full-text search
productSchema.index({ name: 'text', normalizedName: 'text', category: 'text', brand: 'text' });

module.exports = mongoose.model('Product', productSchema);
