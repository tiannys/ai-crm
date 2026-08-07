import { Router, Request } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthPayload } from '../lib/auth';
import { auditFromRequest } from '../services/audit.service';

export const exportRouter = Router();

type AuthRequest = Request & { user: AuthPayload };

exportRouter.use(authMiddleware);

// ─── Export Leads as CSV ─────────────────────────────────────────
exportRouter.get('/leads', async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    const where = user.role === 'SALES' ? { ownerId: user.id } : {};

    const leads = await prisma.lead.findMany({
      where,
      include: {
        company: true,
        contact: true,
        owner: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const headers = ['Title', 'Stage', 'Source', 'Value', 'Company', 'Contact', 'Owner', 'AI Score', 'Created', 'Updated'];
    const rows = leads.map((l) => [
      csvEscape(l.title),
      l.stage,
      l.source,
      l.value?.toString() || '',
      csvEscape(l.company?.name || ''),
      csvEscape(l.contact ? `${l.contact.firstName} ${l.contact.lastName}` : ''),
      csvEscape(l.owner.name),
      l.aiScore?.toString() || '',
      l.createdAt.toISOString(),
      l.updatedAt.toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    auditFromRequest(req, 'CREATE', 'EXPORT', null, { type: 'leads', count: leads.length });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  } catch (error) {
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// ─── Export Contacts as CSV ──────────────────────────────────────
exportRouter.get('/contacts', async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      include: {
        company: true,
        _count: { select: { leads: true, messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Position', 'LINE ID', 'Leads Count', 'Created'];
    const rows = contacts.map((c) => [
      csvEscape(c.firstName),
      csvEscape(c.lastName),
      csvEscape(c.email || ''),
      csvEscape(c.phone || ''),
      csvEscape(c.company?.name || ''),
      csvEscape(c.position || ''),
      csvEscape(c.lineUserId || ''),
      c._count.leads.toString(),
      c.createdAt.toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    auditFromRequest(req, 'CREATE', 'EXPORT', null, { type: 'contacts', count: contacts.length });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="contacts_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export contacts' });
  }
});

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
