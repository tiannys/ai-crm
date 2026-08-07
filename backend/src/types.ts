import type {
  User,
  Company,
  Contact,
  Lead,
  Activity,
  Message,
  LineEvent,
  LeadStage,
  LeadSource,
  ActivityType,
  MessageChannel,
  MessageDirection,
  MessageStatus,
  UserRole,
} from '@prisma/client';

// Re-export Prisma types
export type {
  User,
  Company,
  Contact,
  Lead,
  Activity,
  Message,
  LineEvent,
  LeadStage,
  LeadSource,
  ActivityType,
  MessageChannel,
  MessageDirection,
  MessageStatus,
  UserRole,
};

// ─── Extended Types ──────────────────────────────────────────────
export type LeadWithRelations = Lead & {
  company: Company | null;
  contact: Contact | null;
  owner: Pick<User, 'id' | 'name' | 'email'>;
  activities?: Activity[];
  messages?: Message[];
  _count?: {
    activities: number;
    messages: number;
  };
};

export type ContactWithCompany = Contact & {
  company: Company | null;
  _count?: {
    leads: number;
    messages: number;
  };
};

export type CompanyWithCounts = Company & {
  _count?: {
    contacts: number;
    leads: number;
  };
};

export type ActivityWithUser = Activity & {
  user: Pick<User, 'id' | 'name'>;
};

// ─── API Response Types ──────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalLeads: number;
  totalContacts: number;
  totalCompanies: number;
  pipelineValue: number;
  stageBreakdown: Record<LeadStage, number>;
  recentActivities: ActivityWithUser[];
  wonDeals: number;
  conversionRate: number;
}

// ─── AI Types ────────────────────────────────────────────────────
export interface AiLeadSummary {
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  generatedAt: string;
}

export interface AiQualificationScore {
  score: number; // 0-100
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
  generatedAt: string;
}

export interface AiNextAction {
  action: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  suggestedTimeline: string;
  generatedAt: string;
}

export interface AiDraftReply {
  content: string;
  tone: string;
  context: string;
  generatedAt: string;
}

export interface AiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fallback?: boolean;
}

// ─── Session ─────────────────────────────────────────────────────
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
