/**
 * validate.js — Express middleware factory for Zod schema validation.
 *
 * Usage:
 *   const { validate } = require('../middleware/validate');
 *   const { transactionSchema } = require('../schemas/validation');
 *
 *   router.post('/add', validate(transactionSchema), async (req, res) => { ... });
 *
 * On failure: returns 400 with { error: "First error message", errors: [...all] }
 * On success: calls next() — req.body is now the parsed + coerced Zod output
 */
const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    // Parse and coerce the body — replaces req.body with the clean output
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      // Zod v3 uses err.issues (err.errors is an alias but may be undefined in some builds)
      const issues = err.issues ?? err.errors ?? [];
      const errors = issues.map(e => ({
        field: e.path.join('.') || 'body',
        message: e.message,
      }));
      return res.status(400).json({
        error: errors[0]?.message || 'Validation failed.',
        errors,
      });
    }
    next(err);
  }
};

module.exports = { validate };
