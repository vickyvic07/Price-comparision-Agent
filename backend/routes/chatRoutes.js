const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { optionalAuth } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { chatSchema } = require('../utils/validationSchemas');

// POST /api/chat
router.post('/', chatLimiter, optionalAuth, validate(chatSchema), chatController.chat);

module.exports = router;
