/**
 * EmailService — standalone Nodemailer wrapper.
 *
 * Swap the transport (e.g. SendGrid, AWS SES) by updating createTransport()
 * without touching call sites.
 */
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// ─── Transport ───────────────────────────────────────────────────────────────

const createTransport = () => {
  if (process.env.NODE_ENV === 'test' || !process.env.SMTP_HOST) {
    // Ethereal (fake SMTP) for dev/test
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER || 'test@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'testpass',
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransport();

// ─── Templates ───────────────────────────────────────────────────────────────

const buildPriceAlertHtml = ({ user, product, listing, oldPrice, newPrice, thresholdPrice, currency }) => {
  const drop = oldPrice - newPrice;
  const dropPct = oldPrice > 0 ? Math.round((drop / oldPrice) * 100) : 0;
  const productImage = product.images?.[0] || '';
  const productUrl = listing.url || '#';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Price Alert</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    .header { background: #2563eb; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 22px; }
    .body { padding: 24px 32px; }
    .product-img { width: 120px; height: 120px; object-fit: contain; border-radius: 8px; float: right; margin-left: 16px; }
    .price-old { text-decoration: line-through; color: #888; }
    .price-new { font-size: 28px; font-weight: bold; color: #16a34a; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 13px; margin: 8px 0; }
    .cta { display: inline-block; margin-top: 20px; padding: 12px 28px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .footer { padding: 16px 32px; background: #f9fafb; font-size: 12px; color: #888; }
    .clearfix::after { content: ''; display: table; clear: both; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Price Alert — Target Reached!</h1>
    </div>
    <div class="body clearfix">
      ${productImage ? `<img class="product-img" src="${productImage}" alt="${product.name}" />` : ''}
      <p>Hi ${user.name || 'there'},</p>
      <p>Great news! <strong>${product.name}</strong> has dropped below your target price on <strong>${listing.site}</strong>.</p>

      <p class="price-old">${currency} ${oldPrice.toLocaleString('en-IN')}</p>
      <p class="price-new">${currency} ${newPrice.toLocaleString('en-IN')}</p>
      <span class="badge">↓ ${dropPct}% drop (saved ${currency} ${drop.toLocaleString('en-IN')})</span>

      <p>Your target was: <strong>${currency} ${thresholdPrice.toLocaleString('en-IN')}</strong></p>

      <a class="cta" href="${productUrl}" target="_blank">Buy Now on ${listing.site}</a>

      <p style="margin-top:24px; font-size:13px; color:#666;">
        Prices change frequently — grab it before it goes back up!
      </p>
    </div>
    <div class="footer">
      You're receiving this because you added this product to your Price Agent wishlist.<br/>
      <a href="#">Unsubscribe</a> | <a href="#">Manage Alerts</a>
    </div>
  </div>
</body>
</html>`;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a price-drop alert email to a user.
 *
 * @param {{ user, product, listing, oldPrice, newPrice, thresholdPrice, currency }} params
 */
const sendPriceAlert = async ({ user, product, listing, oldPrice, newPrice, thresholdPrice, currency = 'INR' }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Price Agent" <noreply@priceagent.com>',
    to: user.email,
    subject: `🔔 Price Drop Alert: ${product.name} is now ${currency} ${newPrice.toLocaleString('en-IN')}`,
    html: buildPriceAlertHtml({ user, product, listing, oldPrice, newPrice, thresholdPrice, currency }),
    text: `Hi ${user.name || 'there'},\n\n${product.name} has dropped to ${currency} ${newPrice} on ${listing.site}.\nYour target: ${currency} ${thresholdPrice}\nBuy here: ${listing.url}`,
  };

  const info = await transporter.sendMail(mailOptions);
  logger.info(`Price alert email sent to ${user.email}: messageId=${info.messageId}`);
  return info;
};

/**
 * Verify the transporter connection (call at startup for health checks).
 */
const verifyConnection = async () => {
  try {
    await transporter.verify();
    logger.info('Email service: SMTP connection verified');
    return true;
  } catch (err) {
    logger.warn(`Email service: SMTP connection failed — ${err.message}`);
    return false;
  }
};

module.exports = { sendPriceAlert, verifyConnection };
