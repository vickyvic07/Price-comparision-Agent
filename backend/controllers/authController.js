const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

// ─── Helpers ────────────────────────────────────────────────────────────────

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

// ─── Register ───────────────────────────────────────────────────────────────

exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return next(new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN'));
  }

  const user = await User.create({ name, email, password, phone });

  logger.info(`New user registered: ${email}`);
  createSendToken(user, 201, res);
});

// ─── Login ──────────────────────────────────────────────────────────────────

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Incorrect email or password.', 401, 'INVALID_CREDENTIALS'));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated.', 401, 'ACCOUNT_INACTIVE'));
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  logger.info(`User logged in: ${email}`);
  createSendToken(user, 200, res);
});

// ─── Get current user ────────────────────────────────────────────────────────

exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { user: req.user },
  });
});

// ─── Change password ─────────────────────────────────────────────────────────

exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect.', 401, 'WRONG_PASSWORD'));
  }

  user.password = newPassword;
  await user.save();

  createSendToken(user, 200, res);
});
