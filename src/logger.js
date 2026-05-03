// Structured JSON logger + request id + verbose access log.
// Super-admin SIEM dashboard reads from in-memory ring buffer at /api/admin/logs.

import { randomUUID } from 'node:crypto';

const RING_MAX = Number(process.env.LOG_RING_MAX || 2000);
const ring = [];

const levels = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };
const minLevel = levels[(process.env.LOG_LEVEL || 'info').toLowerCase()] || levels.info;

function emit(level, msg, fields = {}) {
  if ((levels[level] || 30) < minLevel) return;
  const rec = {
    ts: new Date().toISOString(),
    level,
    msg,
    pid: process.pid,
    ...fields
  };
  // stdout - Cloud Run captures
  process.stdout.write(JSON.stringify(rec) + '\n');
  // ring buffer for in-app SIEM
  ring.push(rec);
  if (ring.length > RING_MAX) ring.splice(0, ring.length - RING_MAX);
}

export const logger = {
  trace: (m, f) => emit('trace', m, f),
  debug: (m, f) => emit('debug', m, f),
  info:  (m, f) => emit('info',  m, f),
  warn:  (m, f) => emit('warn',  m, f),
  error: (m, f) => emit('error', m, f),
  fatal: (m, f) => emit('fatal', m, f),
  recent: (limit = 200, level) => {
    const arr = level ? ring.filter(r => r.level === level) : ring;
    return arr.slice(-limit).reverse();
  }
};

export function requestId(req, _res, next) {
  req.id = req.headers['x-request-id'] || randomUUID();
  next();
}

export function accessLog(req, res, next) {
  const t = process.hrtime.bigint();
  res.on('finish', () => {
    const dur_ms = Number(process.hrtime.bigint() - t) / 1e6;
    logger.info('http', {
      rid: req.id,
      m: req.method,
      p: req.originalUrl.split('?')[0],
      s: res.statusCode,
      ms: +dur_ms.toFixed(1),
      ip: req.ip,
      ua: (req.headers['user-agent'] || '').slice(0, 120)
    });
  });
  next();
}
