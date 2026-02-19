const logger = require('../utils/logger');

/**
 * Request Logging Middleware
 * Logs all incoming requests with structured data
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info({
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }, 'Incoming request');

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    }, 'Request completed');
  });

  next();
};

module.exports = requestLogger;

