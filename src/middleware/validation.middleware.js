const logger = require('../utils/logger');

/**
 * Validation Middleware
 * Validates request data against Joi schemas
 * 
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Source of data: 'body', 'query', 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn({ errors, source, path: req.path }, 'Validation failed');

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

module.exports = validate;

