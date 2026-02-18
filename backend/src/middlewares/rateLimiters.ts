import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';

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

  const store = getRedisRateLimitStore();
  return rateLimit({
    ...options,
    store: store || undefined,
  });
}

type RlRedisClient = ReturnType<typeof createClient>;

let rlClient: RlRedisClient | null = null;
let rlStore: any | null = null;

function getRedisRateLimitStore() {
  const url = String(process.env.REDIS_URL || '').trim();
  if (!url) return null;
  if (rlStore) return rlStore;

  try {
    if (!rlClient) {
      rlClient = createClient({ url });
      rlClient.connect().catch(() => undefined);
    }

    rlStore = new RedisStore({
      sendCommand: (...args: string[]) => (rlClient as any).sendCommand(args),
      prefix: 'rl:',
    });

    return rlStore;
  } catch {
    return null;
  }
}

export const aiSearchLimiter = prodRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisicoes de busca',
  keyGenerator: keyWithUser,
});

export const articleFeedbackLimiter = prodRateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisicoes de feedback',
  keyGenerator: keyWithUser,
});

export const commentLimiter = prodRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisicoes de comentario',
  keyGenerator: keyWithUser,
});

export const billingWebhookLimiter = prodRateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisicoes de webhook',
  keyGenerator: (req: any) => `asaas:${req.ip}`,
});
