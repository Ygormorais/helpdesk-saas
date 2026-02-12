import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { authenticate } from './auth';
import { User } from '../models/index';

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: any;

  beforeEach(() => {
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
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  it('should return 401 if token is invalid', async () => {
    req.headers = { authorization: 'Bearer invalid-token' };
    await authenticate(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should call next if token is valid', async () => {
    const mockUser = {
      _id: 'user123',
      isActive: true,
      populate: vi.fn().mockResolvedValue({}),
    };

    vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);
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
    req = { user: undefined };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  it('should return 401 if no user', async () => {
    const authorize = authenticate()('admin', 'manager');
    await authorize(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 403 if user role is not allowed', async () => {
    req.user = { role: 'client' } as any;
    const authorize = authenticate()('admin', 'manager');
    await authorize(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
  });

  it('should call next if user role is allowed', async () => {
    req.user = { role: 'admin' } as any;
    const authorize = authenticate()('admin', 'manager');
    await authorize(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });
});
