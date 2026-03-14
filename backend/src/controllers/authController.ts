import { Response } from 'express';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import { Invite, Tenant, User, UserRole } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { planService } from '../services/planService.js';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  tenantName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const googleLoginSchema = z.object({
  credential: z.string().min(1),
});

const registerInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
  name: z.string().min(2),
});

const generateToken = (userId: string, tenantId: string): string => {
  return jwt.sign(
    { userId, tenantId },
    config.jwt.secret as Secret,
    { expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'] }
  );
};

const invalidAccountError = (details: Record<string, unknown>, cause?: unknown): AppError =>
  new AppError('Conta com configuracao invalida. Contate o suporte', 409, {
    code: 'AUTH_ACCOUNT_INVALID',
    details,
    cause,
  });

const getGoogleClient = (): OAuth2Client => {
  if (!config.google.clientId.trim()) {
    throw new AppError('Login com Google nao configurado', 503, {
      code: 'GOOGLE_SSO_NOT_CONFIGURED',
    });
  }

  return new OAuth2Client(config.google.clientId);
};

const resolveUserTenant = (user: any): any => {
  const tenant = user.tenant as any;
  if (!tenant?._id) {
    throw invalidAccountError({
      reason: 'tenant_missing',
      userId: user._id?.toString(),
      email: user.email,
    });
  }

  if (tenant.isActive === false) {
    throw new AppError('Tenant inativo', 403, {
      code: 'TENANT_INACTIVE',
    });
  }

  return tenant;
};

const buildAuthResponse = (
  user: any,
  tenant: any,
  token: string,
  message: string,
  avatarOverride?: string
) => ({
  message,
  token,
  user: {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: avatarOverride || user.avatar,
    tenant: {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
    },
  },
});

export const register = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, password, name, tenantName } = registerSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError('Email ja cadastrado', 400);
    }

    const tenant = await Tenant.create({
      name: tenantName,
      slug: tenantName.toLowerCase().replace(/\s+/g, '-'),
    });

    // Inicializa plano com trial de 14 dias
    await planService.initializeTenantPlan(tenant._id.toString());

    const user = await User.create({
      email: normalizedEmail,
      password,
      name,
      role: UserRole.ADMIN,
      tenant: tenant._id,
    });

    const token = generateToken(user._id.toString(), tenant._id.toString());

    res.status(201).json({
      message: 'Usuario registrado com sucesso',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: {
          id: tenant._id,
          name: tenant.name,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Erro de validacao', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const login = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).populate('tenant');
    if (!user) {
      throw new AppError('Credenciais invalidas', 401);
    }

    let isMatch = false;
    try {
      isMatch = await user.comparePassword(password);
    } catch (error) {
      throw invalidAccountError(
        {
          reason: 'password_compare_failed',
          userId: user._id?.toString(),
          email: user.email,
        },
        error
      );
    }

    if (!isMatch) {
      throw new AppError('Credenciais invalidas', 401);
    }

    if (!user.isActive) {
      throw new AppError('Conta inativa', 401);
    }

    const tenant = resolveUserTenant(user);
    const token = generateToken(user._id.toString(), tenant._id.toString());

    res.json(buildAuthResponse(user, tenant, token, 'Login realizado com sucesso'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Erro de validacao', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const googleLogin = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { credential } = googleLoginSchema.parse(req.body);
    const googleClient = getGoogleClient();
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.google.clientId,
      });
    } catch (error) {
      throw new AppError('Conta Google invalida ou expirada', 401, {
        code: 'GOOGLE_IDENTITY_INVALID',
        cause: error,
      });
    }

    const payload = ticket.getPayload();
    const normalizedEmail = String(payload?.email || '').trim().toLowerCase();

    if (!payload?.email_verified || !normalizedEmail) {
      throw new AppError('Conta Google invalida', 401, {
        code: 'GOOGLE_IDENTITY_INVALID',
      });
    }

    const emailDomain = normalizedEmail.split('@')[1] || '';
    if (
      config.google.allowedDomains.length > 0
      && !config.google.allowedDomains.includes(emailDomain)
    ) {
      throw new AppError('Dominio do Google nao permitido', 403, {
        code: 'GOOGLE_DOMAIN_NOT_ALLOWED',
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).populate('tenant');
    if (!user) {
      throw new AppError('Conta nao provisionada. Cadastre-se primeiro.', 404, {
        code: 'AUTH_ACCOUNT_NOT_PROVISIONED',
      });
    }

    if (!user.isActive) {
      throw new AppError('Conta inativa', 401);
    }

    const tenant = resolveUserTenant(user);
    const token = generateToken(user._id.toString(), tenant._id.toString());

    res.json(
      buildAuthResponse(
        user,
        tenant,
        token,
        'Login com Google realizado com sucesso',
        String(payload.picture || '').trim() || undefined
      )
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Erro de validacao', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const registerInvite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { token, password, name } = registerInviteSchema.parse(req.body);

    const invite = await Invite.findOne({ token, status: 'pending' }).populate('tenant');
    if (!invite) {
      throw new AppError('Convite invalido ou expirado', 400);
    }

    if (new Date() > invite.expiresAt) {
      invite.status = 'expired';
      await invite.save();
      throw new AppError('Convite expirado', 400);
    }

    const existingUser = await User.findOne({ email: invite.email });
    if (existingUser) {
      throw new AppError('Email ja cadastrado', 400);
    }

    const tenant: any = invite.tenant as any;
    if (!tenant?._id) {
      throw new AppError('Tenant nao encontrado', 400);
    }

    const user = await User.create({
      email: invite.email,
      password,
      name,
      role: invite.role,
      tenant: tenant._id,
    });

    invite.status = 'accepted';
    await invite.save();

    const jwtToken = generateToken(user._id.toString(), tenant._id.toString());

    res.status(201).json({
      message: 'Usuario registrado com sucesso',
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Erro de validacao', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ message: 'Nao autorizado' });
    return;
  }

  const tenant: any = user.tenant as any;

  res.json({
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      tenant: tenant?._id
        ? {
            id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
          }
        : undefined,
    },
  });
};
