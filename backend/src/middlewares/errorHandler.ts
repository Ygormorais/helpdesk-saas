import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { logger } from '../services/logger.js';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
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

  const line = {
    msg: 'error',
    requestId,
    method: req.method,
    path: req.originalUrl,
    status: (err as any)?.statusCode,
    name: err.name,
    message: err.message,
    userId,
    tenantId,
  };
  logger.error(line);

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation error',
      errors: err.errors,
      requestId,
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map((e) => e.message),
      requestId,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      requestId,
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      message: 'Invalid ID format',
      requestId,
    });
    return;
  }

  res.status(500).json({
    message: 'Internal Server Error',
    requestId,
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
    requestId: (req as any).requestId,
  });
};
