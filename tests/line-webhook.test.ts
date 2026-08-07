import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// ─── Mock Prisma ─────────────────────────────────────────────────
const mockPrisma = {
  lineEvent: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  contact: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  lead: {
    findFirst: vi.fn(),
  },
  message: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  activity: {
    create: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

const {
  verifyLineSignature,
  processWebhookEvents,
  resetLineAdapter,
} = await import('@/lib/services/line.service');

describe('LINE Webhook - Security & Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLineAdapter();
  });

  describe('Signature Verification', () => {
    it('should verify a valid LINE webhook signature', () => {
      const channelSecret = 'test-channel-secret-12345';
      process.env.LINE_CHANNEL_SECRET = channelSecret;

      const body = JSON.stringify({
        destination: 'test',
        events: [{ type: 'message', webhookEventId: 'evt-1' }],
      });

      const expectedSignature = crypto
        .createHmac('SHA256', channelSecret)
        .update(body)
        .digest('base64');

      const result = verifyLineSignature(body, expectedSignature);
      expect(result).toBe(true);
    });

    it('should reject an invalid signature', () => {
      process.env.LINE_CHANNEL_SECRET = 'test-channel-secret-12345';

      const body = JSON.stringify({ events: [] });
      const invalidSignature = 'totally-wrong-signature';

      const result = verifyLineSignature(body, invalidSignature);
      expect(result).toBe(false);
    });

    it('should reject a tampered body', () => {
      const channelSecret = 'test-channel-secret-12345';
      process.env.LINE_CHANNEL_SECRET = channelSecret;

      const originalBody = JSON.stringify({ events: [{ type: 'message' }] });
      const tamperedBody = JSON.stringify({ events: [{ type: 'malicious' }] });

      const signature = crypto
        .createHmac('SHA256', channelSecret)
        .update(originalBody)
        .digest('base64');

      const result = verifyLineSignature(tamperedBody, signature);
      expect(result).toBe(false);
    });

    it('should reject when secret is configured but signature does not match', () => {
      process.env.LINE_CHANNEL_SECRET = 'a-real-secret-value';

      const result = verifyLineSignature('some-body', 'wrong-signature');
      expect(result).toBe(false);
    });
  });

  describe('Idempotency', () => {
    it('should skip duplicate events', async () => {
      const webhookBody = {
        destination: 'test',
        events: [
          {
            type: 'message',
            webhookEventId: 'evt-duplicate-1',
            message: { id: 'msg-1', type: 'text', text: 'Hello' },
            source: { type: 'user', userId: 'U123' },
            replyToken: 'reply-token-1',
            timestamp: Date.now(),
          },
        ],
      };

      // Simulate: event already exists in database
      mockPrisma.lineEvent.findUnique.mockResolvedValue({
        id: 'existing-event-id',
        lineEventId: 'evt-duplicate-1',
        processingStatus: 'PROCESSED',
      });

      const result = await processWebhookEvents(webhookBody);

      expect(result.skipped).toBe(1);
      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);

      // Should NOT create a new event or message
      expect(mockPrisma.lineEvent.create).not.toHaveBeenCalled();
      expect(mockPrisma.message.create).not.toHaveBeenCalled();
    });

    it('should process a new event and store it', async () => {
      const webhookBody = {
        destination: 'test',
        events: [
          {
            type: 'message',
            webhookEventId: 'evt-new-1',
            message: { id: 'msg-1', type: 'text', text: 'สวัสดีครับ' },
            source: { type: 'user', userId: 'U456' },
            replyToken: 'reply-token-2',
            timestamp: Date.now(),
          },
        ],
      };

      // No existing event
      mockPrisma.lineEvent.findUnique.mockResolvedValue(null);
      mockPrisma.lineEvent.create.mockResolvedValue({ id: 'new-event' });
      mockPrisma.lineEvent.update.mockResolvedValue({});

      // Contact exists
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'contact-1',
        firstName: 'Test',
        lastName: 'User',
        lineUserId: 'U456',
        company: null,
        leads: [],
      });

      // No active lead
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      // Message creation
      mockPrisma.message.create.mockResolvedValue({ id: 'new-message' });

      const result = await processWebhookEvents(webhookBody);

      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(0);

      // Should create idempotency record
      expect(mockPrisma.lineEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lineEventId: 'evt-new-1',
            lineUserId: 'U456',
          }),
        })
      );

      // Should create message
      expect(mockPrisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contactId: 'contact-1',
            channel: 'LINE',
            direction: 'INBOUND',
            content: 'สวัสดีครับ',
          }),
        })
      );

      // Should mark event as processed
      expect(mockPrisma.lineEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { lineEventId: 'evt-new-1' },
          data: expect.objectContaining({
            processingStatus: 'PROCESSED',
          }),
        })
      );
    });

    it('should handle processing errors gracefully', async () => {
      const webhookBody = {
        destination: 'test',
        events: [
          {
            type: 'message',
            webhookEventId: 'evt-error-1',
            message: { id: 'msg-1', type: 'text', text: 'test' },
            source: { type: 'user', userId: 'U789' },
            replyToken: 'reply-token-3',
            timestamp: Date.now(),
          },
        ],
      };

      // No existing event
      mockPrisma.lineEvent.findUnique.mockResolvedValue(null);
      mockPrisma.lineEvent.create.mockResolvedValue({ id: 'event-1' });

      // Simulate error in contact lookup
      mockPrisma.contact.findUnique.mockRejectedValue(new Error('DB connection failed'));

      // Mark as failed
      mockPrisma.lineEvent.update.mockResolvedValue({});

      const result = await processWebhookEvents(webhookBody);

      expect(result.errors).toBe(1);
      expect(result.processed).toBe(0);

      // Should mark event as FAILED
      expect(mockPrisma.lineEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            processingStatus: 'FAILED',
          }),
        })
      );
    });

    it('should handle multiple events in a single webhook', async () => {
      const webhookBody = {
        destination: 'test',
        events: [
          {
            type: 'message',
            webhookEventId: 'evt-multi-1',
            message: { id: 'msg-1', type: 'text', text: 'Hello' },
            source: { type: 'user', userId: 'U111' },
            replyToken: 'r1',
            timestamp: Date.now(),
          },
          {
            type: 'message',
            webhookEventId: 'evt-multi-2',
            message: { id: 'msg-2', type: 'text', text: 'World' },
            source: { type: 'user', userId: 'U111' },
            replyToken: 'r2',
            timestamp: Date.now(),
          },
        ],
      };

      // First event is duplicate, second is new
      mockPrisma.lineEvent.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // first: duplicate
        .mockResolvedValueOnce(null); // second: new

      mockPrisma.lineEvent.create.mockResolvedValue({ id: 'new-event' });
      mockPrisma.lineEvent.update.mockResolvedValue({});
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: 'c1',
        firstName: 'User',
        lastName: '111',
        lineUserId: 'U111',
        company: null,
        leads: [],
      });
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      mockPrisma.message.create.mockResolvedValue({ id: 'msg' });

      const result = await processWebhookEvents(webhookBody);

      expect(result.skipped).toBe(1);
      expect(result.processed).toBe(1);
    });
  });
});
