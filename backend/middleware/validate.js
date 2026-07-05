const AppError = require('../utils/AppError');

/**
 * Zod validation middleware factory.
 * Pass a Zod schema; it validates req.body, req.query, or req.params.
 *
 * Usage:
 *   router.post('/route', validate(mySchema), controller)
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source - which part of req to validate
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return next(new AppError(`Validation error — ${messages}`, 422, 'VALIDATION_ERROR'));
  }

  // Replace raw input with the parsed+coerced value
  req[source] = result.data;
  next();
};

module.exports = validate;
