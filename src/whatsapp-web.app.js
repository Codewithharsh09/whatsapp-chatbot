require('dotenv').config();
const logger = require('./utils/logger');
const whatsAppWebService = require('./integrations/whatsapp-web/whatsapp-web.service');

/**
 * WhatsApp-Web Bootstrapper
 * This file starts the chatbot using standard WhatsApp account integration.
 */

logger.info('Starting WhatsApp-Web Chatbot mode...');

// Initialize the WhatsApp-Web service
whatsAppWebService.initialize();

logger.info('WhatsApp-Web Chatbot initialized. Waiting for QR code...');

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
    logger.info({ signal }, 'Received shutdown signal, shutting down gracefully...');
    // The client will be closed automatically on process exit
    process.exit(0);
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
