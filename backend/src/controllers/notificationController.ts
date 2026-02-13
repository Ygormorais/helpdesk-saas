import { Response } from 'express';
import { Notification } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { z } from 'zod';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  unreadOnly: z.preprocess((v) => {
    if (v === 'true' || v === '1' || v === true) return true;
    if (v === 'false' || v === '0' || v === false) return false;
    return v;
  }, z.boolean().optional()),
});

export const listNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { page, limit, unreadOnly } = listQuerySchema.parse(req.query);

  const query: any = {
    tenant: user.tenant._id,
  };

  if (unreadOnly) {
    query.readBy = { $ne: user._id };
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('type title message data ticket chat createdBy readBy createdAt'),
    Notification.countDocuments(query),
  ]);

  const notifications = items.map((n) => ({
    id: n._id,
    type: n.type,
    title: n.title,
    message: n.message,
    data: n.data,
    ticketId: n.ticket,
    chatId: n.chat,
    createdBy: n.createdBy,
    createdAt: n.createdAt,
    read: n.readBy.some((u) => u.toString() === user._id.toString()),
  }));

  res.json({
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  await Notification.updateOne(
    { _id: id, tenant: user.tenant._id },
    { $addToSet: { readBy: user._id } }
  );

  res.json({ success: true });
};

export const markAllRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;

  await Notification.updateMany(
    { tenant: user.tenant._id, readBy: { $ne: user._id } },
    { $addToSet: { readBy: user._id } }
  );

  res.json({ success: true });
};

export const clearMyNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;

  // Clearing only marks as read to avoid deleting other users' notifications.
  await Notification.updateMany(
    { tenant: user.tenant._id, readBy: { $ne: user._id } },
    { $addToSet: { readBy: user._id } }
  );

  res.json({ success: true });
};
