const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, changePasswordSchema } = require('../utils/validationSchemas');

// Public
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// Protected
router.get('/me', protect, authController.getMe);
router.patch(
  '/change-password',
  protect,
  validate(changePasswordSchema),
  authController.changePassword
);

module.exports = router;
