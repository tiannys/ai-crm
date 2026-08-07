import { Router, Request } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole, AuthPayload } from '../lib/auth';
import { createChildLogger } from '../lib/logger';
import { auditFromRequest } from '../services/audit.service';

const log = createChildLogger('users-routes');
export const usersRouter = Router();

type AuthRequest = Request & { user: AuthPayload };

// All user routes require ADMIN
usersRouter.use(authMiddleware);
usersRouter.use(requireRole('ADMIN'));

// ─── List Users ──────────────────────────────────────────────────
usersRouter.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { leads: true, activities: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: users });
  } catch (error) {
    log.error({ error }, 'Failed to list users');
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// ─── Create User ─────────────────────────────────────────────────
usersRouter.post('/', async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password) {
      res.status(400).json({ error: 'email, name, and password are required' });
      return;
    }

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }

    const validRoles = ['ADMIN', 'MANAGER', 'SALES'];
    if (role && !validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: role || 'SALES',
      },
      select: {
        id: true, email: true, name: true, role: true, isActive: true, createdAt: true,
      },
    });

    log.info({ userId: user.id, email }, 'User created');
    auditFromRequest(req, 'CREATE', 'USER', user.id, { email, name, role: role || 'SALES' });
    res.status(201).json(user);
  } catch (error) {
    log.error({ error }, 'Failed to create user');
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ─── Update User ─────────────────────────────────────────────────
usersRouter.put('/:id', async (req, res) => {
  try {
    const { name, role, password } = req.body;
    const updateData: Record<string, unknown> = {};

    if (name) updateData.name = name;
    if (role) {
      const validRoles = ['ADMIN', 'MANAGER', 'SALES'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        return;
      }
      updateData.role = role;
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true, email: true, name: true, role: true, isActive: true, createdAt: true,
      },
    });

    log.info({ userId: user.id }, 'User updated');
    auditFromRequest(req, 'UPDATE', 'USER', user.id, { name, role });
    res.json(user);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
    } else {
      log.error({ error }, 'Failed to update user');
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
});

// ─── Toggle Active ───────────────────────────────────────────────
usersRouter.put('/:id/toggle-active', async (req, res) => {
  try {
    const currentUser = (req as unknown as AuthRequest).user;

    // Prevent self-disable
    if (req.params.id === currentUser.id) {
      res.status(400).json({ error: 'Cannot disable your own account' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
      select: {
        id: true, email: true, name: true, role: true, isActive: true,
      },
    });

    log.info({ userId: updated.id, isActive: updated.isActive }, 'User active status toggled');
    auditFromRequest(req, updated.isActive ? 'ENABLE' : 'DISABLE', 'USER', updated.id, { email: updated.email, name: updated.name });
    res.json(updated);
  } catch (error) {
    log.error({ error }, 'Failed to toggle user status');
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// ─── Delete User ─────────────────────────────────────────────────
usersRouter.delete('/:id', async (req, res) => {
  try {
    const currentUser = (req as unknown as AuthRequest).user;

    // Prevent self-delete
    if (req.params.id === currentUser.id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    // Check if user has leads — suggest disabling instead
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { leads: true } } },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user._count.leads > 0) {
      res.status(400).json({
        error: `Cannot delete user with ${user._count.leads} active leads. Reassign leads first or disable the account instead.`,
      });
      return;
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    log.info({ userId: req.params.id }, 'User deleted');
    auditFromRequest(req, 'DELETE', 'USER', req.params.id, { email: user.email, name: user.name });
    res.json({ success: true });
  } catch (error) {
    log.error({ error }, 'Failed to delete user');
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
