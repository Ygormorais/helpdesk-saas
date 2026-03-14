import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import { googleLogin, login } from './authController';
import { User } from '../models/index.js';
import { AppError } from '../middlewares/errorHandler.js';

describe('authController', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    config.google.clientId = 'google-client-id';
    config.google.allowedDomains = [];
  });

  describe('login', () => {
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

  describe('googleLogin', () => {
    it('returns a controlled error when Google token validation fails', async () => {
      vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(
        new Error('Wrong number of segments in token')
      );

      await expect(
        googleLogin(
          {
            body: {
              credential: 'invalid-token',
            },
          } as any,
          {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
          } as unknown as Response
        )
      ).rejects.toMatchObject<AppError>({
        message: 'Conta Google invalida ou expirada',
        statusCode: 401,
        code: 'GOOGLE_IDENTITY_INVALID',
      });
    });

    it('logs in an existing provisioned user from a valid Google identity token', async () => {
      const response = {
        json: vi.fn(),
      } as unknown as Response;
      const user = {
        _id: 'user-1',
        email: 'admin@technova.com.br',
        name: 'Admin Technova',
        role: 'admin',
        avatar: '',
        isActive: true,
        tenant: {
          _id: 'tenant-1',
          name: 'Technova',
          slug: 'technova',
          isActive: true,
        },
      };

      vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          email: 'admin@technova.com.br',
          email_verified: true,
          picture: 'https://example.com/avatar.png',
        }),
      } as any);
      vi.spyOn(User, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue(user),
      } as any);
      vi.spyOn(jwt, 'sign').mockReturnValue('jwt-local-token' as never);

      await googleLogin(
        {
          body: {
            credential: 'google-id-token',
          },
        } as any,
        response
      );

      expect(response.json).toHaveBeenCalledWith({
        message: 'Login com Google realizado com sucesso',
        token: 'jwt-local-token',
        user: {
          id: 'user-1',
          email: 'admin@technova.com.br',
          name: 'Admin Technova',
          role: 'admin',
          avatar: 'https://example.com/avatar.png',
          tenant: {
            id: 'tenant-1',
            name: 'Technova',
            slug: 'technova',
          },
        },
      });
    });

    it('returns a controlled error when the Google account is valid but not provisioned', async () => {
      vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          email: 'missing@technova.com.br',
          email_verified: true,
        }),
      } as any);
      vi.spyOn(User, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(
        googleLogin(
          {
            body: {
              credential: 'google-id-token',
            },
          } as any,
          {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
          } as unknown as Response
        )
      ).rejects.toMatchObject<AppError>({
        message: 'Conta nao provisionada. Cadastre-se primeiro.',
        statusCode: 404,
        code: 'AUTH_ACCOUNT_NOT_PROVISIONED',
      });
    });
  });
});
