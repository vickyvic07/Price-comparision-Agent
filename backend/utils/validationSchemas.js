const { z } = require('zod');

// ─── Auth ────────────────────────────────────────────────────────────────────

exports.registerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  phone: z.string().regex(/^\+?[0-9\s\-()]{7,20}$/).optional(),
});

exports.loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

exports.changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(72)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

// ─── Search ──────────────────────────────────────────────────────────────────

exports.searchSchema = z.object({
  query: z.string().min(1).max(300).trim(),
  category: z.string().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).toUpperCase().default('INR'),
  sites: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim().toLowerCase()) : undefined)),
});

// ─── Wishlist ────────────────────────────────────────────────────────────────

exports.addWishlistSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
  thresholdPrice: z.number().positive('Threshold price must be positive'),
  currency: z.string().length(3).toUpperCase().default('INR'),
});

// ─── Chat ────────────────────────────────────────────────────────────────────

exports.chatSchema = z.object({
  message: z.string().min(1).max(1000).trim(),
  conversationId: z.string().uuid().optional(),
});

// ─── Alerts ──────────────────────────────────────────────────────────────────

exports.checkAlertsSchema = z.object({
  secret: z.string().optional(), // optional cron secret
});
