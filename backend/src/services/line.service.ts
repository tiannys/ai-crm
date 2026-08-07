import crypto from 'crypto';
import { createChildLogger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { findContactByLineUserId } from './crm.service';

const log = createChildLogger('line-service');

// ─── Types ───────────────────────────────────────────────────────
interface LineWebhookEvent {
  type: string;
  message?: {
    id: string;
    type: string;
    text?: string;
  };
  source?: {
    type: string;
    userId?: string;
  };
  replyToken?: string;
  timestamp: number;
  webhookEventId: string;
}

interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

// ─── Adapters ────────────────────────────────────────────────────
export interface LineAdapter {
  replyMessage(replyToken: string, message: string): Promise<boolean>;
  pushMessage(userId: string, message: string): Promise<boolean>;
  getProfile(userId: string): Promise<{ displayName: string; userId: string } | null>;
}

// Real LINE API adapter
class RealLineAdapter implements LineAdapter {
  private channelAccessToken: string;
  private baseUrl = 'https://api.line.me/v2/bot';

  constructor(token: string) {
    this.channelAccessToken = token;
  }

  async replyMessage(replyToken: string, message: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/message/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: [{ type: 'text', text: message }],
        }),
      });
      return res.ok;
    } catch (error) {
      log.error({ error }, 'LINE reply failed');
      return false;
    }
  }

  async pushMessage(userId: string, message: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/message/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          to: userId,
          messages: [{ type: 'text', text: message }],
        }),
      });
      return res.ok;
    } catch (error) {
      log.error({ error }, 'LINE push failed');
      return false;
    }
  }

  async getProfile(userId: string): Promise<{ displayName: string; userId: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/profile/${userId}`, {
        headers: { Authorization: `Bearer ${this.channelAccessToken}` },
      });
      if (!res.ok) return null;
      const data: unknown = await res.json();
      if (typeof data !== 'object' || data === null) return null;

      const profile = data as Record<string, unknown>;
      if (typeof profile.displayName !== 'string' || typeof profile.userId !== 'string') {
        log.warn({ userId }, 'LINE profile response was invalid');
        return null;
      }

      return { displayName: profile.displayName, userId: profile.userId };
    } catch {
      return null;
    }
  }
}

// Mock adapter for testing
class MockLineAdapter implements LineAdapter {
  public sentMessages: { to: string; message: string; type: string }[] = [];

  async replyMessage(replyToken: string, message: string): Promise<boolean> {
    log.info({ replyToken, message }, '[MOCK] LINE reply');
    this.sentMessages.push({ to: replyToken, message, type: 'reply' });
    return true;
  }

  async pushMessage(userId: string, message: string): Promise<boolean> {
    log.info({ userId, message }, '[MOCK] LINE push');
    this.sentMessages.push({ to: userId, message, type: 'push' });
    return true;
  }

  async getProfile(userId: string): Promise<{ displayName: string; userId: string } | null> {
    return { displayName: `Mock User ${userId.slice(-4)}`, userId };
  }
}

// ─── Factory ─────────────────────────────────────────────────────
let adapterInstance: LineAdapter | null = null;

export function getLineAdapter(): LineAdapter {
  if (adapterInstance) return adapterInstance;

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || process.env.LINE_USE_MOCK === 'true') {
    log.warn('Using mock LINE adapter');
    adapterInstance = new MockLineAdapter();
  } else {
    adapterInstance = new RealLineAdapter(token);
  }

  return adapterInstance;
}

// For testing
export function setLineAdapter(adapter: LineAdapter) {
  adapterInstance = adapter;
}

export function resetLineAdapter() {
  adapterInstance = null;
}

// ─── Webhook Signature Verification ──────────────────────────────
export function verifyLineSignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    log.warn('LINE channel secret not configured, skipping verification in dev');
    return process.env.NODE_ENV === 'development';
  }

  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');

  return hash === signature;
}

// ─── Webhook Event Processing ────────────────────────────────────
export async function processWebhookEvents(body: LineWebhookBody): Promise<{
  processed: number;
  skipped: number;
  errors: number;
}> {
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const event of body.events) {
    try {
      // Idempotency check
      const existing = await prisma.lineEvent.findUnique({
        where: { lineEventId: event.webhookEventId },
      });

      if (existing) {
        log.info({ eventId: event.webhookEventId }, 'Duplicate event, skipping');
        skipped++;
        continue;
      }

      // Store event for idempotency
      await prisma.lineEvent.create({
        data: {
          lineEventId: event.webhookEventId,
          lineUserId: event.source?.userId || 'unknown',
          eventType: event.type,
          rawPayload: JSON.parse(JSON.stringify(event)),
          processingStatus: 'RECEIVED',
        },
      });

      // Process based on event type
      if (event.type === 'message' && event.message?.type === 'text') {
        await processTextMessage(event);
      }

      // Mark as processed
      await prisma.lineEvent.update({
        where: { lineEventId: event.webhookEventId },
        data: { processingStatus: 'PROCESSED', processedAt: new Date() },
      });

      processed++;
    } catch (error) {
      log.error({ error, eventId: event.webhookEventId }, 'Event processing failed');

      // Mark as failed
      try {
        await prisma.lineEvent.update({
          where: { lineEventId: event.webhookEventId },
          data: { processingStatus: 'FAILED' },
        });
      } catch {
        // Event might not have been created yet
      }

      errors++;
    }
  }

  return { processed, skipped, errors };
}

async function processTextMessage(event: LineWebhookEvent) {
  const lineUserId = event.source?.userId;
  const text = event.message?.text;
  const messageId = event.message?.id;

  if (!lineUserId || !text) return;

  // ─── 1. Find or create Contact ─────────────────────────────────
  let contact = await findContactByLineUserId(lineUserId);

  if (!contact) {
    const adapter = getLineAdapter();
    const profile = await adapter.getProfile(lineUserId);

    contact = await prisma.contact.create({
      data: {
        firstName: profile?.displayName || 'LINE User',
        lastName: lineUserId.slice(-4),
        lineUserId,
        lineDisplayName: profile?.displayName,
      },
      include: { company: true, leads: true },
    });

    log.info({ contactId: contact.id, lineUserId }, 'Created new contact from LINE');
  }

  // ─── 2. Find active lead (if any) ─────────────────────────────
  const activeLead = await prisma.lead.findFirst({
    where: {
      contactId: contact.id,
      stage: { notIn: ['WON', 'LOST'] },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // ─── 3. Store inbound message ──────────────────────────────────
  await prisma.message.create({
    data: {
      contactId: contact.id,
      leadId: activeLead?.id || null,
      channel: 'LINE',
      direction: 'INBOUND',
      content: text,
      lineMessageId: messageId,
      status: 'RECEIVED',
      metadata: { lineUserId, replyToken: event.replyToken },
    },
  });

  // ─── 4. Create activity if linked to a lead ───────────────────
  if (activeLead) {
    const defaultOwner = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (defaultOwner) {
      await prisma.activity.create({
        data: {
          leadId: activeLead.id,
          userId: defaultOwner.id,
          type: 'LINE_MESSAGE',
          description: `LINE message from ${contact.firstName}: "${text.slice(0, 100)}"`,
          metadata: { lineMessageId: messageId, lineUserId },
        },
      });
    }
  }

  // ─── 5. Send auto-acknowledgment ───────────────────────────────
  if (event.replyToken) {
    const adapter = getLineAdapter();
    await adapter.replyMessage(
      event.replyToken,
      'ขอบคุณที่ติดต่อเข้ามาค่ะ ทีมงานกำลังดูแลข้อความของคุณอยู่ จะติดต่อกลับโดยเร็วที่สุดค่ะ 🙏'
    ).catch((err) => {
      log.error({ error: err }, 'Auto-acknowledgment failed');
    });
  }

  log.info({ contactId: contact.id, leadId: activeLead?.id }, 'Processed LINE text message');
}

// ─── Send Reply ──────────────────────────────────────────────────
export async function sendLineReply(
  messageId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { contact: true },
  });

  if (!message) return { success: false, error: 'Message not found' };
  if (message.status !== 'APPROVED') return { success: false, error: 'Message not approved' };

  const lineUserId = message.contact.lineUserId;
  if (!lineUserId) return { success: false, error: 'Contact has no LINE user ID' };

  const adapter = getLineAdapter();
  const sent = await adapter.pushMessage(lineUserId, message.content);

  if (sent) {
    await prisma.message.update({
      where: { id: messageId },
      data: { status: 'SENT' },
    });
    log.info({ messageId }, 'LINE reply sent');
    return { success: true };
  } else {
    await prisma.message.update({
      where: { id: messageId },
      data: { status: 'FAILED' },
    });
    return { success: false, error: 'Failed to send LINE message' };
  }
}
