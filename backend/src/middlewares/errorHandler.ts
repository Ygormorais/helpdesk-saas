import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { logger, serializeError } from '../services/logger.js';
import { metricsService } from '../services/metricsService.js';

type AppErrorOptions = {
  code?: string;
  details?: unknown;
  cause?: unknown;
  isOperational?: boolean;
};

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: unknown;

  constructor(message: string, statusCode: number, options: AppErrorOptions = {}) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = options.isOperational ?? true;
    this.code = options.code;
    this.details = options.details;
    if (options.cause !== undefined) {
      (this as any).cause = options.cause;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

function resolveRoute(req: Request): string {
  if ((req as any).route?.path) {
    return `${req.baseUrl || ''}${(req as any).route.path}`;
  }
  return String(req.originalUrl || req.url || '').split('?')[0] || '/';
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = (req as any).requestId;
  const userId = (req as any).user?._id ? String((req as any).user._id) : undefined;
  const tenantId = (req as any).user?.tenant?._id ? String((req as any).user.tenant._id) : undefined;
  const route = resolveRoute(req);

  let statusCode = (err as any)?.statusCode;
  let errorCode = (err as any)?.code;
  let isOperational = Boolean((err as any)?.isOperational);
  let details: unknown = (err as any)?.details;

  if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    isOperational = true;
    details = err.errors;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    errorCode = 'MONGOOSE_VALIDATION_ERROR';
    isOperational = true;
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    errorCode = 'INVALID_ID_FORMAT';
    isOperational = true;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code || 'APP_ERROR';
    isOperational = err.isOperational;
    details = err.details;
  } else {
    statusCode = 500;
    errorCode = 'UNEXPECTED_ERROR';
    isOperational = false;
  }

  (res as any).locals.errorCode = errorCode;

  metricsService.observeError({
    method: req.method,
    route,
    statusCode,
    errorCode,
    isOperational,
  });

  const line = {
    msg: 'error',
    requestId,
    method: req.method,
    route,
    path: req.originalUrl,
    status: statusCode,
    errorCode,
    name: err.name,
    message: err.message,
    isOperational,
    details,
    userId,
    tenantId,
    error: serializeError(err, { includeStack: statusCode >= 500 || !isOperational }),
  };
  logger.error(line);

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Erro de validacao',
      errors: err.errors,
      errorCode,
      requestId,
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      message: 'Erro de validacao',
      errors: Object.values(err.errors).map((e) => e.message),
      errorCode,
      requestId,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      errorCode,
      requestId,
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      message: 'Formato de ID invalido',
      errorCode,
      requestId,
    });
    return;
  }

  res.status(500).json({
    message: 'Erro interno do servidor',
    errorCode,
    requestId,
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    message: `Rota ${req.originalUrl} nao encontrada`,
    errorCode: 'ROUTE_NOT_FOUND',
    requestId: (req as any).requestId,
  });
};
