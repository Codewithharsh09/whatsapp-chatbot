const Joi = require('joi');

/**
 * Validation Schemas using Joi
 * Centralized validation schemas for request validation
 */

// Webhook verification schema (GET request)
const webhookVerificationSchema = Joi.object({
  'hub.mode': Joi.string().valid('subscribe').required(),
  'hub.verify_token': Joi.string().required(),
  'hub.challenge': Joi.string().optional(),
});

// Webhook payload schema (POST request)
const webhookPayloadSchema = Joi.object({
  payload: Joi.alternatives().try(
    Joi.object({
      type: Joi.string().optional(),
      text: Joi.string().optional(),
      message: Joi.string().optional(),
      body: Joi.string().optional(),
      from: Joi.string().required(),
      id: Joi.string().optional(),
      messageId: Joi.string().optional(),
      msgId: Joi.string().optional(),
      timestamp: Joi.string().optional(),
    }),
    Joi.array().items(Joi.object()).min(1)
  ).optional(),
  type: Joi.string().optional(),
  text: Joi.string().optional(),
  message: Joi.string().optional(),
  from: Joi.string().optional(),
  id: Joi.string().optional(),
  messageId: Joi.string().optional(),
}).unknown(true); // Allow additional fields

// Send message schema
const sendMessageSchema = Joi.object({
  to: Joi.string().pattern(/^[0-9]+$/).min(10).max(15).required(),
  message: Joi.string().min(1).max(4096).required(),
});

// Send template message schema
const sendTemplateSchema = Joi.object({
  to: Joi.string().pattern(/^[0-9]+$/).min(10).max(15).required(),
  templateName: Joi.string().min(1).required(),
  params: Joi.array().items(Joi.string()).optional().default([]),
});

// Send media message schema
const sendMediaSchema = Joi.object({
  to: Joi.string().pattern(/^[0-9]+$/).min(10).max(15).required(),
  mediaType: Joi.string().valid('image', 'video', 'document', 'audio').required(),
  mediaUrl: Joi.string().uri().required(),
  caption: Joi.string().max(1024).optional().default(''),
  filename: Joi.string().optional().default(''),
});

module.exports = {
  webhookVerificationSchema,
  webhookPayloadSchema,
  sendMessageSchema,
  sendTemplateSchema,
  sendMediaSchema,
};

