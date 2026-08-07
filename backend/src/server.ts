import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './lib/logger';
import { authRouter } from './routes/auth';
import { crmRouter } from './routes/crm';
import { aiRouter } from './routes/ai';
import { lineRouter } from './routes/line';
import { usersRouter } from './routes/users';

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow LINE webhook (no origin) and frontend
    if (!origin || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Line-Signature'],
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── LINE Webhook (BEFORE express.json — needs raw body) ─────────
app.use('/api/line', lineRouter);

// ─── JSON body parser (for all other routes) ─────────────────────
app.use(express.json());

// ─── Request Logging ─────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Request');
  next();
});

// ─── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/crm', crmRouter);
app.use('/api/ai', aiRouter);
app.use('/api/users', usersRouter);

// ─── Health Check ────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ───────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({ error: 'Internal Server Error' });
});

// ─── Start ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, '🚀 AI CRM Backend running');
  logger.info({ frontend: process.env.FRONTEND_URL }, 'CORS allowed origin');
});

export default app;
