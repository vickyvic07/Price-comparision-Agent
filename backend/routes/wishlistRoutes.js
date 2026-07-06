const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { addWishlistSchema } = require('../utils/validationSchemas');

// All wishlist routes require authentication
router.use(protect);

// POST /api/wishlist
router.post('/', validate(addWishlistSchema), wishlistController.addToWishlist);

// GET /api/wishlist/:userId
router.get('/:userId', wishlistController.getWishlist);

// PATCH /api/wishlist/:itemId
router.patch('/:itemId', wishlistController.updateThreshold);

// DELETE /api/wishlist/:itemId
router.delete('/:itemId', wishlistController.removeFromWishlist);

module.exports = router;
