const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter — applied to all /api routes.
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP. Please try again later.',
  },
});

/**
 * Stricter limiter for auth endpoints (login, register).
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

/**
 * Strict limiter for the /api/chat endpoint (LLM-backed, expensive).
 */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    code: 'CHAT_RATE_LIMIT_EXCEEDED',
    message: 'Chat request limit reached. Please slow down.',
  },
});

module.exports = { apiLimiter, authLimiter, chatLimiter };
