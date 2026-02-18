import { Response } from 'express';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
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

export const register = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, password, name, tenantName } = registerSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
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
      message: 'User registered successfully',
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
      res.status(400).json({ message: 'Validation error', errors: error.errors });
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
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is inactive', 401);
    }

    const tenant = user.tenant as any;

    const token = generateToken(user._id.toString(), tenant._id.toString());

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        tenant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
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
      throw new AppError('Invalid or expired invite', 400);
    }

    if (new Date() > invite.expiresAt) {
      invite.status = 'expired';
      await invite.save();
      throw new AppError('Invite has expired', 400);
    }

    const existingUser = await User.findOne({ email: invite.email });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    const tenant: any = invite.tenant as any;
    if (!tenant?._id) {
      throw new AppError('Tenant not found', 400);
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
      message: 'User registered successfully',
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
      res.status(400).json({ message: 'Validation error', errors: error.errors });
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
    res.status(401).json({ message: 'Unauthorized' });
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
