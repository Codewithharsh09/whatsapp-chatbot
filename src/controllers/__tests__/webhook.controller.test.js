const webhookController = require('../webhook.controller');
const gupshupConfig = require('../../../config/gupshup.config');
const messageHandlerService = require('../../services/message-handler.service');
const WebhookParser = require('../../utils/webhook-parser');

// Mock dependencies
jest.mock('../../../config/gupshup.config');
jest.mock('../../services/message-handler.service');
jest.mock('../../utils/webhook-parser');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('WebhookController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      query: {},
      body: {},
      headers: {},
      path: '/webhook/gupshup',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('verify', () => {
    it('should verify webhook with correct token', async () => {
      req.query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-token',
        'hub.challenge': 'test-challenge',
      };
      gupshupConfig.webhookVerifyToken = 'test-token';

      await webhookController.verify(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('test-challenge');
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject webhook with incorrect token', async () => {
      req.query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'test-challenge',
      };
      gupshupConfig.webhookVerifyToken = 'test-token';

      await webhookController.verify(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    it('should process webhook message successfully', async () => {
      const mockMessageData = {
        from: '919876543210',
        message: 'Hello',
        messageType: 'text',
        messageId: 'msg-123',
      };

      WebhookParser.parse.mockReturnValue(mockMessageData);
      messageHandlerService.processMessage.mockResolvedValue({
        success: true,
        status: 'sent',
      });
      gupshupConfig.appName = 'test-app';

      await webhookController.handleWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(WebhookParser.parse).toHaveBeenCalledWith(req.body);
      expect(messageHandlerService.processMessage).toHaveBeenCalledWith(
        mockMessageData,
        false
      );
    });

    it('should handle invalid webhook payload', async () => {
      WebhookParser.parse.mockReturnValue(null);

      await webhookController.handleWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(messageHandlerService.processMessage).not.toHaveBeenCalled();
    });

    it('should ignore messages from bot itself', async () => {
      const mockMessageData = {
        from: 'test-app',
        message: 'Hello',
        messageType: 'text',
      };

      WebhookParser.parse.mockReturnValue(mockMessageData);
      gupshupConfig.appName = 'test-app';

      await webhookController.handleWebhook(req, res, next);

      expect(messageHandlerService.processMessage).not.toHaveBeenCalled();
    });
  });
});

