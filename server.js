// Bharat eVote - Online Voting System for Indian Election
// Capstone: Ankit Saini (GF202215717) | Shoolini University, B.Tech CSE (Data Science)
// Built end-to-end. In-memory store. Cloud Run, scale-to-zero, asia-east1.

import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import { logger, accessLog, requestId } from './src/logger.js';
import { store } from './src/store.js';
import { mountAPI } from './src/routes.js';
import { mountReport } from './src/report.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
const BUILD_ID = process.env.K_REVISION || process.env.BUILD_ID || randomUUID().slice(0, 8);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(requestId);
app.use(accessLog);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "blob:"],
      "font-src": ["'self'", "data:"],
      "connect-src": ["'self'"],
      "frame-ancestors": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(compression());
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(cookieParser());

// Health & readiness
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    build: BUILD_ID,
    env: NODE_ENV,
    uptime_s: Math.round(process.uptime()),
    election: store.election.summary(),
    voters: store.voters.size(),
    ballots: store.ballots.size(),
    region: process.env.K_REGION || 'local'
  });
});

app.get('/version', (_req, res) => res.json({
  app: 'bharat-evote',
  build: BUILD_ID,
  node: process.version,
  released_at: store.bootedAt
}));

// API
mountAPI(app);

// Report (HTML + DOCX export)
mountReport(app, __dirname);

// Static assets
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  maxAge: NODE_ENV === 'production' ? '1h' : 0,
  setHeaders: (res, file) => {
    if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Friendly aliases
app.get('/pitch', (_req, res) => res.redirect(302, '/pitch/'));
app.get('/report', (_req, res) => res.redirect(302, '/report/'));

// 404 - friendly
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  } else {
    res.status(404).json({ error: { code: 'not_found', message: 'Resource not found' } });
  }
});

// Error handler
app.use((err, req, res, _next) => {
  logger.error('unhandled', { rid: req.id, err: err.message, stack: err.stack });
  res.status(500).json({ error: { code: 'internal', message: 'Something went wrong. Try again.' } });
});

const server = app.listen(PORT, () => {
  logger.info('boot', { port: PORT, env: NODE_ENV, build: BUILD_ID });
});

const shutdown = (sig) => {
  logger.info('shutdown', { sig });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (e) => logger.error('uncaught', { err: e.message, stack: e.stack }));
process.on('unhandledRejection', (e) => logger.error('rejection', { err: String(e) }));
