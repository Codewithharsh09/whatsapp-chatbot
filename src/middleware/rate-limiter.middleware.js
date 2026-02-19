const rateLimit = require('express-rate-limit');
const appConfig = require('../../config/app.config');
const logger = require('../utils/logger');

/**
 * Rate Limiting Middleware
 * Protects API from abuse and ensures fair usage
 */
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        message: message || 'Too many requests, please try again later.',
      },
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn({
        ip: req.ip,
        path: req.path,
        method: req.method,
      }, 'Rate limit exceeded');
      
      res.status(429).json({
        success: false,
        error: {
          message: message || 'Too many requests, please try again later.',
        },
        timestamp: new Date().toISOString(),
      });
    },
  });
};

// General API rate limiter
const apiRateLimiter = createRateLimiter(
  appConfig.rateLimit.windowMs,
  appConfig.rateLimit.max,
  'Too many requests from this IP, please try again later.'
);

// Stricter rate limiter for webhook endpoint
const webhookRateLimiter = createRateLimiter(
  60000, // 1 minute
  10, // 10 requests per minute
  'Too many webhook requests, please try again later.'
);

module.exports = {
  apiRateLimiter,
  webhookRateLimiter,
};

