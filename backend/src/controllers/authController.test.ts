import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { login } from './authController';
import { User } from '../models/index.js';
import { AppError } from '../middlewares/errorHandler.js';

describe('authController.login', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws a controlled error when the user tenant cannot be resolved', async () => {
    const user = {
      _id: 'user-1',
      email: 'admin@technova.com.br',
      isActive: true,
      tenant: null,
      comparePassword: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(User, 'findOne').mockReturnValue({
      populate: vi.fn().mockResolvedValue(user),
    } as any);
    const jwtSignSpy = vi.spyOn(jwt, 'sign');

    await expect(
      login(
        {
          body: {
            email: 'admin@technova.com.br',
            password: 'admin123',
          },
        } as any,
        {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        } as unknown as Response
      )
    ).rejects.toMatchObject<AppError>({
      message: 'Conta com configuracao invalida. Contate o suporte',
      statusCode: 409,
      code: 'AUTH_ACCOUNT_INVALID',
    });

    expect(jwtSignSpy).not.toHaveBeenCalled();
  });

  it('throws a controlled error when password comparison fails due to invalid account data', async () => {
    const user = {
      _id: 'user-1',
      email: 'admin@technova.com.br',
      isActive: true,
      tenant: {
        _id: 'tenant-1',
        name: 'Technova',
        slug: 'technova',
        isActive: true,
      },
      comparePassword: vi.fn().mockRejectedValue(new Error('Illegal arguments')),
    };

    vi.spyOn(User, 'findOne').mockReturnValue({
      populate: vi.fn().mockResolvedValue(user),
    } as any);
    const jwtSignSpy = vi.spyOn(jwt, 'sign');

    await expect(
      login(
        {
          body: {
            email: 'admin@technova.com.br',
            password: 'admin123',
          },
        } as any,
        {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        } as unknown as Response
      )
    ).rejects.toMatchObject<AppError>({
      message: 'Conta com configuracao invalida. Contate o suporte',
      statusCode: 409,
      code: 'AUTH_ACCOUNT_INVALID',
    });

    expect(jwtSignSpy).not.toHaveBeenCalled();
  });
});
