const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies the Bearer JWT and attaches req.user.
 * Routes that require authentication must use this middleware.
 */
const protect = asyncHandler(async (req, res, next) => {
  // 1. Extract token from Authorization header or cookie
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401, 'NO_TOKEN'));
  }

  // 2. Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3. Check user still exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401, 'USER_GONE'));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated.', 401, 'ACCOUNT_INACTIVE'));
  }

  req.user = user;
  next();
});

/**
 * Optional auth — attaches req.user if a valid token is present but
 * does NOT reject the request if no token is provided.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) req.user = user;
  } catch {
    // Invalid token is silently ignored for optional auth
  }

  next();
});

module.exports = { protect, optionalAuth };
