import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from './auth';
import { User } from '../models/index';

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    req = {
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  it('should return 401 if no authorization header', async () => {
    await authenticate(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Nao autorizado' });
  });

  it('should return 401 if token is invalid', async () => {
    req.headers = { authorization: 'Bearer invalid-token' };
    vi.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new Error('invalid');
    });
    await authenticate(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should call next if token is valid', async () => {
    const mockUser = {
      _id: 'user123',
      tenant: 'tenant123',
      isActive: true,
      role: 'admin',
    };

    vi.spyOn(jwt, 'verify').mockReturnValue({
      userId: 'user123',
      tenantId: 'tenant123',
    } as any);

    const populate = vi.fn().mockResolvedValue(mockUser as any);
    vi.spyOn(User, 'findById').mockReturnValue({ populate } as any);
    req.headers = { authorization: 'Bearer valid-token' };

    await authenticate(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('Authorization Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    req = { user: undefined };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  it('should return 401 if no user', async () => {
    const middleware = authorize('admin', 'manager');
    await middleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 403 if user role is not allowed', async () => {
    req.user = { role: 'client' } as any;
    const middleware = authorize('admin', 'manager');
    await middleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Acesso negado' });
  });

  it('should call next if user role is allowed', async () => {
    req.user = { role: 'admin' } as any;
    const middleware = authorize('admin', 'manager');
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });
});
