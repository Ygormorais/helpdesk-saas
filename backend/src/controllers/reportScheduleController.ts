import { Response } from 'express';
import { z } from 'zod';
import { ReportSchedule } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { reportScheduleService } from '../services/reportScheduleService.js';

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

const updateSchema = createSchema.partial().refine((v) => Object.keys(v).length > 0, { message: 'No updates provided' });

export const listReportSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const rows = await ReportSchedule.find({ tenant: user.tenant._id })
    .sort({ createdAt: -1 })
    .select('name isActive frequency hour dayOfWeek recipients params nextRunAt lastRunAt lastError createdAt updatedAt');
  res.json({ schedules: rows });
};

export const createReportSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation error', errors: parsed.error.errors });
    return;
  }

  if (parsed.data.frequency === 'weekly' && parsed.data.dayOfWeek === undefined) {
    res.status(400).json({ message: 'dayOfWeek is required for weekly schedules' });
    return;
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
    res.status(400).json({ message: 'Validation error', errors: parsed.error.errors });
    return;
  }

  const row = await ReportSchedule.findOne({ _id: id, tenant: user.tenant._id });
  if (!row) throw new AppError('Schedule not found', 404);

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
  if (out.deletedCount === 0) throw new AppError('Schedule not found', 404);
  res.json({ success: true });
};
