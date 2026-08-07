import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────────────
const mockPrisma = {
  lead: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    aggregate: vi.fn(),
    findFirst: vi.fn(),
  },
  contact: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  company: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  activity: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
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

// Import after mocking
const { getLeads, createLead, updateLeadStage, getLeadById } = await import(
  '@/lib/services/crm.service'
);

describe('CRM Service - Core Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLeads', () => {
    it('should return paginated leads with default params', async () => {
      const mockLeads = [
        {
          id: 'lead-1',
          title: 'AI Chatbot Project',
          stage: 'NEW',
          value: 500000,
          source: 'WEBSITE',
          company: { name: 'TechCo' },
          contact: { firstName: 'John', lastName: 'Doe' },
          owner: { id: 'user-1', name: 'Sales Rep', email: 'sales@test.com' },
          _count: { activities: 3, messages: 2 },
        },
      ];

      mockPrisma.lead.findMany.mockResolvedValue(mockLeads);
      mockPrisma.lead.count.mockResolvedValue(1);

      const result = await getLeads({});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            company: true,
            contact: true,
          }),
        })
      );
    });

    it('should filter leads by stage', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      mockPrisma.lead.count.mockResolvedValue(0);

      await getLeads({ stage: 'QUALIFIED' });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stage: 'QUALIFIED',
          }),
        })
      );
    });

    it('should search leads by title, company, or contact', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      mockPrisma.lead.count.mockResolvedValue(0);

      await getLeads({ search: 'chatbot' });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.anything() }),
            ]),
          }),
        })
      );
    });
  });

  describe('createLead', () => {
    it('should create a new lead with required fields', async () => {
      const newLead = {
        id: 'lead-new',
        title: 'New Project',
        stage: 'NEW',
        value: 100000,
        source: 'MANUAL',
        company: null,
        contact: null,
        owner: { id: 'user-1', name: 'Sales', email: 'sales@test.com' },
      };

      mockPrisma.lead.create.mockResolvedValue(newLead);

      const result = await createLead({
        title: 'New Project',
        owner: { connect: { id: 'user-1' } },
      });

      expect(result.title).toBe('New Project');
      expect(mockPrisma.lead.create).toHaveBeenCalled();
    });
  });

  describe('updateLeadStage', () => {
    it('should update lead stage and create activity log', async () => {
      const existingLead = {
        id: 'lead-1',
        title: 'Test Lead',
        stage: 'NEW',
      };

      const updatedLead = {
        ...existingLead,
        stage: 'QUALIFIED',
        company: null,
        contact: null,
        owner: { id: 'user-1', name: 'Sales', email: 'sales@test.com' },
      };

      mockPrisma.lead.findUnique.mockResolvedValue(existingLead);
      mockPrisma.$transaction.mockResolvedValue([updatedLead, {}]);

      const result = await updateLeadStage('lead-1', 'QUALIFIED', 'user-1');

      expect(result.stage).toBe('QUALIFIED');
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw error if lead not found', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      await expect(
        updateLeadStage('nonexistent', 'QUALIFIED', 'user-1')
      ).rejects.toThrow('Lead not found');
    });
  });

  describe('getLeadById', () => {
    it('should return lead with all relations', async () => {
      const fullLead = {
        id: 'lead-1',
        title: 'Full Lead',
        stage: 'PROPOSAL',
        company: { id: 'co-1', name: 'TechCo' },
        contact: { id: 'ct-1', firstName: 'John', lastName: 'Doe' },
        owner: { id: 'u-1', name: 'Sales', email: 'sales@test.com' },
        activities: [
          { id: 'act-1', type: 'NOTE', description: 'A note', user: { name: 'Sales' } },
        ],
        messages: [
          { id: 'msg-1', direction: 'INBOUND', content: 'Hello', channel: 'LINE' },
        ],
        _count: { activities: 1, messages: 1 },
      };

      mockPrisma.lead.findUnique.mockResolvedValue(fullLead);

      const result = await getLeadById('lead-1');

      expect(result).toBeDefined();
      expect(result?.activities).toHaveLength(1);
      expect(result?.messages).toHaveLength(1);
      expect(result?.company?.name).toBe('TechCo');
    });

    it('should return null for nonexistent lead', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      const result = await getLeadById('nonexistent');
      expect(result).toBeNull();
    });
  });
});
