import type { RequestHandler } from 'express';
import mongoose from 'mongoose';

export const requireDbConnection: RequestHandler = (req, res, next) => {
  // Allow API health endpoints even when DB is down.
  if (req.path === '/health' || req.path.startsWith('/health/')) {
    next();
    return;
  }

  const state = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (state !== 1) {
    (res as any).locals = (res as any).locals || {};
    (res as any).locals.errorCode = 'DB_NOT_READY';
    res.status(503).json({
      message: 'Database not connected',
      code: 'DB_NOT_READY',
    });
    return;
  }
  next();
};
