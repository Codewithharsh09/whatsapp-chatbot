const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { webhookRateLimiter } = require('../middleware/rate-limiter.middleware');
const validate = require('../middleware/validation.middleware');
const { webhookVerificationSchema, webhookPayloadSchema } = require('../utils/validators');

/**
 * Webhook Routes
 * Handles Gupshup webhook endpoints
 */

// GET endpoint for webhook verification
router.get(
  '/webhook/gupshup',
  webhookRateLimiter,
  validate(webhookVerificationSchema, 'query'),
  webhookController.verify.bind(webhookController)
);

// POST endpoint for receiving messages
router.post(
  '/webhook/gupshup',
  webhookRateLimiter,
  validate(webhookPayloadSchema, 'body'),
  webhookController.handleWebhook.bind(webhookController)
);

module.exports = router;

