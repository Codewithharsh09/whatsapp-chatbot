const axios = require('axios');
const gupshupConfig = require('../../../config/gupshup.config');
const logger = require('../../utils/logger');

/**
 * Gupshup WhatsApp Business API Service
 * Handles all interactions with Gupshup API
 * 
 * This service is isolated in the integrations layer following clean architecture principles.
 * All Gupshup-specific logic is contained here.
 */
class GupshupService {
  constructor() {
    this.config = gupshupConfig;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second base delay
    this.requestTimeout = 30000; // 30 seconds
  }

  /**
   * Send a text message via Gupshup API
   * @param {string} to - Recipient phone number (with country code, e.g., 919876543210)
   * @param {string} message - Message content to send
   * @returns {Promise<Object>} - API response with messageId and status
   */
  async sendTextMessage(to, message) {
    try {
      this.config.validate();

      const formattedNumber = this.formatPhoneNumber(to);

      if (!message || message.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }

      const payload = {
        channel: 'whatsapp',
        source: this.config.appName,
        destination: formattedNumber,
        message: {
          type: 'text',
          text: message.trim(),
        },
      };

      const response = await this.sendWithRetry(payload, 'msg');

      return {
        success: true,
        messageId: response.data?.messageId || response.data?.id,
        to: formattedNumber,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ error, to, message: 'Error sending text message' }, 'GupshupService.sendTextMessage failed');
      throw error;
    }
  }

  /**
   * Send a template message via Gupshup API
   * @param {string} to - Recipient phone number
   * @param {string} templateName - Name of the approved template
   * @param {Array<string>} params - Template parameters
   * @returns {Promise<Object>} - API response
   */
  async sendTemplateMessage(to, templateName, params = []) {
    try {
      this.config.validate();

      const formattedNumber = this.formatPhoneNumber(to);

      const payload = {
        channel: 'whatsapp',
        source: this.config.appName,
        destination: formattedNumber,
        message: {
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en',
            },
            components: params.length > 0 ? [
              {
                type: 'body',
                parameters: params.map(param => ({
                  type: 'text',
                  text: param,
                })),
              },
            ] : [],
          },
        },
      };

      const response = await this.sendWithRetry(payload, 'msg');

      return {
        success: true,
        messageId: response.data?.messageId || response.data?.id,
        to: formattedNumber,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ error, to, templateName }, 'GupshupService.sendTemplateMessage failed');
      throw error;
    }
  }

  /**
   * Send a media message (image, video, document) via Gupshup API
   * @param {string} to - Recipient phone number
   * @param {string} mediaType - Type of media: 'image', 'video', 'document', 'audio'
   * @param {string} mediaUrl - URL of the media file
   * @param {string} caption - Optional caption for the media
   * @param {string} filename - Optional filename for documents
   * @returns {Promise<Object>} - API response
   */
  async sendMediaMessage(to, mediaType, mediaUrl, caption = '', filename = '') {
    try {
      this.config.validate();

      const formattedNumber = this.formatPhoneNumber(to);

      if (!['image', 'video', 'document', 'audio'].includes(mediaType)) {
        throw new Error(`Invalid media type: ${mediaType}. Must be one of: image, video, document, audio`);
      }

      const messagePayload = {
        type: mediaType,
        [mediaType]: {
          url: mediaUrl,
        },
      };

      if (caption && (mediaType === 'image' || mediaType === 'video')) {
        messagePayload[mediaType].caption = caption;
      }

      if (filename && mediaType === 'document') {
        messagePayload[mediaType].filename = filename;
      }

      const payload = {
        channel: 'whatsapp',
        source: this.config.appName,
        destination: formattedNumber,
        message: messagePayload,
      };

      const response = await this.sendWithRetry(payload, 'msg');

      return {
        success: true,
        messageId: response.data?.messageId || response.data?.id,
        to: formattedNumber,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ error, to, mediaType }, 'GupshupService.sendMediaMessage failed');
      throw error;
    }
  }

  /**
   * Mark a message as read
   * @param {string} messageId - ID of the message to mark as read
   * @returns {Promise<Object>} - API response
   */
  async markMessageAsRead(messageId) {
    try {
      this.config.validate();

      const payload = {
        messageId,
      };

      const url = `${this.config.baseUrl}/messages/read`;
      const headers = this.config.getJsonHeaders();

      const response = await axios.post(url, payload, {
        headers,
        timeout: this.requestTimeout,
      });

      return {
        success: true,
        messageId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ error, messageId }, 'GupshupService.markMessageAsRead failed');
      throw error;
    }
  }

  /**
   * Send request with retry logic and exponential backoff
   * @param {Object} payload - Message payload
   * @param {string} endpoint - API endpoint ('msg' for messages)
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} - API response
   */
  async sendWithRetry(payload, endpoint = 'msg', attempt = 1) {
    try {
      const url = `${this.config.baseUrl}/${endpoint}`;
      
      // Gupshup API accepts both JSON and form-urlencoded
      // Using JSON format for better structure
      const headers = this.config.getJsonHeaders();
      
      // For Gupshup, we need to send the payload in their expected format
      // Convert nested message object to Gupshup format
      const gupshupPayload = this.formatPayloadForGupshup(payload);

      const response = await axios.post(url, gupshupPayload, {
        headers,
        timeout: this.requestTimeout,
      });

      return response;
    } catch (error) {
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        logger.warn({ attempt, delay, error: error.message }, 'Retrying Gupshup API request');
        
        await this.delay(delay);
        return this.sendWithRetry(payload, endpoint, attempt + 1);
      }

      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      throw new Error(
        `Failed to send message via Gupshup after ${attempt} attempts: ${errorMessage}`
      );
    }
  }

  /**
   * Format payload for Gupshup API
   * Gupshup API format - adjust based on actual API documentation
   * 
   * Note: Gupshup API format may vary. This implementation uses JSON format.
   * If your Gupshup account requires form-urlencoded, modify this method accordingly.
   * 
   * @param {Object} payload - Standard payload
   * @returns {Object} - Formatted payload for Gupshup
   */
  formatPayloadForGupshup(payload) {
    // Gupshup typically expects message as JSON string in 'message' field
    // For text messages, some implementations use direct 'message' field
    if (payload.message && payload.message.type === 'text') {
      // Option 1: Send message object as JSON string
      return {
        channel: payload.channel || 'whatsapp',
        source: payload.source || this.config.appName,
        destination: payload.destination,
        message: JSON.stringify(payload.message),
      };
    }
    
    // For all message types, send message object as JSON string
    // This is the most common Gupshup format
    return {
      channel: payload.channel || 'whatsapp',
      source: payload.source || this.config.appName,
      destination: payload.destination,
      message: JSON.stringify(payload.message),
    };
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error object
   * @returns {boolean} - True if error is retryable
   */
  isRetryableError(error) {
    if (!error.response) {
      // Network errors are retryable
      return true;
    }

    const status = error.response.status;
    // Retry on 5xx errors and rate limits (429)
    return status >= 500 || status === 429;
  }

  /**
   * Format phone number to Gupshup format (digits only, no + or spaces)
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Remove all non-digit characters
    const formatted = phoneNumber.replace(/\D/g, '');

    if (formatted.length < 10) {
      throw new Error('Invalid phone number format');
    }

    return formatted;
  }

  /**
   * Verify webhook signature (if Gupshup provides it)
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Webhook signature from headers
   * @returns {boolean} - True if signature is valid
   */
  verifyWebhookSignature(payload, signature) {
    // Gupshup may provide webhook signature verification
    // This is a placeholder - implement based on Gupshup's documentation
    if (!this.config.webhookSecret) {
      // If no secret configured, skip validation (not recommended for production)
      logger.warn('Webhook signature verification skipped - WEBHOOK_SECRET not configured');
      return true;
    }

    // TODO: Implement actual signature validation based on Gupshup's documentation
    // Example: HMAC-SHA256 verification
    return true;
  }

  /**
   * Delay helper for retries
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new GupshupService();

