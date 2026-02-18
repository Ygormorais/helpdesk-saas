import { Response } from 'express';
import { z } from 'zod';
import { AutomationRule } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  isActive: z.boolean().optional(),
  trigger: z.literal('ticket.created'),
  conditions: z
    .object({
      category: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    })
    .optional(),
  actions: z.object({
    assignTo: z.string().optional(),
    setStatus: z.enum(['open', 'in_progress']).optional(),
  }),
});

const updateSchema = createSchema
  .omit({ trigger: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No updates provided' });

export const listAutomationRules = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const rules = await AutomationRule.find({ tenant: user.tenant._id })
    .sort({ createdAt: -1 })
    .populate('conditions.category', 'name')
    .populate('actions.assignTo', 'name email')
    .select('name isActive trigger conditions actions createdAt updatedAt');

  res.json({ rules });
};

export const createAutomationRule = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.errors });
    return;
  }

  if (!parsed.data.actions.assignTo && !parsed.data.actions.setStatus) {
    res.status(400).json({ message: 'At least one action is required' });
    return;
  }

  const rule = await AutomationRule.create({
    tenant: user.tenant._id,
    name: parsed.data.name,
    isActive: parsed.data.isActive ?? true,
    trigger: parsed.data.trigger,
    conditions: {
      category: parsed.data.conditions?.category || undefined,
      priority: parsed.data.conditions?.priority,
    },
    actions: {
      assignTo: parsed.data.actions.assignTo || undefined,
      setStatus: parsed.data.actions.setStatus || undefined,
    },
    createdBy: user._id,
  });

  res.status(201).json({ rule });
};

export const updateAutomationRule = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.errors });
    return;
  }

  const rule = await AutomationRule.findOne({ _id: id, tenant: user.tenant._id });
  if (!rule) throw new AppError('Rule not found', 404);

  if (parsed.data.name !== undefined) rule.name = parsed.data.name;
  if (parsed.data.isActive !== undefined) rule.isActive = parsed.data.isActive;
  if (parsed.data.conditions !== undefined) {
    rule.conditions = {
      category: parsed.data.conditions?.category as any,
      priority: parsed.data.conditions?.priority,
    } as any;
  }
  if (parsed.data.actions !== undefined) {
    rule.actions = {
      assignTo: parsed.data.actions?.assignTo as any,
      setStatus: parsed.data.actions?.setStatus,
    } as any;
  }
  rule.updatedBy = user._id;
  await rule.save();

  res.json({ rule });
};

export const deleteAutomationRule = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const out = await AutomationRule.deleteOne({ _id: id, tenant: user.tenant._id });
  if (out.deletedCount === 0) throw new AppError('Rule not found', 404);
  res.json({ success: true });
};
