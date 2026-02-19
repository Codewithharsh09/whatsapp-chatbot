const gupshupService = require('../integrations/gupshup/gupshup.service');
const logger = require('../utils/logger');

/**
 * Message Controller
 * Handles manual message sending endpoints
 * 
 * Controllers should be thin - only handle HTTP concerns
 */
class MessageController {
  /**
   * Send a text message
   */
  async sendTextMessage(req, res, next) {
    try {
      const { to, message } = req.body;

      const result = await gupshupService.sendTextMessage(to, message);

      logger.info({ to, messageId: result.messageId }, 'Text message sent successfully');

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(req, res, next) {
    try {
      const { to, templateName, params } = req.body;

      const result = await gupshupService.sendTemplateMessage(to, templateName, params || []);

      logger.info({ to, templateName, messageId: result.messageId }, 'Template message sent successfully');

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a media message
   */
  async sendMediaMessage(req, res, next) {
    try {
      const { to, mediaType, mediaUrl, caption, filename } = req.body;

      const result = await gupshupService.sendMediaMessage(
        to,
        mediaType,
        mediaUrl,
        caption || '',
        filename || ''
      );

      logger.info({ to, mediaType, messageId: result.messageId }, 'Media message sent successfully');

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();

