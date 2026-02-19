const gupshupConfig = require('../../config/gupshup.config');
const gupshupService = require('../integrations/gupshup/gupshup.service');
const messageHandlerService = require('../services/message-handler.service');
const WebhookParser = require('../utils/webhook-parser');
const logger = require('../utils/logger');

/**
 * Webhook Controller
 * Handles webhook requests from Gupshup
 * 
 * Controllers should be thin - only handle HTTP concerns
 * Business logic is delegated to services
 */
class WebhookController {
  /**
   * Verify webhook endpoint (GET request)
   * Used by Gupshup to verify webhook URL during setup
   */
  async verify(req, res, next) {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      // Verify token matches configured token
      if (mode === 'subscribe' && token === gupshupConfig.webhookVerifyToken) {
        logger.info({ challenge }, 'Webhook verified successfully');
        return res.status(200).send(challenge);
      }

      logger.warn({ mode, token }, 'Webhook verification failed - invalid token');
      return res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden - invalid verification token',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle incoming webhook (POST request)
   * Processes messages from Gupshup
   */
  async handleWebhook(req, res, next) {
    try {
      // Immediately acknowledge receipt to prevent retries
      res.status(200).json({ status: 'received' });

      // Verify webhook signature if provided
      const signature = req.headers['x-gupshup-signature'] || req.headers['x-hub-signature-256'];
      if (signature) {
        const isValid = gupshupService.verifyWebhookSignature(req.body, signature);
        if (!isValid) {
          logger.warn({ signature, path: req.path }, 'Invalid webhook signature');
          return; // Already sent 200, just log and return
        }
      }

      // Parse webhook payload
      const messageData = WebhookParser.parse(req.body);

      if (!messageData) {
        logger.warn({ body: req.body }, 'No valid message data found in webhook');
        return;
      }

      const { from, message, messageId } = messageData;

      // Ignore messages from the bot itself to prevent loops
      // Note: Adjust this check based on your Gupshup app number format
      if (from === gupshupConfig.appName) {
        logger.debug({ from }, 'Ignoring message from bot itself');
        return;
      }

      logger.info({ from, messageType: messageData.messageType, messageId }, 'Processing incoming message');

      // Process message asynchronously (fire and forget)
      // This ensures webhook responds quickly to Gupshup
      messageHandlerService.processMessage(messageData, false)
        .then(result => {
          logger.info({ result, from }, 'Message processed successfully');
        })
        .catch(error => {
          logger.error({ error, from, messageData }, 'Error processing message');
          
          // Optionally send error message to user
          // This is handled in the message handler service
        });

      // Response already sent above
    } catch (error) {
      // Log error but don't send response (already sent 200)
      logger.error({ error, body: req.body }, 'Error in webhook handler');
      // Don't call next() as response already sent
    }
  }
}

module.exports = new WebhookController();

