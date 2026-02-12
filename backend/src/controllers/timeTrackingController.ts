import { Response } from 'express';
import { TimeEntry, Ticket } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { z } from 'zod';

const createTimeEntrySchema = z.object({
  ticketId: z.string(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  duration: z.number().optional(),
  isBillable: z.boolean().optional(),
});

const updateTimeEntrySchema = z.object({
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  duration: z.number().optional(),
  isBillable: z.boolean().optional(),
});

export const startTimer = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { ticketId, description } = req.body;
    const user = req.user!;

    const ticket = await Ticket.findOne({
      _id: ticketId,
      tenant: user.tenant._id,
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    const existingTimer = await TimeEntry.findOne({
      ticket: ticketId,
      user: user._id,
      endTime: { $exists: false },
    });

    if (existingTimer) {
      throw new AppError('Timer already running for this ticket', 400);
    }

    const timeEntry = await TimeEntry.create({
      ticket: ticketId,
      user: user._id,
      tenant: user.tenant._id,
      description,
      startTime: new Date(),
    });

    await timeEntry.populate('user', 'name email');
    await timeEntry.populate('ticket', 'ticketNumber title');

    res.status(201).json({ timeEntry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const stopTimer = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  const timeEntry = await TimeEntry.findOne({
    _id: id,
    user: user._id,
    endTime: { $exists: false },
  });

  if (!timeEntry) {
    throw new AppError('Timer not found or already stopped', 404);
  }

  timeEntry.endTime = new Date();
  await timeEntry.save();

  await timeEntry.populate('user', 'name email');
  await timeEntry.populate('ticket', 'ticketNumber title');

  res.json({ timeEntry });
};

export const createManualEntry = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = createTimeEntrySchema.parse(req.body);
    const user = req.user!;

    const ticket = await Ticket.findOne({
      _id: data.ticketId,
      tenant: user.tenant._id,
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    const startTime = data.startTime ? new Date(data.startTime) : new Date();
    const endTime = data.endTime ? new Date(data.endTime) : undefined;
    const duration = data.duration || (endTime ? endTime.getTime() - startTime.getTime() : 0);

    const timeEntry = await TimeEntry.create({
      ticket: data.ticketId,
      user: user._id,
      tenant: user.tenant._id,
      description: data.description,
      startTime,
      endTime,
      duration,
      isBillable: data.isBillable ?? true,
    });

    await timeEntry.populate('user', 'name email');
    await timeEntry.populate('ticket', 'ticketNumber title');

    res.status(201).json({ timeEntry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const updateTimeEntry = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const data = updateTimeEntrySchema.parse(req.body);
    const user = req.user!;

    const timeEntry = await TimeEntry.findOne({
      _id: id,
      tenant: user.tenant._id,
      user: user._id,
    });

    if (!timeEntry) {
      throw new AppError('Time entry not found', 404);
    }

    if (data.description !== undefined) timeEntry.description = data.description;
    if (data.startTime) timeEntry.startTime = new Date(data.startTime);
    if (data.endTime) timeEntry.endTime = new Date(data.endTime);
    if (data.duration) timeEntry.duration = data.duration;
    if (data.isBillable !== undefined) timeEntry.isBillable = data.isBillable;

    await timeEntry.save();
    await timeEntry.populate('user', 'name email');
    await timeEntry.populate('ticket', 'ticketNumber title');

    res.json({ timeEntry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const deleteTimeEntry = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  const timeEntry = await TimeEntry.findOneAndDelete({
    _id: id,
    tenant: user.tenant._id,
    user: user._id,
  });

  if (!timeEntry) {
    throw new AppError('Time entry not found', 404);
  }

  res.json({ message: 'Time entry deleted' });
};

export const getTicketTimeEntries = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { ticketId } = req.params;
  const user = req.user!;

  const entries = await TimeEntry.find({
    ticket: ticketId,
    tenant: user.tenant._id,
  })
    .populate('user', 'name email')
    .sort({ startTime: -1 });

  const totalDuration = entries.reduce((acc, e) => acc + (e.duration || 0), 0);

  res.json({ entries, totalDuration });
};

export const getMyTimeEntries = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { startDate, endDate } = req.query;

  const query: any = {
    tenant: user.tenant._id,
    user: user._id,
  };

  if (startDate || endDate) {
    query.startTime = {};
    if (startDate) query.startTime.$gte = new Date(startDate as string);
    if (endDate) query.startTime.$lte = new Date(endDate as string);
  }

  const entries = await TimeEntry.find(query)
    .populate('ticket', 'ticketNumber title')
    .sort({ startTime: -1 });

  const totalDuration = entries.reduce((acc, e) => acc + (e.duration || 0), 0);
  const billableDuration = entries
    .filter((e) => e.isBillable)
    .reduce((acc, e) => acc + (e.duration || 0), 0);

  res.json({ entries, totalDuration, billableDuration });
};

export const getActiveTimer = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;

  const activeTimer = await TimeEntry.findOne({
    user: user._id,
    endTime: { $exists: false },
  })
    .populate('ticket', 'ticketNumber title');

  res.json({ activeTimer });
};

export const getTimeStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { startDate, endDate, userId, ticketId } = req.query;

  const query: any = {
    tenant: user.tenant._id,
  };

  if (startDate || endDate) {
    query.startTime = {};
    if (startDate) query.startTime.$gte = new Date(startDate as string);
    if (endDate) query.startTime.$lte = new Date(endDate as string);
  }

  if (userId) query.user = userId;
  if (ticketId) query.ticket = ticketId;

  const entries = await TimeEntry.find(query)
    .populate('user', 'name')
    .populate('ticket', 'ticketNumber title');

  const totalDuration = entries.reduce((acc, e) => acc + (e.duration || 0), 0);
  const billableDuration = entries
    .filter((e) => e.isBillable)
    .reduce((acc, e) => acc + (e.duration || 0), 0);

  const byUser: Record<string, { name: string; duration: number; entries: number }> = {};
  entries.forEach((e) => {
    const userId = e.user._id.toString();
    if (!byUser[userId]) {
      byUser[userId] = { name: (e.user as any).name, duration: 0, entries: 0 };
    }
    byUser[userId].duration += e.duration || 0;
    byUser[userId].entries += 1;
  });

  const byTicket: Record<string, { ticketNumber: string; title: string; duration: number; entries: number }> = {};
  entries.forEach((e) => {
    const ticketId = e.ticket._id.toString();
    if (!byTicket[ticketId]) {
      byTicket[ticketId] = {
        ticketNumber: (e.ticket as any).ticketNumber,
        title: (e.ticket as any).title,
        duration: 0,
        entries: 0,
      };
    }
    byTicket[ticketId].duration += e.duration || 0;
    byTicket[ticketId].entries += 1;
  });

  res.json({
    stats: {
      totalDuration,
      billableDuration,
      nonBillableDuration: totalDuration - billableDuration,
      totalEntries: entries.length,
    },
    byUser: Object.entries(byUser).map(([id, data]) => ({
      userId: id,
      ...data,
    })),
    byTicket: Object.entries(byTicket).map(([id, data]) => ({
      ticketId: id,
      ...data,
    })),
  });
};
