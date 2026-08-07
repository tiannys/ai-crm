import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { publicLeadSchema } from '../schemas/public-lead.schema';
import {
  createWebsiteLead,
  PublicLeadOwnerUnavailableError,
} from '../services/public-lead.service';
import { createChildLogger } from '../lib/logger';

export const publicRouter = Router();
const log = createChildLogger('public-routes');

const publicLeadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

publicRouter.post('/leads', publicLeadLimiter, async (req, res) => {
  // Honeypot submissions receive a normal-looking response but are discarded.
  if (typeof req.body?.website === 'string' && req.body.website.trim()) {
    log.warn({ ip: req.ip }, 'Website lead honeypot triggered');
    res.status(201).json({ success: true });
    return;
  }

  const parsed = publicLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Please check the submitted information.',
      fields: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    await createWebsiteLead(parsed.data, req.ip);
    res.status(201).json({ success: true });
  } catch (error) {
    if (error instanceof PublicLeadOwnerUnavailableError) {
      log.error('Website lead rejected because no active owner is available');
      res.status(503).json({ error: 'Our inquiry form is temporarily unavailable.' });
      return;
    }

    log.error({ error }, 'Failed to create website lead');
    res.status(500).json({ error: 'Unable to submit your inquiry right now.' });
  }
});
