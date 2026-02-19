const WebhookParser = require('../webhook-parser');

describe('WebhookParser', () => {
  describe('parse', () => {
    it('should parse text message payload', () => {
      const payload = {
        payload: {
          type: 'text',
          text: 'Hello',
          from: '919876543210',
          id: 'msg-123',
        },
      };

      const result = WebhookParser.parse(payload);

      expect(result).toBeDefined();
      expect(result.messageType).toBe('text');
      expect(result.message).toBe('Hello');
      expect(result.from).toBe('919876543210');
    });

    it('should parse image message payload', () => {
      const payload = {
        payload: {
          type: 'image',
          url: 'https://example.com/image.jpg',
          caption: 'Test image',
          from: '919876543210',
        },
      };

      const result = WebhookParser.parse(payload);

      expect(result).toBeDefined();
      expect(result.messageType).toBe('image');
      expect(result.mediaUrl).toBe('https://example.com/image.jpg');
      expect(result.message).toBe('Test image');
    });

    it('should parse interactive message payload', () => {
      const payload = {
        payload: {
          type: 'interactive',
          buttonReply: {
            title: 'Option 1',
            id: 'btn-1',
          },
          from: '919876543210',
        },
      };

      const result = WebhookParser.parse(payload);

      expect(result).toBeDefined();
      expect(result.messageType).toBe('button');
      expect(result.buttonText).toBe('Option 1');
    });

    it('should return null for invalid payload', () => {
      const payload = {
        invalid: 'data',
      };

      const result = WebhookParser.parse(payload);

      expect(result).toBeNull();
    });

    it('should handle array payload', () => {
      const payload = [
        {
          type: 'text',
          text: 'Hello',
          from: '919876543210',
        },
      ];

      const result = WebhookParser.parse(payload);

      expect(result).toBeDefined();
      expect(result.messageType).toBe('text');
    });
  });

  describe('detectMessageType', () => {
    it('should detect text message', () => {
      const payload = { text: 'Hello' };
      const result = WebhookParser.detectMessageType(payload);
      expect(result).toBe('text');
    });

    it('should detect image message', () => {
      const payload = { image: { url: 'test.jpg' } };
      const result = WebhookParser.detectMessageType(payload);
      expect(result).toBe('image');
    });

    it('should detect button message', () => {
      const payload = { buttonReply: { title: 'Click' } };
      const result = WebhookParser.detectMessageType(payload);
      expect(result).toBe('button');
    });
  });

  describe('extractPhoneNumber', () => {
    it('should extract phone number from various fields', () => {
      expect(WebhookParser.extractPhoneNumber({ from: '919876543210' })).toBe('919876543210');
      expect(WebhookParser.extractPhoneNumber({ phone: '919876543210' })).toBe('919876543210');
      expect(WebhookParser.extractPhoneNumber({ phoneNumber: '919876543210' })).toBe('919876543210');
      expect(WebhookParser.extractPhoneNumber({ source: '919876543210' })).toBe('919876543210');
    });

    it('should return null if no phone number found', () => {
      expect(WebhookParser.extractPhoneNumber({})).toBeNull();
    });
  });
});

