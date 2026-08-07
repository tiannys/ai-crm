import { Router } from 'express';
import { authMiddleware } from '../lib/auth';
import {
  generateLeadSummary,
  generateQualificationScore,
  generateNextAction,
  generateDraftReply,
} from '../services/ai.service';

export const aiRouter = Router();

// All AI routes require authentication
aiRouter.use(authMiddleware);

aiRouter.post('/summarize', async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) { res.status(400).json({ error: 'leadId required' }); return; }
    const result = await generateLeadSummary(leadId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'AI summary failed' });
  }
});

aiRouter.post('/score', async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) { res.status(400).json({ error: 'leadId required' }); return; }
    const result = await generateQualificationScore(leadId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'AI scoring failed' });
  }
});

aiRouter.post('/next-action', async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) { res.status(400).json({ error: 'leadId required' }); return; }
    const result = await generateNextAction(leadId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'AI next-action failed' });
  }
});

aiRouter.post('/draft-reply', async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) { res.status(400).json({ error: 'leadId required' }); return; }
    const result = await generateDraftReply(leadId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'AI draft-reply failed' });
  }
});
