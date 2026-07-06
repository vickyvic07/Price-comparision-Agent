require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');
const logger = require('./utils/logger');

// ─── Route imports (added incrementally) ────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const searchRoutes = require('./routes/searchRoutes');
const productRoutes = require('./routes/productRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const alertRoutes = require('./routes/alertRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// ─── Security / Transport ───────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(compression());

// ─── Request parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Logging ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

// ─── Global rate limiter ─────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    name: 'Price Comparison Agent API',
    version: '1.0.0',
    health: '/health',
    docs: {
      auth:     '/api/auth',
      search:   '/api/search',
      products: '/api/products',
      wishlist: '/api/wishlist',
      alerts:   '/api/alerts',
      chat:     '/api/chat',
    },
  });
});

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/products', productRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/chat', chatRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
