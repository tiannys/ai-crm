import { prisma } from '../lib/prisma';
import { createChildLogger } from '../lib/logger';
import { Prisma, type AuditAction } from '@prisma/client';
import { Request } from 'express';
import { AuthPayload } from '../lib/auth';

const log = createChildLogger('audit-service');

type AuthRequest = Request & { user: AuthPayload };

/**
 * Record an audit log entry.
 * Fire-and-forget — never blocks the main request.
 */
export function recordAudit(params: {
  req?: Request;
  userId?: string | null;
  userName: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  const { req, userId, userName, action, entity, entityId, details } = params;

  // Extract IP from request (supports proxied requests)
  const ipAddress = req
    ? (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown'
    : 'system';

  // Fire-and-forget — don't await, don't block the request
  prisma.auditLog.create({
    data: {
      userId: userId || null,
      userName,
      action,
      entity,
      entityId: entityId || null,
      details: details ? (details as Prisma.InputJsonObject) : Prisma.JsonNull,
      ipAddress,
    },
  }).catch((err) => {
    log.error({ error: err, action, entity }, 'Failed to record audit log');
  });
}

/**
 * Helper to extract user info from an authenticated request and record audit.
 */
export function auditFromRequest(
  req: Request,
  action: AuditAction,
  entity: string,
  entityId?: string | null,
  details?: Record<string, unknown>,
) {
  const user = (req as AuthRequest).user;
  recordAudit({
    req,
    userId: user?.id,
    userName: user?.name || 'Unknown',
    action,
    entity,
    entityId,
    details,
  });
}

/**
 * Query audit logs with pagination and filters.
 */
export async function getAuditLogs(params: {
  entity?: string;
  action?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) {
  const { entity, action, userId, page = 1, limit = 50 } = params;

  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (userId) where.userId = userId;

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}
