import { prisma } from '../lib/prisma';
import { createChildLogger } from '../lib/logger';
import type { Prisma, LeadStage } from '@prisma/client';

const log = createChildLogger('crm-service');

// ─── Leads ───────────────────────────────────────────────────────
export async function getLeads(params: {
  search?: string;
  stage?: LeadStage;
  source?: string;
  ownerId?: string;
  companyId?: string;
  contactId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const {
    search,
    stage,
    source,
    ownerId,
    companyId,
    contactId,
    page = 1,
    limit = 20,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
  } = params;

  const where: Prisma.LeadWhereInput = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { company: { name: { contains: search, mode: 'insensitive' } } },
      { contact: { firstName: { contains: search, mode: 'insensitive' } } },
      { contact: { lastName: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (stage) where.stage = stage;
  if (source) where.source = source as Prisma.EnumLeadSourceFilter;
  if (ownerId) where.ownerId = ownerId;
  if (companyId) where.companyId = companyId;
  if (contactId) where.contactId = contactId;

  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        company: true,
        contact: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { activities: true, messages: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getLeadById(id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      company: true,
      contact: true,
      owner: { select: { id: true, name: true, email: true } },
      activities: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      tasks: {
        include: { assignee: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      attachments: {
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { activities: true, messages: true } },
    },
  });

  if (!lead) return lead;

  // If lead has a contact, fetch ALL messages from that contact
  // so conversations tab & AI see the full history (not just messages linked to this lead)
  if (lead.contactId) {
    const allContactMessages = await prisma.message.findMany({
      where: { contactId: lead.contactId },
      orderBy: { createdAt: 'asc' },
    });
    (lead as any).messages = allContactMessages;
  }

  return lead;
}

export async function createLead(data: Prisma.LeadCreateInput) {
  log.info({ title: data.title }, 'Creating lead');
  return prisma.lead.create({
    data,
    include: {
      company: true,
      contact: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function updateLead(id: string, data: Prisma.LeadUpdateInput) {
  log.info({ id }, 'Updating lead');
  return prisma.lead.update({
    where: { id },
    data,
    include: {
      company: true,
      contact: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function updateLeadStage(
  id: string,
  stage: LeadStage,
  userId: string
) {
  log.info({ id, stage }, 'Updating lead stage');

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new Error('Lead not found');

  const [updatedLead] = await prisma.$transaction([
    prisma.lead.update({
      where: { id },
      data: { stage },
      include: {
        company: true,
        contact: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.activity.create({
      data: {
        leadId: id,
        userId,
        type: 'STAGE_CHANGE',
        description: `Stage changed from ${lead.stage} to ${stage}`,
        metadata: { from: lead.stage, to: stage },
      },
    }),
  ]);

  return updatedLead;
}

export async function deleteLead(id: string) {
  log.info({ id }, 'Deleting lead');
  return prisma.lead.delete({ where: { id } });
}

// ─── Contacts ────────────────────────────────────────────────────
export async function getContacts(params: {
  search?: string;
  companyId?: string;
  page?: number;
  limit?: number;
}) {
  const { search, companyId, page = 1, limit = 20 } = params;

  const where: Prisma.ContactWhereInput = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (companyId) where.companyId = companyId;

  const [data, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        company: true,
        _count: { select: { leads: true, messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getContactById(id: string) {
  return prisma.contact.findUnique({
    where: { id },
    include: { company: true, _count: { select: { leads: true, messages: true } } },
  });
}

export async function createContact(data: Prisma.ContactCreateInput) {
  log.info({ name: `${data.firstName} ${data.lastName}` }, 'Creating contact');
  return prisma.contact.create({ data, include: { company: true } });
}

export async function updateContact(id: string, data: Prisma.ContactUpdateInput) {
  return prisma.contact.update({ where: { id }, data, include: { company: true } });
}

export async function deleteContact(id: string) {
  return prisma.contact.delete({ where: { id } });
}

export async function findContactByLineUserId(lineUserId: string) {
  return prisma.contact.findUnique({
    where: { lineUserId },
    include: { company: true, leads: true },
  });
}

// ─── Companies ───────────────────────────────────────────────────
export async function getCompanies(params: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { search, page = 1, limit = 20 } = params;

  const where: Prisma.CompanyWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { industry: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        _count: { select: { contacts: true, leads: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.company.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getCompanyById(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: { _count: { select: { contacts: true, leads: true } } },
  });
}

export async function createCompany(data: Prisma.CompanyCreateInput) {
  log.info({ name: data.name }, 'Creating company');
  return prisma.company.create({ data });
}

export async function updateCompany(id: string, data: Prisma.CompanyUpdateInput) {
  return prisma.company.update({ where: { id }, data });
}

export async function deleteCompany(id: string) {
  return prisma.company.delete({ where: { id } });
}

// ─── Activities ──────────────────────────────────────────────────
export async function getActivitiesByLead(leadId: string) {
  return prisma.activity.findMany({
    where: { leadId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createActivity(data: Prisma.ActivityCreateInput) {
  log.info({ type: data.type }, 'Creating activity');
  return prisma.activity.create({
    data,
    include: { user: { select: { id: true, name: true } } },
  });
}

// ─── Dashboard ───────────────────────────────────────────────────
export async function getDashboardStats(ownerId?: string) {
  // When ownerId is provided (SALES role), scope all stats to their leads only
  const leadFilter = ownerId ? { ownerId } : {};

  const [
    totalLeads,
    totalContacts,
    totalCompanies,
    stageGroups,
    recentActivities,
    pipelineValueResult,
    wonDeals,
  ] = await Promise.all([
    prisma.lead.count({ where: leadFilter }),
    prisma.contact.count(),
    prisma.company.count(),
    prisma.lead.groupBy({
      by: ['stage'],
      where: leadFilter,
      _count: { id: true },
    }),
    prisma.activity.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      ...(ownerId ? { where: { lead: { ownerId } } } : {}),
      include: {
        user: { select: { id: true, name: true } },
        lead: { select: { id: true, title: true } },
      },
    }),
    prisma.lead.aggregate({
      where: { stage: { notIn: ['LOST'] }, ...leadFilter },
      _sum: { value: true },
    }),
    prisma.lead.count({ where: { stage: 'WON', ...leadFilter } }),
  ]);

  const stageBreakdown: Record<string, number> = {};
  for (const g of stageGroups) {
    stageBreakdown[g.stage] = g._count.id;
  }

  const pipelineValue = Number(pipelineValueResult._sum.value || 0);
  const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

  return {
    totalLeads,
    totalContacts,
    totalCompanies,
    pipelineValue,
    stageBreakdown,
    recentActivities,
    wonDeals,
    conversionRate,
  };
}

// ─── Messages ────────────────────────────────────────────────────
export async function getMessagesByLead(leadId: string) {
  return prisma.message.findMany({
    where: { leadId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getMessagesByContact(contactId: string) {
  return prisma.message.findMany({
    where: { contactId },
    orderBy: { createdAt: 'asc' },
  });
}
