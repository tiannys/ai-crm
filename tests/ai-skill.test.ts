import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Dependencies ───────────────────────────────────────────
const mockPrisma = {
  lead: {
    findUnique: vi.fn(),
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

// Mock OpenAI to simulate unavailability
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('API unavailable')),
        },
      };
    },
  };
});

const { generateLeadSummary, generateQualificationScore, generateNextAction, generateDraftReply } =
  await import('@/lib/services/ai.service');

const fullLead = {
  id: 'lead-1',
  title: 'AI Chatbot Project',
  stage: 'PROPOSAL',
  value: 850000,
  source: 'WEBSITE',
  notes: 'Interested in Thai NLP chatbot',
  aiScore: null,
  aiScoreReasons: null,
  aiSummary: null,
  expectedClose: new Date('2025-03-01'),
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-02-15'),
  company: { id: 'co-1', name: 'TechVision', industry: 'Technology' },
  contact: {
    id: 'ct-1',
    firstName: 'Arthit',
    lastName: 'Charoensuk',
    email: 'arthit@techvision.co.th',
    phone: '+66-81-111-1111',
    position: 'CTO',
    lineUserId: null,
  },
  owner: { id: 'u-1', name: 'Nattapong', email: 'sales@jenosize.com' },
  activities: [
    {
      id: 'a1',
      type: 'MEETING',
      description: 'Demo session',
      createdAt: new Date('2025-02-13'),
      user: { name: 'Nattapong' },
    },
    {
      id: 'a2',
      type: 'STAGE_CHANGE',
      description: 'Moved to PROPOSAL',
      createdAt: new Date('2025-02-10'),
      user: { name: 'Nattapong' },
    },
  ],
  messages: [
    {
      id: 'm1',
      direction: 'INBOUND',
      content: 'Can you send the proposal?',
      channel: 'LINE',
      status: 'RECEIVED',
      createdAt: new Date('2025-02-14'),
    },
  ],
  _count: { activities: 2, messages: 1 },
};

describe('AI Service - Behavior & Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env to force fallback
    process.env.OPENAI_API_KEY = '';
  });

  describe('generateLeadSummary', () => {
    it('should return fallback summary when OpenAI is unavailable', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(fullLead);

      const result = await generateLeadSummary('lead-1');

      expect(result.success).toBe(true);
      expect(result.fallback).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.summary).toContain('AI Chatbot Project');
      expect(result.data?.summary).toContain('PROPOSAL');
      expect(result.data?.keyPoints).toBeInstanceOf(Array);
      expect(result.data?.sentiment).toBeDefined();
      expect(result.data?.generatedAt).toBeDefined();
    });

    it('should return error when lead not found', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      const result = await generateLeadSummary('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Lead not found');
    });
  });

  describe('generateQualificationScore', () => {
    it('should return fallback score using heuristics', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(fullLead);

      const result = await generateQualificationScore('lead-1');

      expect(result.success).toBe(true);
      expect(result.fallback).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.score).toBeGreaterThan(0);
      expect(result.data?.score).toBeLessThanOrEqual(100);
      expect(result.data?.reasons).toBeInstanceOf(Array);
      expect(result.data?.reasons.length).toBeGreaterThan(0);
      expect(result.data?.confidence).toBe('low'); // Fallback is always low confidence
    });

    it('should score higher for leads with budget and activities', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(fullLead);
      const result = await generateQualificationScore('lead-1');

      // fullLead has: value (850k), contact, 2 activities, expectedClose, PROPOSAL stage
      // Expected: 30 base + 15 (value) + 10 (contact) + 10 (close date) + 10 (PROPOSAL) = 75
      expect(result.data?.score).toBeGreaterThanOrEqual(65);
    });

    it('should score lower for minimal leads', async () => {
      const minimalLead = {
        ...fullLead,
        value: null,
        contact: null,
        activities: [],
        expectedClose: null,
        stage: 'NEW',
      };
      mockPrisma.lead.findUnique.mockResolvedValue(minimalLead);

      const result = await generateQualificationScore('lead-1');

      expect(result.data?.score).toBeLessThanOrEqual(40);
    });
  });

  describe('generateNextAction', () => {
    it('should suggest stage-appropriate action as fallback', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(fullLead);

      const result = await generateNextAction('lead-1');

      expect(result.success).toBe(true);
      expect(result.fallback).toBe(true);
      expect(result.data?.action).toBeDefined();
      expect(result.data?.action.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(result.data?.priority);
      expect(result.data?.suggestedTimeline).toBeDefined();
    });

    it('should suggest discovery call for NEW leads', async () => {
      const newLead = { ...fullLead, stage: 'NEW' };
      mockPrisma.lead.findUnique.mockResolvedValue(newLead);

      const result = await generateNextAction('lead-1');

      expect(result.data?.action.toLowerCase()).toContain('discovery');
      expect(result.data?.priority).toBe('high');
    });
  });

  describe('generateDraftReply', () => {
    it('should return fallback draft when OpenAI is unavailable', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(fullLead);

      const result = await generateDraftReply('lead-1');

      expect(result.success).toBe(true);
      expect(result.fallback).toBe(true);
      expect(result.data?.content).toBeDefined();
      expect(result.data?.content.length).toBeGreaterThan(0);
      expect(result.data?.content.length).toBeLessThanOrEqual(500);
      expect(result.data?.tone).toBeDefined();
    });
  });
});
