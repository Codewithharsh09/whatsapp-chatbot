const aiService = require('./ai.service');
const gupshupService = require('../integrations/gupshup/gupshup.service');
const logger = require('../utils/logger');

/**
 * Message Handler Service
 * Orchestrates message processing and response generation
 * 
 * This service contains the business logic for handling incoming messages
 * and coordinating between AI service and WhatsApp service.
 */
class MessageHandlerService {
  constructor() {
    this.pubSubInterface = null; // Optional Pub/Sub interface for async processing
  }

  /**
   * Set Pub/Sub interface for async message processing
   * @param {Object} pubSubInterface - Pub/Sub interface with publish method
   */
  setPubSubInterface(pubSubInterface) {
    this.pubSubInterface = pubSubInterface;
  }

  /**
   * Process incoming message and generate response
   * @param {Object} messageData - Parsed message data
   * @param {boolean} async - Whether to process asynchronously
   * @returns {Promise<Object>} - Response object
   */
  async processMessage(messageData, async = false) {
    try {
      const { from, message, messageType, messageId } = messageData;

      // Validate required fields
      if (!from || !message) {
        throw new Error('Missing required message data: from and message are required');
      }

      // If async processing is enabled and Pub/Sub is configured
      if (async && this.pubSubInterface) {
        await this.pubSubInterface.publish('message-received', {
          from,
          message,
          messageType,
          messageId,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          status: 'queued',
          message: 'Message queued for processing',
        };
      }

      // Process message synchronously
      return await this.processMessageSync(messageData);
    } catch (error) {
      logger.error({ error, messageData }, 'MessageHandlerService.processMessage failed');
      throw error;
    }
  }

  /**
   * Process message synchronously
   * @param {Object} messageData - Parsed message data
   * @returns {Promise<Object>} - Response object
   */
  async processMessageSync(messageData) {
    const { from, message, messageType, messageId } = messageData;

    logger.info({ from, messageType, messageId }, 'Processing message');

    // Route to appropriate handler based on message type
    let response;
    switch (messageType) {
      case 'text':
        response = await this.handleTextMessage(message);
        break;
      case 'image':
        response = await this.handleImageMessage(message, messageData);
        break;
      case 'interactive':
        response = await this.handleInteractiveMessage(messageData);
        break;
      case 'button':
        response = await this.handleButtonReply(messageData);
        break;
      default:
        response = await this.handleTextMessage(message);
    }

    // Send response via WhatsApp
    await gupshupService.sendTextMessage(from, response);

    // Mark original message as read (if messageId provided)
    if (messageId) {
      try {
        await gupshupService.markMessageAsRead(messageId);
      } catch (error) {
        // Don't fail if marking as read fails
        logger.warn({ error, messageId }, 'Failed to mark message as read');
      }
    }

    return {
      success: true,
      status: 'sent',
      to: from,
      response: response.substring(0, 100) + '...', // Truncate for logging
    };
  }

  /**
   * Handle text message
   * @param {string} message - Message text
   * @returns {Promise<string>} - AI-generated response
   */
  async handleTextMessage(message) {
    try {
      const aiResponse = await aiService.generateResponse(message);
      return aiResponse;
    } catch (error) {
      logger.error({ error, message }, 'Failed to generate AI response');
      throw error;
    }
  }

  /**
   * Handle image message
   * @param {string} message - Optional caption
   * @param {Object} messageData - Full message data
   * @returns {Promise<string>} - Response message
   */
  async handleImageMessage(message, messageData) {
    // For now, treat image messages as text with a note
    const caption = message || 'image';
    return await this.handleTextMessage(`[User sent an image${caption ? ` with caption: ${caption}` : ''}]`);
  }

  /**
   * Handle interactive message (list, buttons, etc.)
   * @param {Object} messageData - Full message data
   * @returns {Promise<string>} - Response message
   */
  async handleInteractiveMessage(messageData) {
    // Extract selected option from interactive message
    const selectedOption = messageData.selectedOption || messageData.buttonText || 'interactive selection';
    return await this.handleTextMessage(`User selected: ${selectedOption}`);
  }

  /**
   * Handle button reply
   * @param {Object} messageData - Full message data
   * @returns {Promise<string>} - Response message
   */
  async handleButtonReply(messageData) {
    const buttonText = messageData.buttonText || messageData.selectedButton || 'button';
    return await this.handleTextMessage(`User clicked: ${buttonText}`);
  }
}

module.exports = new MessageHandlerService();

