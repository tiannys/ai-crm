import { Router } from 'express';
import { authenticateUser, generateToken } from '../lib/auth';

export const authRouter = Router();

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
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user);
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
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
