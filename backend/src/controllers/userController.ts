import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.js';
import { User } from '../models/index.js';

const listUsersQuerySchema = z.object({
  staffOnly: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  excludeSelf: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const parsed = listUsersQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ message: 'Consulta invalida', errors: parsed.error.errors });
    return;
  }

  const { staffOnly, excludeSelf } = parsed.data;

  const query: Record<string, any> = {
    tenant: (user.tenant as any)?._id || user.tenant,
    isActive: true,
  };

  if (staffOnly) {
    query.role = { $ne: 'client' };
  }

  if (excludeSelf) {
    query._id = { $ne: user._id };
  }

  const users = await User.find(query)
    .select('_id name email role avatar isActive')
    .sort({ name: 1 });

  res.json({
    users: users.map((u) => ({
      id: u._id,
      email: u.email,
      name: u.name,
      role: u.role,
      avatar: u.avatar,
      isActive: u.isActive,
    })),
  });
};
