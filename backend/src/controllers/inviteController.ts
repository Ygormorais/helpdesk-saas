import { Response } from 'express';
import { Invite, User, Tenant } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { notificationService } from '../services/notificationService.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'agent', 'client']),
});

export const createInvite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = createInviteSchema.parse(req.body);
    const user = req.user!;

    if (!['admin', 'manager'].includes(user.role)) {
      throw new AppError('Permissoes insuficientes', 403);
    }

    const normalizedEmail = data.email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      throw new AppError('Email ja cadastrado', 400);
    }

    const existingInvite = await Invite.findOne({
      email: normalizedEmail,
      tenant: user.tenant._id,
      status: 'pending',
    });

    if (existingInvite) {
      throw new AppError('Convite ja enviado', 400);
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const invite = await Invite.create({
      email: normalizedEmail,
      role: data.role,
      tenant: user.tenant._id,
      invitedBy: user._id,
      token,
      expiresAt,
    });

    const tenant = await Tenant.findById(user.tenant._id);
    if (tenant) {
      await notificationService.notifyUserInvited(normalizedEmail, user, tenant, data.role, token);
    }

    res.status(201).json({
      message: 'Convite enviado',
      invite: {
        id: invite._id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
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

export const getInvites = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;

  const invites = await Invite.find({ tenant: user.tenant._id })
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ invites });
};

export const cancelInvite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  if (!['admin', 'manager'].includes(user.role)) {
    throw new AppError('Permissoes insuficientes', 403);
  }

  const invite = await Invite.findOneAndUpdate(
    { _id: id, tenant: user.tenant._id, status: 'pending' },
    { status: 'cancelled' },
    { new: true }
  );

  if (!invite) {
    throw new AppError('Convite nao encontrado ou ja processado', 404);
  }

  res.json({ message: 'Convite cancelado' });
};

export const resendInvite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  if (!['admin', 'manager'].includes(user.role)) {
    throw new AppError('Permissoes insuficientes', 403);
  }

  const invite = await Invite.findOne({
    _id: id,
    tenant: user.tenant._id,
    status: 'pending',
  });

  if (!invite) {
    throw new AppError('Convite nao encontrado ou ja processado', 404);
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  invite.token = token;
  invite.expiresAt = expiresAt;
  await invite.save();

  const tenant = await Tenant.findById(user.tenant._id);
  if (tenant) {
    await notificationService.notifyUserInvited(invite.email, user, tenant, invite.role, token);
  }

  res.json({ message: 'Convite reenviado' });
};

export const acceptInvite = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { token } = req.body;

  if (!token) {
    throw new AppError('Token obrigatorio', 400);
  }

  const invite = await Invite.findOne({ token, status: 'pending' })
    .populate('tenant', 'name slug logo')
    .populate('invitedBy', 'name');

  if (!invite) {
    throw new AppError('Convite invalido ou expirado', 400);
  }

  if (new Date() > invite.expiresAt) {
    invite.status = 'expired';
    await invite.save();
    throw new AppError('Convite expirado', 400);
  }

  res.json({
    valid: true,
    invite: {
      _id: invite._id,
      email: invite.email,
      role: invite.role,
      tenant: invite.tenant,
      invitedBy: invite.invitedBy,
      expiresAt: invite.expiresAt,
    },
  });
};

export const getPendingInvites = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { email } = req.query;

  const parsedEmail = z.string().email().safeParse(String(email || ''));
  if (!parsedEmail.success) {
    res.json({ invites: [] });
    return;
  }

  const normalizedEmail = parsedEmail.data.toLowerCase();

  const invites = await Invite.find({
    email: normalizedEmail,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .limit(5)
    .select('email role tenant invitedBy expiresAt status createdAt')
    .populate('tenant', 'name slug logo')
    .populate('invitedBy', 'name');

  res.json({ invites });
};
