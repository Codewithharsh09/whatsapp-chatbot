require('dotenv').config();

/**
 * Application Configuration
 * Centralized configuration for the application
 */
const appConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requests per window
  },

  // Body size limits
  bodySizeLimit: process.env.BODY_SIZE_LIMIT || '10mb',

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  // Health check
  healthCheck: {
    enabled: true,
  },
};

module.exports = appConfig;

