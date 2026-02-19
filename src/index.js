require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const appConfig = require('../config/app.config');
const logger = require('./utils/logger');

// Routes
const webhookRoutes = require('./routes/webhook.routes');
const messageRoutes = require('./routes/message.routes');
const healthRoutes = require('./routes/health.routes');

// Middleware
const requestLogger = require('./middleware/request-logger.middleware');
const errorHandler = require('./middleware/error-handler.middleware');
const { apiRateLimiter } = require('./middleware/rate-limiter.middleware');

/**
 * Main Express Server
 * Production-ready WhatsApp chatbot using Gupshup WhatsApp Business API
 * 
 * Architecture:
 * - Clean architecture with separation of concerns
 * - Controllers handle HTTP concerns only
 * - Services contain business logic
 * - Integrations isolated in integrations/ folder
 * - Middleware for cross-cutting concerns
 */
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(appConfig.cors));

// Body parsing middleware with size limits
app.use(express.json({ limit: appConfig.bodySizeLimit }));
app.use(express.urlencoded({ extended: true, limit: appConfig.bodySizeLimit }));

// Request logging middleware
app.use(requestLogger);

// Root endpoint
app.get('/', apiRateLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp Laundry Service Chatbot API',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      ready: '/ready',
      webhook: '/webhook/gupshup',
      messages: {
        text: 'POST /messages/text',
        template: 'POST /messages/template',
        media: 'POST /messages/media',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// Health and readiness endpoints
app.use('/', healthRoutes);

// Webhook routes (Gupshup)
app.use('/', webhookRoutes);

// Message routes (manual sending)
app.use('/', messageRoutes);

// 404 handler
app.use((req, res) => {
  logger.warn({ path: req.path, method: req.method }, 'Route not found');
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
    },
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = appConfig.port;

const server = app.listen(PORT, () => {
  logger.info({
    port: PORT,
    environment: appConfig.nodeEnv,
    logLevel: appConfig.logLevel,
  }, 'Server started successfully');

  // Validate configuration on startup
  try {
    const gupshupConfig = require('../config/gupshup.config');
    gupshupConfig.validate();
    logger.info('Gupshup configuration validated successfully');
  } catch (error) {
    logger.error({ error }, 'Gupshup configuration validation failed');
    logger.error('Please check your .env file and ensure all required variables are set');
  }

  try {
    const openRouterConfig = require('../config/openrouter.config');
    openRouterConfig.validate();
    logger.info('OpenRouter configuration validated successfully');
  } catch (error) {
    logger.error({ error }, 'OpenRouter configuration validation failed');
    logger.error('Please check your OPENROUTER_API_KEY in .env file');
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info({ signal }, 'Received shutdown signal, shutting down gracefully...');

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Promise Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});

module.exports = app;
