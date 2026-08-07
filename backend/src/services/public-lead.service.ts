import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createChildLogger } from '../lib/logger';
import type { PublicLeadInput } from '../schemas/public-lead.schema';

const log = createChildLogger('public-leads');

export class PublicLeadOwnerUnavailableError extends Error {
  constructor() {
    super('No active CRM user is available to own website leads');
    this.name = 'PublicLeadOwnerUnavailableError';
  }
}

async function findWebsiteLeadOwner(tx: Prisma.TransactionClient) {
  const configuredEmail = process.env.WEBSITE_LEAD_OWNER_EMAIL?.trim();

  if (configuredEmail) {
    const configuredOwner = await tx.user.findFirst({
      where: {
        email: { equals: configuredEmail, mode: 'insensitive' },
        isActive: true,
      },
      select: { id: true, email: true },
    });

    if (configuredOwner) return configuredOwner;
    log.warn('Configured WEBSITE_LEAD_OWNER_EMAIL does not match an active user');
  }

  const salesOwner = await tx.user.findFirst({
    where: { isActive: true, role: 'SALES' },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, email: true },
  });
  if (salesOwner) return salesOwner;

  return tx.user.findFirst({
    where: { isActive: true, role: { in: ['MANAGER', 'ADMIN'] } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, email: true },
  });
}

export async function createWebsiteLead(input: PublicLeadInput, ipAddress?: string) {
  return prisma.$transaction(async (tx) => {
    const owner = await findWebsiteLeadOwner(tx);
    if (!owner) throw new PublicLeadOwnerUnavailableError();

    let companyId: string | null = null;
    if (input.companyName) {
      const existingCompany = await tx.company.findFirst({
        where: { name: { equals: input.companyName, mode: 'insensitive' } },
        select: { id: true },
      });
      const company = existingCompany ?? await tx.company.create({
        data: { name: input.companyName },
        select: { id: true },
      });
      companyId = company.id;
    }

    let contact = await tx.contact.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' } },
      select: { id: true, companyId: true, phone: true, position: true },
    });

    if (!contact) {
      contact = await tx.contact.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          position: input.jobTitle,
          companyId,
        },
        select: { id: true, companyId: true, phone: true, position: true },
      });
    } else {
      const updates: Prisma.ContactUpdateInput = {};
      if (!contact.companyId && companyId) updates.company = { connect: { id: companyId } };
      if (!contact.phone && input.phone) updates.phone = input.phone;
      if (!contact.position && input.jobTitle) updates.position = input.jobTitle;
      if (Object.keys(updates).length > 0) {
        contact = await tx.contact.update({
          where: { id: contact.id },
          data: updates,
          select: { id: true, companyId: true, phone: true, position: true },
        });
      }
    }

    const effectiveCompanyId = contact.companyId ?? companyId;
    const leadTitle = `${input.companyName || `${input.firstName} ${input.lastName}`} — Website inquiry`
      .slice(0, 200);

    const lead = await tx.lead.create({
      data: {
        title: leadTitle,
        stage: 'NEW',
        source: 'WEBSITE',
        notes: input.message,
        ownerId: owner.id,
        contactId: contact.id,
        companyId: effectiveCompanyId,
      },
      select: { id: true },
    });

    await tx.activity.create({
      data: {
        leadId: lead.id,
        userId: owner.id,
        type: 'NOTE',
        description: 'Lead submitted through the public website inquiry form.',
        metadata: { source: 'WEBSITE', consentGiven: true },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: null,
        userName: 'Website visitor',
        action: 'CREATE',
        entity: 'LEAD',
        entityId: lead.id,
        ipAddress,
        details: { source: 'WEBSITE', ownerId: owner.id },
      },
    });

    log.info({ leadId: lead.id, ownerId: owner.id }, 'Website lead created');
    return { leadId: lead.id };
  });
}
