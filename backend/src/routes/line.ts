import express, { Router, Request } from 'express';
import { authMiddleware, AuthPayload } from '../lib/auth';
import { createChildLogger } from '../lib/logger';
import { verifyLineSignature, processWebhookEvents, sendLineReply } from '../services/line.service';
import { prisma } from '../lib/prisma';

const log = createChildLogger('line-routes');
export const lineRouter = Router();

type AuthRequest = Request & { user: AuthPayload };

// ─── Webhook (NO auth — LINE calls this) ─────────────────────────
lineRouter.post('/webhook', express.text({ type: '*/*' }), async (req, res) => {
  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = req.headers['x-line-signature'] as string || '';

    if (!verifyLineSignature(rawBody, signature)) {
      log.warn('Invalid LINE webhook signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!body.events || body.events.length === 0) {
      res.json({ success: true });
      return;
    }

    const result = await processWebhookEvents(body);
    log.info(result, 'Webhook events processed');
    res.json({ success: true, ...result });
  } catch (error) {
    log.error({ error }, 'Webhook error');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

lineRouter.get('/webhook', (_req, res) => {
  res.json({ status: 'LINE webhook endpoint active' });
});

// ─── Create Draft (requires auth) ────────────────────────────────
lineRouter.post('/draft', express.json(), authMiddleware, async (req, res) => {
  try {
    const { leadId, content } = req.body;
    if (!leadId || !content) {
      res.status(400).json({ error: 'leadId and content required' });
      return;
    }

    // Find the lead's contact
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true },
    });

    if (!lead || !lead.contact) {
      res.status(404).json({ error: 'Lead or contact not found' });
      return;
    }

    // Create outbound DRAFT message
    const message = await prisma.message.create({
      data: {
        contactId: lead.contact.id,
        leadId: lead.id,
        channel: 'LINE',
        direction: 'OUTBOUND',
        content,
        status: 'APPROVED', // Ready to send
        metadata: { aiGenerated: false },
      },
    });

    log.info({ messageId: message.id, leadId }, 'Draft message created');
    res.status(201).json({ messageId: message.id });
  } catch (error) {
    log.error({ error }, 'Draft creation failed');
    res.status(500).json({ error: 'Failed to create draft' });
  }
});

// ─── Reply (requires auth) ───────────────────────────────────────
lineRouter.post('/reply', express.json(), authMiddleware, async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    const { messageId, action, editedContent } = req.body;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) { res.status(404).json({ error: 'Message not found' }); return; }

    switch (action) {
      case 'approve': {
        await prisma.message.update({
          where: { id: messageId },
          data: { status: 'APPROVED', approvedBy: user.id, approvedAt: new Date() },
        });
        const result = await sendLineReply(messageId, user.id);
        res.json(result);
        return;
      }
      case 'edit': {
        if (!editedContent) { res.status(400).json({ error: 'editedContent required' }); return; }
        await prisma.message.update({
          where: { id: messageId },
          data: { content: editedContent, status: 'DRAFT' },
        });
        res.json({ success: true, message: 'Draft updated' });
        return;
      }
      case 'reject': {
        await prisma.message.update({
          where: { id: messageId },
          data: { status: 'FAILED' },
        });
        res.json({ success: true, message: 'Draft rejected' });
        return;
      }
      default:
        res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Reply failed' });
  }
});

// ─── Push Message to Contact (requires auth) ─────────────────────
lineRouter.post('/push', express.json(), authMiddleware, async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    const { contactId, content, leadId } = req.body;
    if (!contactId || !content) {
      res.status(400).json({ error: 'contactId and content required' });
      return;
    }

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || !contact.lineUserId) {
      res.status(400).json({ error: 'Contact has no LINE connection' });
      return;
    }

    // Create outbound message record
    const message = await prisma.message.create({
      data: {
        contactId: contact.id,
        ...(leadId && { leadId }),
        channel: 'LINE',
        direction: 'OUTBOUND',
        content,
        status: 'APPROVED',
        approvedBy: user.id,
        approvedAt: new Date(),
        metadata: { sentFrom: 'contact_page' },
      },
    });

    // Send via LINE push
    const result = await sendLineReply(message.id, user.id);
    if (result.success) {
      res.json({ success: true, messageId: message.id });
    } else {
      res.status(500).json({ error: result.error || 'Failed to send' });
    }
  } catch (error) {
    log.error({ error }, 'Push message failed');
    res.status(500).json({ error: 'Push message failed' });
  }
});
