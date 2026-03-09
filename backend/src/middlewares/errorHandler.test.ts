import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { AppError, errorHandler } from './errorHandler';
import { logger } from '../services/logger';
import { metricsService } from '../services/metricsService';

describe('errorHandler', () => {
  let req: Partial<Request>;
  let res: Partial<Response> & { locals: Record<string, unknown> };

  beforeEach(() => {
    vi.restoreAllMocks();
    req = {
      method: 'POST',
      originalUrl: '/api/test',
      url: '/api/test',
      baseUrl: '/api',
      route: { path: '/test' } as any,
      requestId: 'req-123',
    };
    res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    vi.spyOn(metricsService, 'observeError').mockImplementation(() => undefined);
  });

  it('returns operational error metadata for AppError', () => {
    const err = new AppError('Falha controlada', 409, {
      code: 'CONFLICT_TEST',
      details: { field: 'email' },
    });

    errorHandler(err, req as Request, res as unknown as Response, vi.fn());

    expect(metricsService.observeError).toHaveBeenCalledWith({
      method: 'POST',
      route: '/api/test',
      statusCode: 409,
      errorCode: 'CONFLICT_TEST',
      isOperational: true,
    });
    expect(res.locals.errorCode).toBe('CONFLICT_TEST');
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Falha controlada',
      errorCode: 'CONFLICT_TEST',
      requestId: 'req-123',
    });
  });

  it('returns unexpected error metadata for generic errors', () => {
    const err = new Error('boom');

    errorHandler(err, req as Request, res as unknown as Response, vi.fn());

    expect(metricsService.observeError).toHaveBeenCalledWith({
      method: 'POST',
      route: '/api/test',
      statusCode: 500,
      errorCode: 'UNEXPECTED_ERROR',
      isOperational: false,
    });
    expect(res.locals.errorCode).toBe('UNEXPECTED_ERROR');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Erro interno do servidor',
      errorCode: 'UNEXPECTED_ERROR',
      requestId: 'req-123',
    });
  });
});
