const logger = require('./logger');

/**
 * Webhook Parser Utility
 * Parses Gupshup webhook payloads into standardized message format
 * 
 * Handles different message types: text, image, interactive, button replies
 */
class WebhookParser {
  /**
   * Parse Gupshup webhook payload
   * @param {Object} payload - Raw webhook payload from Gupshup
   * @returns {Object|null} - Parsed message data or null if invalid
   */
  static parse(payload) {
    try {
      // Gupshup webhook structure may vary
      // Common structure: payload contains 'payload' object with message data
      
      let messageData = null;

      // Structure 1: Direct payload structure
      if (payload.payload) {
        messageData = this.parsePayload(payload.payload);
      }
      // Structure 2: Direct message structure
      else if (payload.type || payload.message) {
        messageData = this.parsePayload(payload);
      }
      // Structure 3: Array of events
      else if (Array.isArray(payload) && payload.length > 0) {
        messageData = this.parsePayload(payload[0]);
      }

      if (!messageData) {
        logger.warn({ payload }, 'Unknown webhook structure');
        return null;
      }

      return messageData;
    } catch (error) {
      logger.error({ error, payload }, 'Error parsing webhook payload');
      return null;
    }
  }

  /**
   * Parse individual payload object
   * @param {Object} payload - Payload object
   * @returns {Object|null} - Parsed message data
   */
  static parsePayload(payload) {
    const messageType = this.detectMessageType(payload);
    
    if (!messageType) {
      return null;
    }

    const baseData = {
      from: this.extractPhoneNumber(payload),
      messageId: payload.id || payload.messageId || payload.msgId,
      timestamp: payload.timestamp || new Date().toISOString(),
      messageType,
    };

    switch (messageType) {
      case 'text':
        return {
          ...baseData,
          message: payload.text || payload.message || payload.body || '',
        };

      case 'image':
        return {
          ...baseData,
          message: payload.caption || payload.text || '',
          mediaUrl: payload.url || payload.mediaUrl || payload.image?.url,
          mimeType: payload.mimeType || payload.image?.mimeType || 'image/jpeg',
        };

      case 'video':
        return {
          ...baseData,
          message: payload.caption || payload.text || '',
          mediaUrl: payload.url || payload.mediaUrl || payload.video?.url,
          mimeType: payload.mimeType || payload.video?.mimeType || 'video/mp4',
        };

      case 'document':
        return {
          ...baseData,
          message: payload.caption || payload.filename || '',
          mediaUrl: payload.url || payload.mediaUrl || payload.document?.url,
          filename: payload.filename || payload.document?.filename,
          mimeType: payload.mimeType || payload.document?.mimeType,
        };

      case 'audio':
        return {
          ...baseData,
          mediaUrl: payload.url || payload.mediaUrl || payload.audio?.url,
          mimeType: payload.mimeType || payload.audio?.mimeType || 'audio/ogg',
        };

      case 'interactive':
        return {
          ...baseData,
          message: payload.text || '',
          selectedOption: payload.selectedOption || payload.listReply?.title || payload.buttonReply?.title,
          buttonText: payload.buttonText || payload.buttonReply?.title,
          interactiveType: payload.interactiveType || payload.type,
        };

      case 'button':
        return {
          ...baseData,
          message: payload.text || '',
          buttonText: payload.buttonText || payload.buttonReply?.title || payload.selectedButton,
          buttonId: payload.buttonId || payload.buttonReply?.id,
        };

      default:
        return {
          ...baseData,
          message: payload.text || payload.message || payload.body || '',
        };
    }
  }

  /**
   * Detect message type from payload
   * @param {Object} payload - Payload object
   * @returns {string|null} - Message type or null
   */
  static detectMessageType(payload) {
    // Check explicit type field
    if (payload.type) {
      return payload.type.toLowerCase();
    }

    // Check for media fields
    if (payload.image || payload.mediaType === 'image') {
      return 'image';
    }
    if (payload.video || payload.mediaType === 'video') {
      return 'video';
    }
    if (payload.document || payload.mediaType === 'document') {
      return 'document';
    }
    if (payload.audio || payload.mediaType === 'audio') {
      return 'audio';
    }

    // Check for interactive elements
    if (payload.interactive || payload.listReply || payload.buttonReply) {
      if (payload.buttonReply || payload.buttonText) {
        return 'button';
      }
      return 'interactive';
    }

    // Default to text
    if (payload.text || payload.message || payload.body) {
      return 'text';
    }

    return null;
  }

  /**
   * Extract phone number from payload
   * @param {Object} payload - Payload object
   * @returns {string|null} - Phone number or null
   */
  static extractPhoneNumber(payload) {
    // Try various field names
    return payload.from || 
           payload.phone || 
           payload.phoneNumber || 
           payload.source || 
           payload.sender ||
           payload.waId ||
           null;
  }
}

module.exports = WebhookParser;

