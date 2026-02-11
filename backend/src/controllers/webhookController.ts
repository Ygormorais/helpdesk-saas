import { Response } from 'express';
import { Webhook } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { webhookService } from '../services/webhookService.js';
import { z } from 'zod';

const createWebhookSchema = z.object({
  name: z.string().min(3),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  headers: z.record(z.string()).optional(),
});

const updateWebhookSchema = z.object({
  name: z.string().min(3).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const getWebhooks = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;

  const webhooks = await Webhook.find({ tenant: user.tenant._id })
    .sort({ createdAt: -1 });

  const safeWebhooks = webhooks.map((w) => ({
    id: w._id,
    name: w.name,
    url: w.url,
    events: w.events,
    isActive: w.isActive,
    failureCount: w.failureCount,
    lastTriggeredAt: w.lastTriggeredAt,
    lastFailedAt: w.lastFailedAt,
    createdAt: w.createdAt,
  }));

  res.json({ webhooks: safeWebhooks });
};

export const createWebhook = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = createWebhookSchema.parse(req.body);
    const user = req.user!;

    if (!['admin', 'manager'].includes(user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    const webhook = await webhookService.createWebhook({
      name: data.name,
      url: data.url,
      events: data.events,
      tenant: user.tenant._id.toString(),
      headers: data.headers,
    });

    res.status(201).json({
      message: 'Webhook created',
      webhook: {
        id: webhook._id,
        name: webhook.name,
        url: webhook.url,
        secret: webhook.secret,
        events: webhook.events,
        isActive: webhook.isActive,
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

export const updateWebhook = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const data = updateWebhookSchema.parse(req.body);
    const user = req.user!;

    if (!['admin', 'manager'].includes(user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    const webhook = await Webhook.findOne({
      _id: id,
      tenant: user.tenant._id,
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    if (data.name) webhook.name = data.name;
    if (data.url) webhook.url = data.url;
    if (data.events) webhook.events = data.events;
    if (data.headers) webhook.headers = new Map(Object.entries(data.headers));
    if (typeof data.isActive === 'boolean') webhook.isActive = data.isActive;

    await webhook.save();

    res.json({ message: 'Webhook updated', webhook: { id: webhook._id, name: webhook.name, isActive: webhook.isActive } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const deleteWebhook = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  if (!['admin', 'manager'].includes(user.role)) {
    throw new AppError('Insufficient permissions', 403);
  }

  const webhook = await Webhook.findOneAndDelete({
    _id: id,
    tenant: user.tenant._id,
  });

  if (!webhook) {
    throw new AppError('Webhook not found', 404);
  }

  res.json({ message: 'Webhook deleted' });
};

export const testWebhook = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  const webhook = await Webhook.findOne({
    _id: id,
    tenant: user.tenant._id,
  });

  if (!webhook) {
    throw new AppError('Webhook not found', 404);
  }

  const result = await webhookService.testWebhook(webhook);

  res.json({
    success: result.success,
    status: result.status,
    error: result.error,
  });
};
