require('dotenv').config();

/**
 * Gupshup WhatsApp Business API Configuration
 * Handles authentication and API endpoint setup
 */
class GupshupConfig {
  constructor() {
    this.apiKey = process.env.GUPSHUP_API_KEY;
    this.appName = process.env.GUPSHUP_APP_NAME;
    this.baseUrl = process.env.GUPSHUP_BASE_URL || 'https://api.gupshup.io/sm/api/v1';
    this.webhookVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
    this.webhookSecret = process.env.WEBHOOK_SECRET;
  }

  /**
   * Validate that all required configuration is present
   * @throws {Error} If required configuration is missing
   */
  validate() {
    if (!this.apiKey) {
      throw new Error('GUPSHUP_API_KEY is required in environment variables');
    }
    if (!this.appName) {
      throw new Error('GUPSHUP_APP_NAME is required in environment variables');
    }
    if (!this.webhookVerifyToken) {
      throw new Error('WEBHOOK_VERIFY_TOKEN is required in environment variables');
    }
    return true;
  }

  /**
   * Get headers for API requests
   * @returns {Object} Request headers
   */
  getHeaders() {
    return {
      'apikey': this.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  /**
   * Get JSON headers for API requests (for some endpoints)
   * @returns {Object} Request headers
   */
  getJsonHeaders() {
    return {
      'apikey': this.apiKey,
      'Content-Type': 'application/json',
    };
  }
}

module.exports = new GupshupConfig();

