const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { optionalAuth } = require('../middleware/auth');

// GET /api/products  — featured / recently-updated products for homepage
router.get('/', productController.getFeaturedProducts);

// GET /api/products/:id
router.get('/:id', optionalAuth, productController.getProduct);

// GET /api/products/:id/history?site=amazon&days=30
router.get('/:id/history', productController.getPriceHistory);

// GET /api/products/:id/best-value
router.get('/:id/best-value', productController.getBestValue);

// GET /api/products/:id/reviews-summary
router.get('/:id/reviews-summary', productController.getReviewsSummary);

module.exports = router;
