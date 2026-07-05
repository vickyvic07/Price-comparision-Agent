/**
 * Adapter registry.
 *
 * Keys must match the `site` field stored in PriceListing docs.
 * Add new adapters here — they'll automatically be included in search fan-out.
 *
 * Set DISABLED_ADAPTERS=croma,serpapi in .env to skip specific adapters.
 */
const disabled = (process.env.DISABLED_ADAPTERS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Programmatically disable croma because it is not in the user's allowed store whitelist
if (!disabled.includes('croma')) {
  disabled.push('croma');
}

const all = {
  amazon: require('./amazon'),
  flipkart: require('./flipkart'),
  croma: require('./croma'),
  serpapi: require('./serpapi'),
};

const registry = {};
for (const [key, adapter] of Object.entries(all)) {
  if (!disabled.includes(key)) {
    registry[key] = adapter;
  }
}

module.exports = registry;
