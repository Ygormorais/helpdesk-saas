import { Response } from 'express';
import { z } from 'zod';
import { Macro } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  content: z.string().trim().min(1).max(5000),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'No updates provided',
});

export const listMacros = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const onlyActive = String(req.query.active || '').trim() === 'true';
  const search = String(req.query.search || '').trim();

  const q: any = { tenant: user.tenant._id };
  if (onlyActive) q.isActive = true;
  if (search) q.name = { $regex: search, $options: 'i' };

  const macros = await Macro.find(q)
    .sort({ name: 1 })
    .select('name content isActive createdAt updatedAt');

  res.json({ macros });
};

export const createMacro = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.errors });
    return;
  }

  const macro = await Macro.create({
    tenant: user.tenant._id,
    name: parsed.data.name,
    content: parsed.data.content,
    isActive: parsed.data.isActive ?? true,
    createdBy: user._id,
  });

  res.status(201).json({ macro });
};

export const updateMacro = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.errors });
    return;
  }

  const macro = await Macro.findOne({ _id: id, tenant: user.tenant._id });
  if (!macro) throw new AppError('Macro not found', 404);

  if (parsed.data.name !== undefined) macro.name = parsed.data.name;
  if (parsed.data.content !== undefined) macro.content = parsed.data.content;
  if (parsed.data.isActive !== undefined) macro.isActive = parsed.data.isActive;
  macro.updatedBy = user._id;
  await macro.save();

  res.json({ macro });
};

export const deleteMacro = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const out = await Macro.deleteOne({ _id: id, tenant: user.tenant._id });
  if (out.deletedCount === 0) throw new AppError('Macro not found', 404);
  res.json({ success: true });
};
