const axios = require('axios');
const gupshupService = require('../gupshup.service');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock config
jest.mock('../../../../config/gupshup.config', () => ({
  apiKey: 'test-api-key',
  appName: 'test-app',
  baseUrl: 'https://api.gupshup.io/sm/api/v1',
  webhookVerifyToken: 'test-token',
  webhookSecret: 'test-secret',
  validate: jest.fn(),
  getHeaders: jest.fn(() => ({ apikey: 'test-api-key', 'Content-Type': 'application/json' })),
  getJsonHeaders: jest.fn(() => ({ apikey: 'test-api-key', 'Content-Type': 'application/json' })),
}));

describe('GupshupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendTextMessage', () => {
    it('should send a text message successfully', async () => {
      const mockResponse = {
        data: {
          messageId: 'test-message-id',
          status: 'submitted',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await gupshupService.sendTextMessage('919876543210', 'Test message');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(result.to).toBe('919876543210');
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should throw error for empty message', async () => {
      await expect(
        gupshupService.sendTextMessage('919876543210', '')
      ).rejects.toThrow('Message cannot be empty');
    });

    it('should format phone number correctly', async () => {
      const mockResponse = {
        data: {
          messageId: 'test-message-id',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await gupshupService.sendTextMessage('+91 98765 43210', 'Test');

      expect(mockedAxios.post).toHaveBeenCalled();
      const callArgs = mockedAxios.post.mock.calls[0];
      expect(callArgs[1].destination).toBe('919876543210');
    });

    it('should retry on retryable errors', async () => {
      const mockError = {
        response: {
          status: 500,
        },
      };

      const mockSuccessResponse = {
        data: {
          messageId: 'test-message-id',
        },
      };

      mockedAxios.post
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await gupshupService.sendTextMessage('919876543210', 'Test');

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendTemplateMessage', () => {
    it('should send a template message successfully', async () => {
      const mockResponse = {
        data: {
          messageId: 'test-template-id',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await gupshupService.sendTemplateMessage(
        '919876543210',
        'welcome_template',
        ['John', 'Welcome']
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-template-id');
    });
  });

  describe('sendMediaMessage', () => {
    it('should send an image message successfully', async () => {
      const mockResponse = {
        data: {
          messageId: 'test-media-id',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await gupshupService.sendMediaMessage(
        '919876543210',
        'image',
        'https://example.com/image.jpg',
        'Test caption'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-media-id');
    });

    it('should throw error for invalid media type', async () => {
      await expect(
        gupshupService.sendMediaMessage(
          '919876543210',
          'invalid',
          'https://example.com/file.jpg'
        )
      ).rejects.toThrow('Invalid media type');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format phone number correctly', () => {
      const formatted = gupshupService.formatPhoneNumber('+91 98765 43210');
      expect(formatted).toBe('919876543210');
    });

    it('should throw error for invalid phone number', () => {
      expect(() => {
        gupshupService.formatPhoneNumber('123');
      }).toThrow('Invalid phone number format');
    });
  });
});

