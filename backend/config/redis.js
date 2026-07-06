/**
 * In-memory cache — simple Map-based store with TTL support.
 * Drop-in replacement for the previous Redis/ioredis implementation.
 * The same `cache` API is exported so no call sites need to change.
 */
const memoryStore = new Map(); // key -> { value, expiresAt }

const cache = {
  get(key) {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },

  set(key, value, ttlSeconds = 300) {
    memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  },

  del(key) {
    memoryStore.delete(key);
  },

  flush() {
    memoryStore.clear();
  },
};

module.exports = { cache };
