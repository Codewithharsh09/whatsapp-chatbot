const logger = require('../utils/logger');

/**
 * Centralized Error Handling Middleware
 * Catches all errors and returns appropriate HTTP responses
 * 
 * Follows REST API best practices for error responses
 */
const errorHandler = (err, req, res, next) => {
  // Log error with context
  logger.error({
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    request: {
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
      ip: req.ip,
    },
  }, 'Request error');

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Determine error message
  let message = err.message || 'Internal server error';
  
  // Don't expose internal errors in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = errorHandler;

