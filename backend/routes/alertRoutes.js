const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

/**
 * POST /api/alerts/check
 * Called by the cron job (or manually). No user auth required — protected
 * by an optional shared secret in req.body.secret / CRON_SECRET env var.
 */
router.post('/check', (req, res, next) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.body?.secret !== cronSecret) {
    return res.status(401).json({ status: 'fail', message: 'Invalid cron secret.' });
  }
  next();
}, alertController.checkAlerts);

// GET /api/alerts/:userId — protected, own alerts only
router.get('/:userId', protect, alertController.getUserAlerts);

module.exports = router;
