require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

// Ensure logs directory exists
const fs = require('fs');
if (!fs.existsSync('logs')) fs.mkdirSync('logs');

const PORT = process.env.PORT || 5000;

// ─── Graceful shutdown helpers ───────────────────────────────────────────────
let server;

const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force exit after 10 s
  setTimeout(() => process.exit(1), 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION:', reason);
  server?.close(() => process.exit(1));
});

// ─── Bootstrap ───────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();

  // Cleanup non-whitelisted storefront listings and flush cache on startup
  try {
    const PriceListing = require('./models/PriceListing');
    const PriceHistory = require('./models/PriceHistory');
    const Alert = require('./models/Alert');
    const { cache } = require('./config/redis');

    const ALLOWED_SLUGS = [
      'amazon', 'flipkart', 'meesho', 'myntra', 'ajio',
      'tata_cliq', 'tatacliq', 'snapdeal', 'shopclues',
      'ebay', 'walmart', 'aliexpress'
    ];

    const delListings = await PriceListing.deleteMany({ site: { $nin: ALLOWED_SLUGS } });
    const delHistory = await PriceHistory.deleteMany({ site: { $nin: ALLOWED_SLUGS } });
    const delAlerts = await Alert.deleteMany({ site: { $nin: ALLOWED_SLUGS } });

    if (delListings.deletedCount > 0 || delHistory.deletedCount > 0 || delAlerts.deletedCount > 0) {
      logger.info(`Cleaned up non-whitelisted storefront records: ${delListings.deletedCount} listings, ${delHistory.deletedCount} history, ${delAlerts.deletedCount} alerts`);
    }

    cache.flush();
    logger.info('In-memory cache flushed on startup');
  } catch (err) {
    logger.error('Error running server startup cleanup/flush:', err);
  }

  // Lazy-load background jobs after DB is ready
  require('./jobs');

  server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

start();
