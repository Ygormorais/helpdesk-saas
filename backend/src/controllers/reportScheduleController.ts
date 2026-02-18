import { Response } from 'express';
import { z } from 'zod';
import { ReportSchedule } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { reportScheduleService } from '../services/reportScheduleService.js';
import { planService } from '../services/planService.js';

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  isActive: z.boolean().optional(),
  frequency: z.enum(['daily', 'weekly']),
  hour: z.number().int().min(0).max(23),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  recipients: z.array(z.string().email()).min(1).max(10),
  params: z
    .object({
      days: z.number().int().min(1).max(365).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .optional(),
});

const updateSchema = createSchema.partial().refine((v) => Object.keys(v).length > 0, { message: 'Nenhuma atualizacao fornecida' });

export const listReportSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const rows = await ReportSchedule.find({ tenant: user.tenant._id })
    .sort({ createdAt: -1 })
    .select('name isActive frequency hour dayOfWeek recipients params nextRunAt lastRunAt lastError createdAt updatedAt');

  const plan = await planService.getPlanDetails(user.tenant._id.toString());
  const max = (plan as any)?.limits?.reportSchedules?.max ?? -1;
  const current = (plan as any)?.limits?.reportSchedules?.current ?? rows.length;

  res.json({
    schedules: rows,
    usage: { current, max },
  });
};

export const createReportSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Erro de validacao', errors: parsed.error.errors });
    return;
  }

  if (parsed.data.frequency === 'weekly' && parsed.data.dayOfWeek === undefined) {
    res.status(400).json({ message: 'dayOfWeek e obrigatorio para agendamentos semanais' });
    return;
  }

  const plan = await planService.getPlanDetails(user.tenant._id.toString());
  const max = (plan as any)?.limits?.reportSchedules?.max ?? -1;
  const current = (plan as any)?.limits?.reportSchedules?.current ?? 0;
  if (max !== -1 && current >= max) {
    throw new AppError(`Limite de agendamentos atingido (${current}/${max}). Faça upgrade para criar mais agendamentos.`, 403);
  }

  const nextRunAt = reportScheduleService.computeNextRunAt({
    frequency: parsed.data.frequency,
    hour: parsed.data.hour,
    dayOfWeek: parsed.data.dayOfWeek,
  });

  const row = await ReportSchedule.create({
    tenant: user.tenant._id,
    name: parsed.data.name,
    isActive: parsed.data.isActive ?? true,
    frequency: parsed.data.frequency,
    hour: parsed.data.hour,
    dayOfWeek: parsed.data.dayOfWeek,
    recipients: parsed.data.recipients,
    params: parsed.data.params || {},
    nextRunAt,
    createdBy: user._id,
  });

  res.status(201).json({ schedule: row });
};

export const updateReportSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Erro de validacao', errors: parsed.error.errors });
    return;
  }

  const row = await ReportSchedule.findOne({ _id: id, tenant: user.tenant._id });
  if (!row) throw new AppError('Agendamento nao encontrado', 404);

  if (parsed.data.name !== undefined) row.name = parsed.data.name;
  if (parsed.data.isActive !== undefined) row.isActive = parsed.data.isActive;
  if (parsed.data.frequency !== undefined) row.frequency = parsed.data.frequency as any;
  if (parsed.data.hour !== undefined) row.hour = parsed.data.hour;
  if (parsed.data.dayOfWeek !== undefined) row.dayOfWeek = parsed.data.dayOfWeek;
  if (parsed.data.recipients !== undefined) row.recipients = parsed.data.recipients;
  if (parsed.data.params !== undefined) row.params = parsed.data.params as any;

  // Recompute nextRunAt when scheduling changes
  if (parsed.data.frequency !== undefined || parsed.data.hour !== undefined || parsed.data.dayOfWeek !== undefined) {
    row.nextRunAt = reportScheduleService.computeNextRunAt({
      frequency: row.frequency as any,
      hour: row.hour,
      dayOfWeek: row.dayOfWeek,
    });
  }

  row.updatedBy = user._id;
  await row.save();
  res.json({ schedule: row });
};

export const deleteReportSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const out = await ReportSchedule.deleteOne({ _id: id, tenant: user.tenant._id });
  if (out.deletedCount === 0) throw new AppError('Agendamento nao encontrado', 404);
  res.json({ success: true });
};
