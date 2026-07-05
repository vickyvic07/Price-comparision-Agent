const LOCALES = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

/**
 * Format a number as currency.
 * @param {number} amount
 * @param {string} currency - ISO 4217 code, default 'INR'
 * @returns {string}  e.g. "₹1,24,999"
 */
export const formatCurrency = (amount, currency = 'INR') => {
  if (amount == null || isNaN(amount)) return '—';
  const locale = LOCALES[currency] || 'en-IN';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Compact format for small spaces: "₹1.24L", "₹85K"
 */
export const formatCurrencyCompact = (amount, currency = 'INR') => {
  if (amount == null || isNaN(amount)) return '—';
  if (amount >= 100000) return `${currency === 'INR' ? '₹' : ''}${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000)   return `${currency === 'INR' ? '₹' : ''}${(amount / 1000).toFixed(1)}K`;
  return formatCurrency(amount, currency);
};

/**
 * Percentage drop between two prices.
 */
export const priceDrop = (oldPrice, newPrice) => {
  if (!oldPrice || oldPrice === 0) return 0;
  return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
};
