/**
 * Operational (expected) errors that should be sent to the client.
 * Programming errors and unexpected failures are handled differently
 * in the global error handler.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [code] - Optional machine-readable error code
   */
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.code = code || null;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
