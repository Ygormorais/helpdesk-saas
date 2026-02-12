import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { Tenant, User, UserRole } from '../models/index.js';
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

const generateToken = (userId: string, tenantId: string): string => {
  return jwt.sign(
    { userId, tenantId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

export const register = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, password, name, tenantName } = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email });
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
      email,
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

    const user = await User.findOne({ email }).populate('tenant');
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

    const token = generateToken(user._id.toString(), user.tenant._id.toString());

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
          id: user.tenant._id,
          name: user.tenant.name,
          slug: (user.tenant as any).slug,
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

  res.json({
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    },
  });
};
