require('dotenv').config();
const axios = require('axios');
const openRouterConfig = require('../../config/openrouter.config');
const contextBuilder = require('../utils/context-builder');
const logger = require('../utils/logger');

/**
 * AI Service
 * Handles OpenRouter AI integration for message analysis and response generation
 * using direct Axios calls and robust fallback logic.
 */
class AIService {
  constructor() {
    this.systemPrompt = null;
    this.initialize();
  }

  /**
   * Initialize system prompt
   */
  initialize() {
    try {
      openRouterConfig.validate();
      this.systemPrompt = contextBuilder.buildSystemPrompt();
      logger.info('AI Service initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Error initializing AI Service');
      logger.error('Please check your OPENROUTER_API_KEY in .env file');
      throw error;
    }
  }

  /**
   * Call OpenRouter API with retry logic and free model fallback
   * Adapted from user provided code.
   */
  async callOpenRouter(prompt, retries = 2) {
    if (!openRouterConfig.apiKey) {
      throw new Error('OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in .env file');
    }

    // Determine which models to try
    let modelsToTry = [openRouterConfig.model];

    // If using a free model, add other free models as fallbacks
    // We check if the configured model is in our free list or explicitly marked free
    if (openRouterConfig.model.includes(':free') || (openRouterConfig.validModels && openRouterConfig.validModels.includes(openRouterConfig.model))) {
      // Ensure we have validModels defined in config, fallback to empty array if not
      const validModels = openRouterConfig.validModels || [];
      modelsToTry = [openRouterConfig.model, ...validModels.filter(m => m !== openRouterConfig.model)];
    }

    let lastError = null;

    // Try each model
    for (const model of modelsToTry) {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          logger.debug({ model, attempt: attempt + 1, retries }, 'Attempting OpenRouter API call');

          const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions', // Use direct URL as config might have issues
            {
              model: model,
              messages: [
                {
                  role: 'system',
                  content: this.systemPrompt || 'You are a helpful assistant.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.7,
              max_tokens: 500
            },
            {
              headers: {
                'Authorization': `Bearer ${openRouterConfig.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/your-repo', // Optional
                'X-Title': 'WhatsApp Laundry Chatbot' // Optional
              },
              timeout: 30000
            }
          );

          if (model !== openRouterConfig.model) {
            logger.info({ model }, 'Successfully used fallback model');
          }

          // Check for response structure
          if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
            return response.data.choices[0].message.content;
          } else {
            throw new Error('Invalid response structure from API');
          }

        } catch (error) {
          const errorData = error.response?.data;
          const errorCode = errorData?.error?.code;
          // const errorMessage = errorData?.error?.message || error.message; 

          lastError = error;

          // Handle rate limit errors (429) - try next model or retry
          if (errorCode === 429 || error.response?.status === 429) {
            if (attempt < retries - 1) {
              // Exponential backoff: wait 1s, 2s
              const waitTime = Math.pow(2, attempt) * 1000;
              logger.warn({ model, waitTime: waitTime / 1000 }, 'Model rate limited, retrying');
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            } else {
              // This model failed, try next one
              logger.warn({ model }, 'Model unavailable (rate limited), trying next model');
              break; // Break inner loop, continue to next model
            }
          }

          // Handle other errors - try next model
          if (errorCode === 400 || error.response?.status === 400) {
            logger.warn({ model }, 'Model returned error (400), trying next model');
            break; // Try next model
          }

          // For 401: Invalid API key
          if (errorCode === 401 || error.response?.status === 401) {
            throw new Error('Invalid API key. Please check your OPENROUTER_API_KEY in .env file.');
          } else if (error.response?.status >= 500) {
            logger.warn({ model }, 'Model server error (5xx), trying next model');
            break; // Try next model
          }

          // Fallback for other errors (network, timeout)
          logger.warn({ model, error: error.message }, 'Model error, trying next model');
          break;
        }
      }
    }

    // All models failed
    const errorData = lastError?.response?.data;
    const rawError = errorData?.error?.metadata?.raw || '';

    if (rawError && rawError.includes('rate-limited')) {
      throw new Error('All free models are currently rate-limited. Please wait a few minutes and try again.');
    }

    throw new Error(lastError?.message || 'All available models are temporarily unavailable. Please try again in a few moments.');
  }

  /**
   * Generate AI response based on customer message
   * @param {string} customerMessage - The message from the customer
   * @returns {Promise<string>} - AI-generated response
   */
  async generateResponse(customerMessage) {
    try {
      if (!customerMessage || customerMessage.trim().length === 0) {
        return 'Hello! How can I help you with your laundry service needs today?';
      }

      const prompt = `Customer Message: "${customerMessage}"\n\nPlease provide a helpful response based on the company information above.`;

      // Generate response using OpenRouter with fallback logic
      const text = await this.callOpenRouter(prompt);

      // Validate and sanitize response
      const sanitizedResponse = this.sanitizeResponse(text);

      return sanitizedResponse;
    } catch (error) {
      logger.error({ error, customerMessage }, 'Error generating AI response');

      // Fallback response
      const companyProfile = contextBuilder.getCompanyProfile();
      return `I apologize, but I encountered an error. Please contact us directly at ${companyProfile.contactInfo.phone} or ${companyProfile.contactInfo.email}.`;
    }
  }

  /**
   * Sanitize and validate AI response
   * @param {string} response - Raw AI response
   * @returns {string} - Sanitized response
   */
  sanitizeResponse(response) {
    if (!response) {
      return 'I apologize, but I couldn\'t generate a response. Please try again or contact us directly.';
    }

    // Remove any markdown formatting if present
    let sanitized = response.trim();

    // Remove markdown code blocks
    sanitized = sanitized.replace(/```[\s\S]*?```/g, '');

    // Remove markdown headers
    sanitized = sanitized.replace(/^#+\s+/gm, '');

    // Ensure response is not too long (WhatsApp message limit)
    const maxLength = 4096;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength - 50) + '...\n\nFor more information, please contact us directly.';
    }

    return sanitized;
  }

  /**
   * Reload system prompt (useful when company profile is updated)
   */
  reloadContext() {
    this.systemPrompt = contextBuilder.buildSystemPrompt();
    logger.info('AI Service context reloaded');
  }
}

// Export singleton instance
module.exports = new AIService();
