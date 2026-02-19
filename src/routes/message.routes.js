const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { apiRateLimiter } = require('../middleware/rate-limiter.middleware');
const validate = require('../middleware/validation.middleware');
const { sendMessageSchema, sendTemplateSchema, sendMediaSchema } = require('../utils/validators');

/**
 * Message Routes
 * Handles manual message sending endpoints
 */

// Send text message
router.post(
  '/messages/text',
  apiRateLimiter,
  validate(sendMessageSchema, 'body'),
  messageController.sendTextMessage.bind(messageController)
);

// Send template message
router.post(
  '/messages/template',
  apiRateLimiter,
  validate(sendTemplateSchema, 'body'),
  messageController.sendTemplateMessage.bind(messageController)
);

// Send media message
router.post(
  '/messages/media',
  apiRateLimiter,
  validate(sendMediaSchema, 'body'),
  messageController.sendMediaMessage.bind(messageController)
);

module.exports = router;

