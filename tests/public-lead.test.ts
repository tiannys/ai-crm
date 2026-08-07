import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTx = {
  user: { findFirst: vi.fn() },
  company: { findFirst: vi.fn(), create: vi.fn() },
  contact: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  lead: { create: vi.fn() },
  activity: { create: vi.fn() },
  auditLog: { create: vi.fn() },
};

const mockPrisma = {
  $transaction: vi.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
};

vi.mock('../backend/src/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('../backend/src/lib/logger', () => ({
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const { publicLeadSchema } = await import('../backend/src/schemas/public-lead.schema');
const {
  createWebsiteLead,
  PublicLeadOwnerUnavailableError,
} = await import('../backend/src/services/public-lead.service');

const validInput = {
  firstName: 'Arthit',
  lastName: 'Sukjai',
  email: 'ARTHIT@example.com',
  phone: '0812345678',
  companyName: 'Acme Thailand',
  jobTitle: 'CTO',
  message: 'We want to discuss an AI customer support project.',
  consent: true as const,
  website: undefined,
};

describe('Public website lead capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WEBSITE_LEAD_OWNER_EMAIL;

    mockTx.user.findFirst.mockResolvedValue({ id: 'owner-1', email: 'sales@example.invalid' });
    mockTx.company.findFirst.mockResolvedValue(null);
    mockTx.company.create.mockResolvedValue({ id: 'company-1' });
    mockTx.contact.findFirst.mockResolvedValue(null);
    mockTx.contact.create.mockResolvedValue({
      id: 'contact-1',
      companyId: 'company-1',
      phone: validInput.phone,
      position: validInput.jobTitle,
    });
    mockTx.lead.create.mockResolvedValue({ id: 'lead-1' });
    mockTx.activity.create.mockResolvedValue({ id: 'activity-1' });
    mockTx.auditLog.create.mockResolvedValue({ id: 'audit-1' });
  });

  it('validates and normalizes public form input', () => {
    const result = publicLeadSchema.parse(validInput);
    expect(result.email).toBe('arthit@example.com');

    expect(publicLeadSchema.safeParse({ ...validInput, message: 'short' }).success).toBe(false);
    expect(publicLeadSchema.safeParse({ ...validInput, consent: false }).success).toBe(false);
  });

  it('creates a NEW WEBSITE lead with a traceable activity and audit event', async () => {
    const input = publicLeadSchema.parse(validInput);
    const result = await createWebsiteLead(input, '192.0.2.10');

    expect(result).toEqual({ leadId: 'lead-1' });
    expect(mockTx.lead.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        stage: 'NEW',
        source: 'WEBSITE',
        ownerId: 'owner-1',
        contactId: 'contact-1',
        companyId: 'company-1',
      }),
    }));
    expect(mockTx.activity.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ leadId: 'lead-1', userId: 'owner-1' }),
    }));
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ entity: 'LEAD', entityId: 'lead-1', ipAddress: '192.0.2.10' }),
    }));
  });

  it('fails safely when no active CRM owner exists', async () => {
    mockTx.user.findFirst.mockResolvedValue(null);
    const input = publicLeadSchema.parse(validInput);

    await expect(createWebsiteLead(input)).rejects.toBeInstanceOf(PublicLeadOwnerUnavailableError);
    expect(mockTx.lead.create).not.toHaveBeenCalled();
  });
});
