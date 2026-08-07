import { Router } from 'express';
import { authMiddleware, requireRole } from '../lib/auth';
import { getAuditLogs } from '../services/audit.service';

export const auditRouter = Router();

// All audit routes require ADMIN
auditRouter.use(authMiddleware);
auditRouter.use(requireRole('ADMIN'));

// GET /api/audit — query logs with filters + pagination
auditRouter.get('/', async (req, res) => {
  try {
    const { entity, action, userId, page, limit } = req.query;
    const result = await getAuditLogs({
      entity: entity as string,
      action: action as string,
      userId: userId as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});
