import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

function noop(): RequestHandler {
  return (_req, _res, next) => next();
}

function keyWithUser(req: any): string {
  const userId = req?.user?._id ? String(req.user._id) : 'anon';
  const tenantId = req?.user?.tenant?._id ? String(req.user.tenant._id) : 'no-tenant';
  return `${tenantId}:${userId}:${req.ip}`;
}

export function prodRateLimit(options: Parameters<typeof rateLimit>[0]): RequestHandler {
  if (config.nodeEnv !== 'production') return noop();
  return rateLimit(options);
}

export const aiSearchLimiter = prodRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many search requests',
  keyGenerator: keyWithUser,
});

export const articleFeedbackLimiter = prodRateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many feedback requests',
  keyGenerator: keyWithUser,
});

export const commentLimiter = prodRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many comment requests',
  keyGenerator: keyWithUser,
});

export const billingWebhookLimiter = prodRateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many webhook requests',
  keyGenerator: (req: any) => `asaas:${req.ip}`,
});
