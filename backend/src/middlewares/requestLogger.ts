import type { RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { metricsService } from '../services/metricsService.js';
import { logger } from '../services/logger.js';

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

    metricsService.inc('http_requests_total', 1);
    metricsService.observeLatency(durationMs);
    if (res.statusCode >= 400 && res.statusCode < 500) metricsService.inc('http_4xx_total', 1);
    if (res.statusCode >= 500) metricsService.inc('http_5xx_total', 1);
    if (res.statusCode === 503 && String((res as any).locals?.errorCode || '') === 'DB_NOT_READY') {
      metricsService.inc('db_not_ready_total', 1);
    }
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

  next();
};
