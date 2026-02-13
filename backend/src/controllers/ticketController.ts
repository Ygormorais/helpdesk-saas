import { Response } from 'express';
import { Ticket, TicketStatus, Comment, CommentType, User } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { z } from 'zod';
import { notificationService } from '../services/notificationService.js';
import { addBusinessMs, businessMsBetween, type BusinessCalendar } from '../utils/businessTime.js';

const hoursToMs = (hours: number): number => Math.round(hours * 60 * 60 * 1000);
const addMs = (date: Date, ms: number): Date => new Date(date.getTime() + ms);

function getCalendarFromTenant(tenant: any): BusinessCalendar {
  return {
    timezone: tenant.settings?.timezone || 'America/Sao_Paulo',
    workDays: [1, 2, 3, 4, 5],
    start: tenant.settings?.workingHours?.start || '09:00',
    end: tenant.settings?.workingHours?.end || '18:00',
  };
}

function pauseTicketClocks(ticket: any, now: Date) {
  if (!ticket.sla.pausedAt) {
    ticket.sla.pausedAt = now;
  }

  if (ticket.ola?.ownedAt && !ticket.ola.pausedAt) {
    ticket.ola.pausedAt = now;
  }
}

function resumeTicketClocks(ticket: any, now: Date) {
  if (ticket.sla.pausedAt) {
    // NOTE: business-time delta is applied in updateTicket/addComment (needs tenant calendar)
    ticket.sla.pausedAt = undefined;
  }

  if (ticket.ola?.pausedAt) {
    // NOTE: business-time delta is applied in updateTicket/addComment (needs tenant calendar)
    ticket.ola.pausedAt = undefined;
  }
}

const createTicketSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  category: z.string(),
});

const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional(),
});

const addCommentSchema = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().optional(),
});

export const createTicket = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, description, priority, category } = createTicketSchema.parse(req.body);
    const user = req.user!;

    const ticketCount = await Ticket.countDocuments({
      tenant: user.tenant._id,
    });

    const tenant = user.tenant as any;
    const calendar = getCalendarFromTenant(tenant);
    const ticketNumber = `${tenant.settings.ticketPrefix}-${String(ticketCount + 1).padStart(5, '0')}`;

    const now = new Date();
    const responseMs = hoursToMs(Number(tenant.settings.slaResponseTime || 4));
    const resolutionMs = hoursToMs(Number(tenant.settings.slaResolutionTime || 24));
    const slaResponseTime = addBusinessMs(now, responseMs, calendar);
    const slaResolutionTime = addBusinessMs(now, resolutionMs, calendar);

    const ticket = await Ticket.create({
      ticketNumber,
      title,
      description,
      priority: priority || 'medium',
      category,
      tenant: user.tenant._id,
      createdBy: user._id,
      sla: {
        responseDue: slaResponseTime,
        resolutionDue: slaResolutionTime,
        pausedMs: 0,
      },
      metadata: {
        source: 'portal',
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    await ticket.populate('createdBy', 'name email');
    await ticket.populate('category', 'name color');
    await ticket.populate('assignedTo', 'name email');

    // Enviar notificação de ticket criado
    await notificationService.notifyTicketCreated(ticket, user);

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const getTickets = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const {
    page = '1',
    limit = '20',
    status,
    priority,
    category,
    assignedTo,
    search,
  } = req.query as Record<string, string>;

  const query: Record<string, any> = { tenant: user.tenant._id };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (category) query.category = category;
  if (assignedTo) query.assignedTo = assignedTo;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { ticketNumber: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('createdBy', 'name email avatar')
      .populate('category', 'name color')
      .populate('assignedTo', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Ticket.countDocuments(query),
  ]);

  res.json({
    tickets,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
};

export const getTicketById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const ticket = await Ticket.findOne({
    _id: id,
    tenant: user.tenant._id,
  })
    .populate('createdBy', 'name email avatar')
    .populate('category', 'name color')
    .populate('assignedTo', 'name email avatar');

  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  const comments = await Comment.find({ ticket: ticket._id })
    .populate('author', 'name email avatar')
    .sort({ createdAt: -1 });

  res.json({ ticket, comments });
};

export const updateTicket = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const updates = updateTicketSchema.parse(req.body);

  const ticket = await Ticket.findOne({
    _id: id,
    tenant: user.tenant._id,
  });

  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  const tenant = user.tenant as any;
  const calendar = getCalendarFromTenant(tenant);
  const now = new Date();
  const oldStatus = ticket.status;
  const oldAssignedTo = ticket.assignedTo ? ticket.assignedTo.toString() : null;

  let newAssignee: any = null;
  if (updates.assignedTo && updates.assignedTo !== oldAssignedTo) {
    newAssignee = await User.findOne({ _id: updates.assignedTo, tenant: user.tenant._id }).select('name role');
    if (!newAssignee) {
      throw new AppError('Assigned user not found', 400);
    }
    if (!['admin', 'manager', 'agent'].includes(newAssignee.role)) {
      throw new AppError('Assigned user must be staff', 400);
    }

    // GLPI-like: taking ownership moves ticket to in_progress
    if (!updates.status && ticket.status === TicketStatus.OPEN) {
      (updates as any).status = TicketStatus.IN_PROGRESS;
    }
  }
  
  Object.assign(ticket, updates);

  // OLA: initialize on first assignment ("owned")
  if (updates.assignedTo && updates.assignedTo !== oldAssignedTo) {
    if (!ticket.ola) ticket.ola = { pausedMs: 0 };

    if (!ticket.ola.ownedAt) {
      const ownHours = tenant.settings?.olaOwnTime ?? tenant.settings?.slaResponseTime ?? 4;
      const resolutionHours = tenant.settings?.olaResolutionTime ?? tenant.settings?.slaResolutionTime ?? 24;

      ticket.ola.ownedAt = now;
      ticket.ola.ownDue = addBusinessMs(now, hoursToMs(Number(ownHours)), calendar);
      ticket.ola.resolutionDue = addBusinessMs(now, hoursToMs(Number(resolutionHours)), calendar);
    }
  }

  // Pause/resume clocks based on GLPI-like behavior
  const newStatus = (updates.status || ticket.status) as TicketStatus;
  if (newStatus === TicketStatus.WAITING_CUSTOMER && oldStatus !== TicketStatus.WAITING_CUSTOMER) {
    pauseTicketClocks(ticket, now);
  }
  if (oldStatus === TicketStatus.WAITING_CUSTOMER && newStatus !== TicketStatus.WAITING_CUSTOMER) {
    // Extend due dates by paused business-time (freezes clocks)
    const pausedAt = ticket.sla.pausedAt ? new Date(ticket.sla.pausedAt) : null;
    if (pausedAt) {
      const delta = businessMsBetween(pausedAt, now, calendar);
      if (delta > 0) {
        ticket.sla.pausedMs = (ticket.sla.pausedMs || 0) + delta;
        ticket.sla.responseDue = addMs(new Date(ticket.sla.responseDue), delta);
        ticket.sla.resolutionDue = addMs(new Date(ticket.sla.resolutionDue), delta);
      }
    }

    const olaPausedAt = ticket.ola?.pausedAt ? new Date(ticket.ola.pausedAt) : null;
    if (ticket.ola && olaPausedAt) {
      const delta = businessMsBetween(olaPausedAt, now, calendar);
      if (delta > 0) {
        ticket.ola.pausedMs = (ticket.ola.pausedMs || 0) + delta;
        if (ticket.ola.ownDue) ticket.ola.ownDue = addMs(new Date(ticket.ola.ownDue), delta);
        if (ticket.ola.resolutionDue) ticket.ola.resolutionDue = addMs(new Date(ticket.ola.resolutionDue), delta);
      }
    }

    resumeTicketClocks(ticket, now);
  }

  if ((newStatus === TicketStatus.RESOLVED || newStatus === TicketStatus.CLOSED) && !ticket.sla.resolvedAt) {
    ticket.sla.resolvedAt = now;
  }
  if ((newStatus === TicketStatus.RESOLVED || newStatus === TicketStatus.CLOSED) && ticket.ola?.ownedAt && !ticket.ola.resolvedAt) {
    ticket.ola.resolvedAt = now;
  }

  await ticket.save();

  await ticket.populate('createdBy', 'name email avatar');
  await ticket.populate('category', 'name color');
  await ticket.populate('assignedTo', 'name email avatar');

  // Enviar notificação de ticket atualizado
  await notificationService.notifyTicketUpdated(ticket, user, oldStatus);

  // Se foi atribuído a alguém, enviar notificação específica
  if (updates.assignedTo && updates.assignedTo !== user._id.toString()) {
    const assignedUserName = newAssignee?.name;
    if (assignedUserName) {
      await notificationService.notifyTicketAssigned(
        ticket.tenant.toString(),
        ticket._id.toString(),
        ticket.title,
        assignedUserName,
        user.name
      );
    }
  }

  // Se foi resolvido, enviar notificação específica
  if (updates.status === 'resolved' && oldStatus !== 'resolved') {
    await notificationService.notifyTicketResolved(ticket, user);
  }

  res.json({ message: 'Ticket updated successfully', ticket });
};

export const addComment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { content, isInternal } = addCommentSchema.parse(req.body);

  const now = new Date();

  const ticket = await Ticket.findOne({
    _id: id,
    tenant: user.tenant._id,
  });

  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
    throw new AppError('Cannot add comment to resolved/closed ticket', 400);
  }

  const comment = await Comment.create({
    ticket: ticket._id,
    tenant: user.tenant._id,
    author: user._id,
    content,
    type: CommentType.REPLY,
    isInternal: isInternal || false,
  });

  if (!ticket.sla.firstResponseAt && user.role !== 'client') {
    ticket.sla.firstResponseAt = now;
  }

  if (user.role === 'client' && ticket.status === TicketStatus.IN_PROGRESS) {
    ticket.status = TicketStatus.WAITING_CUSTOMER;
    pauseTicketClocks(ticket, now);
  }

  if (user.role !== 'client' && ticket.status === TicketStatus.WAITING_CUSTOMER) {
    ticket.status = TicketStatus.IN_PROGRESS;

    const tenant = user.tenant as any;
    const calendar = getCalendarFromTenant(tenant);

    const pausedAt = ticket.sla.pausedAt ? new Date(ticket.sla.pausedAt) : null;
    if (pausedAt) {
      const delta = businessMsBetween(pausedAt, now, calendar);
      if (delta > 0) {
        ticket.sla.pausedMs = (ticket.sla.pausedMs || 0) + delta;
        ticket.sla.responseDue = addMs(new Date(ticket.sla.responseDue), delta);
        ticket.sla.resolutionDue = addMs(new Date(ticket.sla.resolutionDue), delta);
      }
    }

    const olaPausedAt = ticket.ola?.pausedAt ? new Date(ticket.ola.pausedAt) : null;
    if (ticket.ola && olaPausedAt) {
      const delta = businessMsBetween(olaPausedAt, now, calendar);
      if (delta > 0) {
        ticket.ola.pausedMs = (ticket.ola.pausedMs || 0) + delta;
        if (ticket.ola.ownDue) ticket.ola.ownDue = addMs(new Date(ticket.ola.ownDue), delta);
        if (ticket.ola.resolutionDue) ticket.ola.resolutionDue = addMs(new Date(ticket.ola.resolutionDue), delta);
      }
    }

    resumeTicketClocks(ticket, now);
  }

  await ticket.save();

  await comment.populate('author', 'name email avatar');

  // Enviar notificação de novo comentário
  await notificationService.notifyNewComment(ticket, comment, user);

  res.status(201).json({ message: 'Comment added', comment });
};
