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

  // Flush cache on startup
  try {
    const { cache } = require('./config/redis');
    cache.flush();
    logger.info('In-memory cache flushed on startup');
  } catch (err) {
    logger.error('Error running server startup cache flush:', err);
  }

  // Lazy-load background jobs after DB is ready
  require('./jobs');

  server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

start();
