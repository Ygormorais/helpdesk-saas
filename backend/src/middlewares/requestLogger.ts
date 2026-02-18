import type { RequestHandler } from 'express';
import { randomUUID } from 'crypto';

function nowMs() {
  return Date.now();
}

export const requestLogger: RequestHandler = (req: any, res, next) => {
  const startedAt = nowMs();
  const requestId = randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    // Skip very noisy endpoints.
    if (req.path === '/health' || req.path === '/health/live') return;

    const durationMs = nowMs() - startedAt;
    const userId = req.user?._id ? String(req.user._id) : undefined;
    const tenantId = req.user?.tenant?._id ? String(req.user.tenant._id) : undefined;

    const line = {
      level: 'info',
      msg: 'request',
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs,
      ip: req.ip,
      userId,
      tenantId,
    };

    console.log(JSON.stringify(line));
  });

  next();
};
