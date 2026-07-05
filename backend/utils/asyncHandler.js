/**
 * Wraps an async route handler so unhandled promise rejections are
 * forwarded to Express's next(err) without try/catch boilerplate.
 *
 * @param {Function} fn - async (req, res, next) handler
 * @returns {Function} wrapped handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
