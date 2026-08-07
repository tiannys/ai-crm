import { z } from 'zod';

// ─── Lead ────────────────────────────────────────────────────────
export const createLeadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  companyId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  ownerId: z.string().uuid(),
  stage: z.enum(['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).default('NEW'),
  value: z.number().min(0).optional().nullable(),
  source: z.enum(['WEBSITE', 'MANUAL', 'LINE']).default('MANUAL'),
  expectedClose: z.string().datetime().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const updateLeadStageSchema = z.object({
  stage: z.enum(['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']),
});

// ─── Contact ─────────────────────────────────────────────────────
export const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  companyId: z.string().uuid().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  lineUserId: z.string().optional().nullable(),
  lineDisplayName: z.string().optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateContactSchema = createContactSchema.partial();

// ─── Company ─────────────────────────────────────────────────────
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  industry: z.string().max(100).optional().nullable(),
  website: z.string().url().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateCompanySchema = createCompanySchema.partial();

// ─── Activity ────────────────────────────────────────────────────
export const createActivitySchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'STAGE_CHANGE', 'LINE_MESSAGE', 'AI_ACTION']),
  description: z.string().min(1).max(5000),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// ─── Message ─────────────────────────────────────────────────────
export const createMessageSchema = z.object({
  leadId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid(),
  channel: z.enum(['LINE', 'EMAIL', 'MANUAL']),
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  content: z.string().min(1).max(10000),
  lineMessageId: z.string().optional().nullable(),
  status: z.enum(['RECEIVED', 'DRAFT', 'APPROVED', 'SENT', 'FAILED']).default('RECEIVED'),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// ─── Query Params ────────────────────────────────────────────────
export const leadQuerySchema = z.object({
  search: z.string().optional(),
  stage: z.enum(['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
  source: z.enum(['WEBSITE', 'MANUAL', 'LINE']).optional(),
  ownerId: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'value', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const contactQuerySchema = z.object({
  search: z.string().optional(),
  companyId: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const companyQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ─── AI ──────────────────────────────────────────────────────────
export const aiActionSchema = z.object({
  leadId: z.string().uuid(),
});

// ─── LINE Reply ──────────────────────────────────────────────────
export const lineReplySchema = z.object({
  messageId: z.string().uuid(),
  action: z.enum(['approve', 'edit', 'reject']),
  editedContent: z.string().max(10000).optional(),
});
