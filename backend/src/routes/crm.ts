import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole, AuthPayload } from '../lib/auth';
import { auditFromRequest } from '../services/audit.service';
import {
  getLeads, getLeadById, createLead, updateLead,
  getContacts, createContact,
  getCompanies, createCompany,
  getDashboardStats, createActivity, getActivitiesByLead,
} from '../services/crm.service';

export const crmRouter = Router();

// Auth request type
type AuthRequest = Request & { user: AuthPayload };

// File upload config
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /pdf|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|gif|csv|txt|zip/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    cb(null, allowed.test(ext));
  },
});

// All CRM routes require authentication
crmRouter.use(authMiddleware);


// ─── Dashboard ───────────────────────────────────────────────────
crmRouter.get('/dashboard', async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    // SALES sees only own leads in dashboard; ADMIN/MANAGER sees all
    const ownerId = user.role === 'SALES' ? user.id : undefined;
    const stats = await getDashboardStats(ownerId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// ─── Leads ───────────────────────────────────────────────────────
crmRouter.get('/leads', async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    const { search, stage, source, page, limit, companyId, contactId, ownerId } = req.query;

    // SALES users can only see their own leads
    const effectiveOwnerId = user.role === 'SALES'
      ? user.id
      : (ownerId as string) || undefined;

    const result = await getLeads({
      search: search as string,
      stage: stage as any,
      source: source as string,
      companyId: companyId as string,
      contactId: contactId as string,
      ownerId: effectiveOwnerId,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

crmRouter.get('/leads/:id', async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    const lead = await getLeadById(req.params.id);
    if (!lead) { res.status(404).json({ error: 'Lead not found' }); return; }

    // SALES can only view their own leads
    if (user.role === 'SALES' && lead.owner.id !== user.id) {
      res.status(403).json({ error: 'Forbidden — you can only view your own leads' });
      return;
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

crmRouter.post('/leads', async (req, res) => {
  try {
    const user = (req as AuthRequest).user;
    const { title, source, stage, value, notes, contactId, companyId } = req.body;
    const lead = await createLead({
      title,
      source: source || 'MANUAL',
      stage: stage || 'NEW',
      value: value || null,
      notes: notes || null,
      owner: { connect: { id: user.id } },
      ...(contactId && { contact: { connect: { id: contactId } } }),
      ...(companyId && { company: { connect: { id: companyId } } }),
    });
    auditFromRequest(req, 'CREATE', 'LEAD', lead.id, { title });
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

crmRouter.put('/leads/:id', async (req, res) => {
  try {
    const user = (req as unknown as AuthRequest).user;
    // Fetch old lead to compare changes
    const oldLead = await getLeadById(req.params.id);
    if (!oldLead) { res.status(404).json({ error: 'Lead not found' }); return; }

    // Sanitize fields before Prisma update
    const updateData = { ...req.body };
    if (updateData.expectedClose) {
      updateData.expectedClose = new Date(updateData.expectedClose).toISOString();
    }
    if (updateData.value !== undefined && updateData.value !== null) {
      updateData.value = parseFloat(updateData.value);
    }

    const lead = await updateLead(req.params.id, updateData);

    // Auto-log stage change
    if (req.body.stage && oldLead.stage !== req.body.stage) {
      await createActivity({
        lead: { connect: { id: req.params.id } },
        user: { connect: { id: user.id } },
        type: 'STAGE_CHANGE',
        description: `Stage changed from ${oldLead.stage} to ${req.body.stage}`,
        metadata: { from: oldLead.stage, to: req.body.stage },
      });
    }

    // Auto-log other field changes
    const trackFields: { key: string; label: string; format?: (v: any) => string }[] = [
      { key: 'title', label: 'Title' },
      { key: 'value', label: 'Value', format: (v: any) => v ? `฿${Number(v).toLocaleString()}` : 'None' },
      { key: 'source', label: 'Source' },
      { key: 'expectedClose', label: 'Expected Close', format: (v: any) => v ? new Date(v).toLocaleDateString() : 'None' },
      { key: 'notes', label: 'Notes' },
      { key: 'companyId', label: 'Company' },
      { key: 'contactId', label: 'Contact' },
    ];
    const changes: string[] = [];
    for (const f of trackFields) {
      if (req.body[f.key] !== undefined) {
        const oldVal = (oldLead as any)[f.key];
        const newVal = req.body[f.key];
        if (String(oldVal ?? '') !== String(newVal ?? '')) {
          if (f.key !== 'stage') { // stage already logged above
            const from = f.format ? f.format(oldVal) : (oldVal || 'None');
            const to = f.format ? f.format(newVal) : (newVal || 'None');
            changes.push(`${f.label}: ${from} → ${to}`);
          }
        }
      }
    }
    if (changes.length > 0) {
      await createActivity({
        lead: { connect: { id: req.params.id } },
        user: { connect: { id: user.id } },
        type: 'LEAD_UPDATED',
        description: `Lead updated: ${changes.join(', ')}`,
        metadata: { changes },
      });
    }

    auditFromRequest(req, 'UPDATE', 'LEAD', req.params.id, { changes: changes.length > 0 ? changes : ['minor update'] });
    res.json(lead);
  } catch (error: any) {
    if (error?.message === 'Lead not found') {
      res.status(404).json({ error: 'Lead not found' });
    } else {
      res.status(500).json({ error: 'Failed to update lead' });
    }
  }
});

// ─── Activities ──────────────────────────────────────────────────
crmRouter.get('/leads/:id/activities', async (req, res) => {
  try {
    const activities = await getActivitiesByLead(req.params.id);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

crmRouter.post('/leads/:id/activities', async (req, res) => {
  try {
    const user = (req as unknown as AuthRequest).user;
    const { type, description } = req.body;
    const activity = await createActivity({
      lead: { connect: { id: req.params.id } },
      user: { connect: { id: user.id } },
      type,
      description,
    });
    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// ─── Contacts ────────────────────────────────────────────────────
crmRouter.get('/contacts', async (req, res) => {
  try {
    const { search, page, limit, companyId } = req.query;
    const result = await getContacts({
      search: search as string,
      companyId: companyId as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

crmRouter.post('/contacts', async (req, res) => {
  try {
    const contact = await createContact(req.body);
    auditFromRequest(req, 'CREATE', 'CONTACT', contact.id, { name: `${req.body.firstName} ${req.body.lastName}` });
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Get single contact with messages
crmRouter.get('/contacts/:id', async (req, res) => {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        leads: { include: { owner: true }, orderBy: { updatedAt: 'desc' } },
        messages: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!contact) { res.status(404).json({ error: 'Contact not found' }); return; }
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Get messages for a contact
crmRouter.get('/contacts/:id/messages', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { contactId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create lead from contact
crmRouter.post('/contacts/:id/create-lead', async (req, res) => {
  try {
    const user = (req as unknown as AuthRequest).user;
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });

    if (!contact) { res.status(404).json({ error: 'Contact not found' }); return; }

    const { title, source, notes } = req.body;

    // Create lead linked to contact
    const lead = await prisma.lead.create({
      data: {
        title: title || `LINE Inquiry - ${contact.firstName} ${contact.lastName}`,
        source: source || 'LINE',
        stage: 'NEW',
        ownerId: user.id,
        contactId: contact.id,
        notes: notes || null,
      },
      include: { contact: true, owner: true },
    });

    // Link existing unlinked messages to this lead
    await prisma.message.updateMany({
      where: { contactId: contact.id, leadId: null },
      data: { leadId: lead.id },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        type: 'NOTE',
        description: `Lead created from LINE contact: ${contact.firstName} ${contact.lastName}`,
      },
    });

    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create lead from contact' });
  }
});

// Get messages for a lead
crmRouter.get('/leads/:id/messages', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { leadId: req.params.id },
      include: { contact: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ─── Companies ───────────────────────────────────────────────────
crmRouter.get('/companies', async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    const result = await getCompanies({
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

crmRouter.post('/companies', async (req, res) => {
  try {
    const company = await createCompany(req.body);
    auditFromRequest(req, 'CREATE', 'COMPANY', company.id, { name: req.body.name });
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create company' });
  }
});

crmRouter.put('/companies/:id', async (req, res) => {
  try {
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: req.body,
      include: { _count: { select: { contacts: true, leads: true } } },
    });
    res.json(company);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Company not found' });
    } else {
      res.status(500).json({ error: 'Failed to update company' });
    }
  }
});

// ─── Delete Endpoints ────────────────────────────────────────────
crmRouter.delete('/leads/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } });
    auditFromRequest(req, 'DELETE', 'LEAD', req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Lead not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  }
});

crmRouter.delete('/contacts/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.contact.delete({ where: { id: req.params.id } });
    auditFromRequest(req, 'DELETE', 'CONTACT', req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Contact not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete contact' });
    }
  }
});

crmRouter.delete('/companies/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.company.delete({ where: { id: req.params.id } });
    auditFromRequest(req, 'DELETE', 'COMPANY', req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Company not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete company' });
    }
  }
});

// ─── Update Contact ──────────────────────────────────────────────
crmRouter.put('/contacts/:id', async (req, res) => {
  try {
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: req.body,
      include: { company: true, _count: { select: { leads: true, messages: true } } },
    });

    // Auto-sync: if companyId changed, update all leads linked to this contact
    if (req.body.companyId !== undefined) {
      await prisma.lead.updateMany({
        where: { contactId: req.params.id },
        data: { companyId: req.body.companyId },
      });
    }

    auditFromRequest(req, 'UPDATE', 'CONTACT', req.params.id);
    res.json(contact);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Contact not found' });
    } else {
      res.status(500).json({ error: 'Failed to update contact' });
    }
  }
});

// ─── Get Company by ID ───────────────────────────────────────────
crmRouter.get('/companies/:id', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        contacts: {
          include: { _count: { select: { leads: true, messages: true } } },
          orderBy: { updatedAt: 'desc' },
        },
        leads: {
          include: {
            contact: true,
            owner: { select: { id: true, name: true, email: true } },
          },
          orderBy: { updatedAt: 'desc' },
        },
        _count: { select: { contacts: true, leads: true } },
      },
    });
    if (!company) { res.status(404).json({ error: 'Company not found' }); return; }
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// ─── Global Search ───────────────────────────────────────────────
crmRouter.get('/search', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      res.json({ leads: [], contacts: [], companies: [] });
      return;
    }

    const [leads, contacts, companies] = await Promise.all([
      prisma.lead.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { company: true, contact: true },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.contact.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { company: true },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.company.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { industry: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    res.json({ leads, contacts, companies });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── Tasks ───────────────────────────────────────────────────────
crmRouter.get('/tasks', async (req, res) => {
  try {
    const { leadId, assigneeId, status } = req.query;
    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (status) where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        lead: { select: { id: true, title: true, stage: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

crmRouter.post('/tasks', async (req, res) => {
  try {
    const user = (req as unknown as AuthRequest).user;
    const { title, description, leadId, assigneeId, priority, dueDate } = req.body;
    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignee: { connect: { id: assigneeId || user.id } },
        ...(leadId && { lead: { connect: { id: leadId } } }),
      },
      include: {
        lead: { select: { id: true, title: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    // Auto-log task creation to timeline
    if (leadId) {
      await createActivity({
        lead: { connect: { id: leadId } },
        user: { connect: { id: user.id } },
        type: 'TASK_CREATED',
        description: `Task created: ${title}`,
        metadata: { taskId: task.id, priority: priority || 'MEDIUM' },
      });
    }
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

crmRouter.put('/tasks/:id', async (req, res) => {
  try {
    const user = (req as unknown as AuthRequest).user;
    const { title, description, status, priority, dueDate } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) {
      data.status = status;
      if (status === 'DONE') data.completedAt = new Date();
      else data.completedAt = null;
    }
    if (priority !== undefined) data.priority = priority;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: {
        lead: { select: { id: true, title: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    // Auto-log task completion to timeline
    if (status === 'DONE' && task.leadId) {
      await createActivity({
        lead: { connect: { id: task.leadId } },
        user: { connect: { id: user.id } },
        type: 'TASK_COMPLETED',
        description: `Task completed: ${task.title}`,
        metadata: { taskId: task.id },
      });
    }
    res.json(task);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Task not found' });
    } else {
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
});

crmRouter.delete('/tasks/:id', async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Task not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  }
});

// ─── Attachments ─────────────────────────────────────────────────
crmRouter.get('/leads/:id/attachments', async (req, res) => {
  try {
    const attachments = await prisma.attachment.findMany({
      where: { leadId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(attachments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

crmRouter.post('/leads/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    const user = (req as unknown as AuthRequest).user;
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file uploaded' }); return; }

    const category = req.body.category || 'other';
    const notes = req.body.notes || null;

    const attachment = await prisma.attachment.create({
      data: {
        leadId: req.params.id,
        uploadedBy: user.id,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.filename,
        category,
        notes,
      },
    });

    // Auto-log to timeline
    await createActivity({
      lead: { connect: { id: req.params.id } },
      user: { connect: { id: user.id } },
      type: 'FILE_ATTACHED',
      description: `File attached: ${file.originalname} (${category})`,
      metadata: { attachmentId: attachment.id, fileName: file.originalname, category },
    });

    res.status(201).json(attachment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

crmRouter.get('/attachments/:id/download', async (req, res) => {
  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }

    const filePath = path.join(uploadsDir, attachment.filePath);
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File not found on disk' }); return; }

    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    res.setHeader('Content-Type', attachment.fileType);
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

crmRouter.delete('/attachments/:id', async (req, res) => {
  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }

    // Delete file from disk
    const filePath = path.join(uploadsDir, attachment.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.attachment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Attachment not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete attachment' });
    }
  }
});

