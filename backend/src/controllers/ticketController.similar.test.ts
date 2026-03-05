import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { Ticket } from '../models/index';
import { getSimilarTickets } from './ticketController';

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return res as Response;
}

describe('getSimilarTickets', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 for invalid query', async () => {
    const req: Partial<Request> = {
      user: { role: 'client', _id: 'u1', tenant: { _id: 't1' } } as any,
      query: { q: 'abc' },
    };

    const res = mockRes();
    await getSimilarTickets(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });

  it('applies client scoping (createdBy) in query', async () => {
    const chain = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    };

    const findSpy = vi.spyOn(Ticket, 'find').mockReturnValue(chain as any);

    const req: Partial<Request> = {
      user: { role: 'client', _id: 'u1', tenant: { _id: 't1' } } as any,
      query: { q: 'nao consigo acessar minha conta', limit: '5' },
    };
    const res = mockRes();

    await getSimilarTickets(req as any, res);

    const firstCall = findSpy.mock.calls[0];
    expect(firstCall).toBeTruthy();
    expect(firstCall[0]).toEqual(expect.objectContaining({ tenant: 't1', createdBy: 'u1' }));
    expect(res.json).toHaveBeenCalledWith({ tickets: [] });
  });

  it('does not apply createdBy scoping for staff', async () => {
    const chain = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    };

    const findSpy = vi.spyOn(Ticket, 'find').mockReturnValue(chain as any);

    const req: Partial<Request> = {
      user: { role: 'agent', _id: 'u2', tenant: { _id: 't1' } } as any,
      query: { q: 'erro 500 ao abrir dashboard' },
    };
    const res = mockRes();

    await getSimilarTickets(req as any, res);

    const q0 = findSpy.mock.calls[0]?.[0] as any;
    expect(q0.tenant).toBe('t1');
    expect(q0.createdBy).toBeUndefined();
    expect(res.json).toHaveBeenCalledWith({ tickets: [] });
  });
});
