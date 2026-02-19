const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * Health Check Routes
 * Provides health and readiness endpoints for monitoring
 */

/**
 * Health check endpoint
 * Returns basic service status
 */
router.get('/health', (req, res) => {
  try {
    const companyProfile = require('../../config/company-profile.json');
    
    res.status(200).json({
      status: 'ok',
      service: 'WhatsApp Laundry Service Chatbot',
      company: companyProfile.companyName,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(500).json({
      status: 'error',
      error: {
        message: 'Service configuration error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Readiness endpoint
 * Checks if service is ready to accept traffic
 * Can include dependency checks (database, external APIs, etc.)
 */
router.get('/ready', async (req, res) => {
  try {
    const checks = {
      service: true,
      gupshup: false,
      ai: false,
    };

    // Check Gupshup configuration
    try {
      const gupshupConfig = require('../../config/gupshup.config');
      gupshupConfig.validate();
      checks.gupshup = true;
    } catch (error) {
      logger.warn({ error }, 'Gupshup configuration check failed');
    }

    // Check AI service
    try {
      const aiService = require('../services/ai.service');
      // Simple check - service exists and is initialized
      checks.ai = !!aiService;
    } catch (error) {
      logger.warn({ error }, 'AI service check failed');
    }

    const isReady = Object.values(checks).every(check => check === true);

    const statusCode = isReady ? 200 : 503;

    res.status(statusCode).json({
      status: isReady ? 'ready' : 'not ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Readiness check failed');
    res.status(503).json({
      status: 'error',
      error: {
        message: 'Readiness check failed',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;

