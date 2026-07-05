/**
 * Demo seed script
 *
 * Creates:
 *   - 2 demo users (with hashed passwords)
 *   - 5 demo products across categories
 *   - 2–3 PriceListings per product (one per site)
 *   - PriceHistory snapshots (30 days)
 *   - Wishlist entries for the demo user
 *
 * Usage: node scripts/seed.js
 *        node scripts/seed.js --clean   (drops existing data first)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const PriceListing = require('../models/PriceListing');
const PriceHistory = require('../models/PriceHistory');
const User = require('../models/User');
const Wishlist = require('../models/Wishlist');
const logger = require('../utils/logger');

const CLEAN = process.argv.includes('--clean');

// ─── Seed data ───────────────────────────────────────────────────────────────

const demoUsers = [
  { name: 'Alice Demo', email: 'alice@demo.com', password: 'Alice@1234', phone: '+91 9876543210' },
  { name: 'Bob Demo', email: 'bob@demo.com', password: 'Bob@12345', phone: '+91 9123456789' },
];

const demoProducts = [
  {
    name: 'Samsung Galaxy S24 Ultra',
    normalizedName: 'samsung galaxy s24 ultra',
    category: 'Smartphones',
    brand: 'Samsung',
    images: [
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80',
    ],
  },
  {
    name: 'Apple MacBook Air M3',
    normalizedName: 'apple macbook air m3',
    category: 'Laptops',
    brand: 'Apple',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80',
    ],
  },
  {
    name: 'Sony WH-1000XM5 Headphones',
    normalizedName: 'sony wh-1000xm5 headphones',
    category: 'Audio',
    brand: 'Sony',
    images: [
      'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80',
    ],
  },
  {
    name: 'LG 55 inch 4K OLED TV',
    normalizedName: 'lg 55 inch 4k oled tv',
    category: 'Televisions',
    brand: 'LG',
    images: [
      'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&q=80',
    ],
  },
  {
    name: 'Dyson V15 Detect Vacuum Cleaner',
    normalizedName: 'dyson v15 detect vacuum cleaner',
    category: 'Home Appliances',
    brand: 'Dyson',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    ],
  },
  {
    name: 'Apple iPad Pro 12.9"',
    normalizedName: 'apple ipad pro 12.9',
    category: 'Tablets',
    brand: 'Apple',
    images: [
      'https://images.unsplash.com/photo-1544244015-0df4cec50d07?w=400&q=80',
    ],
  },
  {
    name: 'Canon EOS R50 Mirrorless Camera',
    normalizedName: 'canon eos r50 mirrorless camera',
    category: 'Cameras',
    brand: 'Canon',
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80',
    ],
  },
  {
    name: 'Apple Watch Series 9',
    normalizedName: 'apple watch series 9',
    category: 'Wearables',
    brand: 'Apple',
    images: [
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&q=80',
    ],
  },
  {
    name: 'Bose QuietComfort 45',
    normalizedName: 'bose quietcomfort 45',
    category: 'Audio',
    brand: 'Bose',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
    ],
  },
  {
    name: 'OnePlus 12 5G',
    normalizedName: 'oneplus 12 5g',
    category: 'Smartphones',
    brand: 'OnePlus',
    images: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80',
    ],
  },
  {
    name: 'Dell XPS 15 Laptop',
    normalizedName: 'dell xps 15 laptop',
    category: 'Laptops',
    brand: 'Dell',
    images: [
      'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80',
    ],
  },
  {
    name: 'Samsung 65" QLED 4K TV',
    normalizedName: 'samsung 65 qled 4k tv',
    category: 'Televisions',
    brand: 'Samsung',
    images: [
      'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=400&q=80',
    ],
  },
];

// Listing templates per site
const buildListings = (productId, basePrices) => {
  const sites = ['amazon', 'flipkart', 'croma'];
  return sites.map((site, i) => ({
    productId,
    site,
    price: basePrices[i] || basePrices[0] + i * 500,
    originalPrice: (basePrices[i] || basePrices[0] + i * 500) * 1.1,
    discountPercent: Math.floor(Math.random() * 15) + 5,
    currency: 'INR',
    rating: (3.5 + Math.random() * 1.5).toFixed(1),
    reviewCount: Math.floor(Math.random() * 5000) + 200,
    deliveryEstimate: ['Same day', '2-3 days', '3-5 days'][i],
    inStock: true,
    url: `https://www.${site}.${site === 'amazon' ? 'in' : 'com'}/product-${productId}-demo`,
    lastCheckedAt: new Date(),
  }));
};

const productBasePrices = [
  [124999, 122999, 126999],  // Galaxy S24 Ultra
  [134900, 132900, 136900],  // MacBook Air M3
  [29999,  28499,  30999 ],  // Sony WH-1000XM5
  [89990,  87990,  91990 ],  // LG 55" OLED
  [52900,  51900,  53900 ],  // Dyson V15
  [109900, 107900, 111900],  // iPad Pro
  [79999,  78499,  81999 ],  // Canon EOS R50
  [41900,  40900,  42900 ],  // Apple Watch S9
  [26999,  25999,  27999 ],  // Bose QC45
  [64999,  63499,  65999 ],  // OnePlus 12
  [189999, 187999, 191999],  // Dell XPS 15
  [149990, 147990, 151990],  // Samsung 65" QLED
];

// Build 30-day price history (daily snapshots with minor fluctuations)
const buildHistory = (productId, basePrices) => {
  const entries = [];
  const sites = ['amazon', 'flipkart', 'croma'];
  for (let day = 30; day >= 0; day--) {
    const ts = new Date(Date.now() - day * 24 * 60 * 60 * 1000);
    sites.forEach((site, i) => {
      const base = basePrices[i] || basePrices[0];
      const fluctuation = (Math.random() - 0.5) * base * 0.05; // ±2.5%
      entries.push({
        productId,
        site,
        price: Math.round(base + fluctuation),
        currency: 'INR',
        timestamp: ts,
      });
    });
  }
  return entries;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const seed = async () => {
  await connectDB();

  if (CLEAN) {
    logger.info('Cleaning existing data…');
    await Promise.all([
      Product.deleteMany({}),
      PriceListing.deleteMany({}),
      PriceHistory.deleteMany({}),
      User.deleteMany({ email: { $in: demoUsers.map((u) => u.email) } }),
      Wishlist.deleteMany({}),
    ]);
    logger.info('Existing demo data removed.');
  }

  // ── Users ───────────────────────────────────────────────────────────────
  logger.info('Seeding users…');
  const createdUsers = [];
  for (const userData of demoUsers) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      createdUsers.push(existing);
    } else {
      createdUsers.push(await User.create(userData));
    }
  }
  const [alice] = createdUsers;

  // ── Products ─────────────────────────────────────────────────────────────
  logger.info('Seeding products…');
  const createdProducts = [];
  for (const p of demoProducts) {
    const existing = await Product.findOne({ normalizedName: p.normalizedName });
    if (existing) {
      createdProducts.push(existing);
    } else {
      createdProducts.push(await Product.create(p));
    }
  }

  // ── Listings & History ───────────────────────────────────────────────────
  logger.info('Seeding price listings and history…');
  for (let i = 0; i < createdProducts.length; i++) {
    const product = createdProducts[i];
    const basePrices = productBasePrices[i];

    // Listings
    for (const listing of buildListings(product._id, basePrices)) {
      await PriceListing.findOneAndUpdate(
        { productId: listing.productId, site: listing.site },
        listing,
        { upsert: true, new: true }
      );
    }

    // History (bulk insert — skip if already has history)
    const existingHistory = await PriceHistory.countDocuments({ productId: product._id });
    if (existingHistory === 0) {
      await PriceHistory.insertMany(buildHistory(product._id, basePrices));
    }
  }

  // ── Wishlist entries for Alice ────────────────────────────────────────────
  logger.info('Seeding wishlist…');
  const wishlistThresholds = [119999, 130000, 26000, 85000, 49000, 104999, 75999, 39900, 24999, 61999, 184999, 144990];
  for (let i = 0; i < createdProducts.length; i++) {
    await Wishlist.findOneAndUpdate(
      { userId: alice._id, productId: createdProducts[i]._id },
      {
        thresholdPrice: wishlistThresholds[i],
        currency: 'INR',
        isActive: true,
      },
      { upsert: true, new: true }
    );
  }

  logger.info('✅ Seed complete!');
  logger.info(`   Users:    ${createdUsers.length}`);
  logger.info(`   Products: ${createdProducts.length}`);
  logger.info(`   Listings: ${createdProducts.length * 3}`);

  await mongoose.disconnect();
};

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
