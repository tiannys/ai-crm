import { Router } from 'express';
import { authenticateUser, generateToken, authMiddleware, AuthPayload } from '../lib/auth';
import { recordAudit, auditFromRequest } from '../services/audit.service';
import type { Request } from 'express';

export const authRouter = Router();

type AuthRequest = Request & { user: AuthPayload };

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      // Audit failed login attempt
      recordAudit({
        req,
        userId: null,
        userName: email,
        action: 'LOGIN',
        entity: 'AUTH',
        details: { success: false, reason: 'Invalid credentials or disabled account' },
      });
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user);

    // Audit successful login
    recordAudit({
      req,
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      entity: 'AUTH',
      details: { success: true, role: user.role },
    });

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', authMiddleware, async (req, res) => {
  const user = (req as AuthRequest).user;
  recordAudit({
    req,
    userId: user.id,
    userName: user.name,
    action: 'LOGOUT',
    entity: 'AUTH',
  });
  res.json({ success: true });
});

// GET /api/auth/me
authRouter.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { verifyToken } = await import('../lib/auth');
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  res.json({ user: payload });
});
