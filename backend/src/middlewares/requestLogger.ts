import type { RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { metricsService } from '../services/metricsService.js';
import { logger } from '../services/logger.js';
import { runWithContext } from '../services/requestContext.js';

function nowMs() {
  return Date.now();
}

export const requestLogger: RequestHandler = (req: any, res, next) => {
  const startedAt = nowMs();
  const incoming = String(req.headers['x-request-id'] || '').trim();
  const requestId = incoming || randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    // Skip very noisy endpoints.
    if (req.path === '/health' || req.path === '/health/live' || req.path === '/api/health' || req.path === '/api/health/live') return;

    const durationMs = nowMs() - startedAt;

    const route = req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : String((req.originalUrl || req.url) || '').split('?')[0];
    const errorCode = String((res as any).locals?.errorCode || '');

    metricsService.observeHttp({
      method: req.method,
      route: route || '/',
      statusCode: res.statusCode,
      durationMs,
      errorCode: errorCode || undefined,
    });
    const userId = req.user?._id ? String(req.user._id) : undefined;
    const tenantId = req.user?.tenant?._id ? String(req.user.tenant._id) : undefined;

    if (!logger.shouldLogHttpSuccess() && res.statusCode < 400) {
      return;
    }

    const line = {
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

    logger.info(line);
  });

  runWithContext({ requestId }, () => next());
};
