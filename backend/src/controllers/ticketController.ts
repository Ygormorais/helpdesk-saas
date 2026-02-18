import { Response } from 'express';
import { Ticket, TicketStatus, Comment, CommentType, User, TicketCounter, AuditAction } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { z } from 'zod';
import { notificationService } from '../services/notificationService.js';
import { auditService } from '../services/auditService.js';
import { automationService } from '../services/automationService.js';
import { addBusinessMs, businessMsBetween, type BusinessCalendar } from '../utils/businessTime.js';
import { csvLine } from '../utils/csv.js';
import { once } from 'events';

const hoursToMs = (hours: number): number => Math.round(hours * 60 * 60 * 1000);
const addMs = (date: Date, ms: number): Date => new Date(date.getTime() + ms);
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const exportTicketsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  category: z.string().optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50_000).optional(),
});

function parseDayStrict(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) throw new Error('Data invalida');

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);

  const d = new Date(Date.UTC(y, mo - 1, da));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== da) {
    throw new Error('Data invalida');
  }
  return d;
}

export const createTicket = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, description, priority, category } = createTicketSchema.parse(req.body);
    const user = req.user!;

    const tenant = user.tenant as any;
    const calendar = getCalendarFromTenant(tenant);

    const counter = await TicketCounter.findOneAndUpdate(
      { tenant: user.tenant._id },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );

    const prefix = tenant.settings?.ticketPrefix || 'TCK';
    const ticketNumber = `${prefix}-${String(counter.seq).padStart(5, '0')}`;

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

    // Apply paid automation rules (best-effort)
    await automationService.applyTicketCreated({
      tenantId: user.tenant._id.toString(),
      ticketId: ticket._id.toString(),
      actorUserId: user._id.toString(),
    });

    await ticket.populate('createdBy', 'name email');
    await ticket.populate('category', 'name color');
    await ticket.populate('assignedTo', 'name email');

    // Enviar notificação de ticket criado
    await notificationService.notifyTicketCreated(ticket, user);

    await auditService.log(
      AuditAction.TICKET_CREATED,
      'ticket',
      ticket._id.toString(),
      {
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        priority: ticket.priority,
        categoryId: ticket.category?._id?.toString?.() || String(ticket.category || ''),
        createdById: user._id.toString(),
      },
      { user, ip: req.ip, userAgent: req.get('user-agent') }
    );

    res.status(201).json({
      message: 'Ticket criado com sucesso',
      ticket,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Erro de validacao', errors: error.errors });
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

  if (user.role === 'client') {
    query.createdBy = user._id;
  }

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (category) query.category = category;
  if (assignedTo) query.assignedTo = assignedTo;

  if (search) {
    const q = escapeRegex(search);
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { ticketNumber: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('createdBy', 'name email avatar')
      .populate('category', 'name color')
      .populate('assignedTo', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Ticket.countDocuments(query),
  ]);

  res.json({
    tickets,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
};

export const getTicketById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const ticketQuery: any = {
    _id: id,
    tenant: user.tenant._id,
  };
  if (user.role === 'client') {
    ticketQuery.createdBy = user._id;
  }

  const ticket = await Ticket.findOne(ticketQuery)
    .populate('createdBy', 'name email avatar')
    .populate('category', 'name color')
    .populate('assignedTo', 'name email avatar');

  if (!ticket) {
    throw new AppError('Ticket nao encontrado', 404);
  }

  const commentQuery: any = { ticket: ticket._id, tenant: user.tenant._id };
  if (user.role === 'client') {
    commentQuery.isInternal = { $ne: true };
  }

  const comments = await Comment.find(commentQuery)
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
    throw new AppError('Ticket nao encontrado', 404);
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
      throw new AppError('Usuario atribuido nao encontrado', 400);
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

  // Reopen: allow moving out of resolved/closed and clear resolved timestamps
  if (
    (oldStatus === TicketStatus.RESOLVED || oldStatus === TicketStatus.CLOSED) &&
    newStatus !== TicketStatus.RESOLVED &&
    newStatus !== TicketStatus.CLOSED
  ) {
    ticket.sla.resolvedAt = undefined;
    if (ticket.ola) {
      ticket.ola.resolvedAt = undefined;
    }
  }

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
        ticket.ticketNumber,
        String(updates.assignedTo),
        assignedUserName,
        user.name
      );
    }
  }

  // Se foi resolvido, enviar notificação específica
  if (updates.status === 'resolved' && oldStatus !== 'resolved') {
    await notificationService.notifyTicketResolved(ticket, user);
  }

  await auditService.log(
    AuditAction.TICKET_UPDATED,
    'ticket',
    ticket._id.toString(),
    {
      ticketNumber: ticket.ticketNumber,
      oldStatus,
      newStatus: ticket.status,
      oldAssignedTo,
      newAssignedTo: ticket.assignedTo ? ticket.assignedTo.toString() : null,
      updates,
    },
    { user, ip: req.ip, userAgent: req.get('user-agent') }
  );

  if (oldAssignedTo !== (ticket.assignedTo ? ticket.assignedTo.toString() : null) && ticket.assignedTo) {
    await auditService.log(
      AuditAction.TICKET_ASSIGNED,
      'ticket',
      ticket._id.toString(),
      {
        ticketNumber: ticket.ticketNumber,
        oldAssignedTo,
        newAssignedTo: ticket.assignedTo.toString(),
      },
      { user, ip: req.ip, userAgent: req.get('user-agent') }
    );
  }

  if (oldStatus !== ticket.status) {
    await auditService.log(
      AuditAction.TICKET_STATUS_CHANGED,
      'ticket',
      ticket._id.toString(),
      {
        ticketNumber: ticket.ticketNumber,
        oldStatus,
        newStatus: ticket.status,
      },
      { user, ip: req.ip, userAgent: req.get('user-agent') }
    );
  }

  if (updates.status === 'resolved' && oldStatus !== 'resolved') {
    await auditService.log(
      AuditAction.TICKET_RESOLVED,
      'ticket',
      ticket._id.toString(),
      {
        ticketNumber: ticket.ticketNumber,
        resolvedById: user._id.toString(),
      },
      { user, ip: req.ip, userAgent: req.get('user-agent') }
    );
  }

  res.json({ message: 'Ticket atualizado com sucesso', ticket });
};

export const reopenTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const query: any = { _id: id, tenant: user.tenant._id };
  if (user.role === 'client') {
    query.createdBy = user._id;
  }

  const ticket = await Ticket.findOne(query);
  if (!ticket) {
    throw new AppError('Ticket nao encontrado', 404);
  }

  if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
    throw new AppError('Ticket nao esta resolvido/fechado', 400);
  }

  const now = new Date();
  const oldStatus = ticket.status;

  ticket.status = TicketStatus.OPEN;
  ticket.sla.resolvedAt = undefined;
  if (ticket.ola) ticket.ola.resolvedAt = undefined;
  resumeTicketClocks(ticket, now);

  await ticket.save();
  await ticket.populate('createdBy', 'name email avatar');
  await ticket.populate('category', 'name color');
  await ticket.populate('assignedTo', 'name email avatar');

  await notificationService.notifyTicketUpdated(ticket, user, oldStatus);

  await auditService.log(
    AuditAction.TICKET_STATUS_CHANGED,
    'ticket',
    ticket._id.toString(),
    {
      ticketNumber: ticket.ticketNumber,
      oldStatus,
      newStatus: ticket.status,
      action: 'reopen',
    },
    { user, ip: req.ip, userAgent: req.get('user-agent') }
  );

  res.json({ message: 'Ticket reaberto', ticket });
};

export const addComment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { content, isInternal } = addCommentSchema.parse(req.body);

  if (user.role === 'client' && isInternal) {
    throw new AppError('Internal comments are not allowed', 403);
  }

  const now = new Date();

  const ticketQuery: any = { _id: id, tenant: user.tenant._id };
  if (user.role === 'client') {
    ticketQuery.createdBy = user._id;
  }
  const ticket = await Ticket.findOne(ticketQuery);

  if (!ticket) {
    throw new AppError('Ticket nao encontrado', 404);
  }

  if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
    throw new AppError('Nao e possivel adicionar comentario em ticket resolvido/fechado', 400);
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

  // Status flow on public comments:
  // - Staff replies (public): ticket waits for customer
  // - Customer replies while waiting: ticket goes back in progress
  if (user.role !== 'client' && !comment.isInternal) {
    if (ticket.status === TicketStatus.OPEN || ticket.status === TicketStatus.IN_PROGRESS) {
      ticket.status = TicketStatus.WAITING_CUSTOMER;
      pauseTicketClocks(ticket, now);
    }
  }

  if (user.role === 'client' && ticket.status === TicketStatus.WAITING_CUSTOMER) {
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

  await auditService.log(
    AuditAction.COMMENT_CREATED,
    'ticket',
    ticket._id.toString(),
    {
      ticketNumber: ticket.ticketNumber,
      commentId: comment._id.toString(),
      isInternal: comment.isInternal,
      authorId: user._id.toString(),
    },
    { user, ip: req.ip, userAgent: req.get('user-agent') }
  );

  res.status(201).json({ message: 'Comentario adicionado', comment });
};

export const exportTicketsCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const parsed = exportTicketsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: 'Consulta invalida', errors: parsed.error.errors });
    return;
  }

  const { startDate, endDate, status, priority, category, assignedTo, search, limit } = parsed.data;

  let start: Date | undefined;
  let endExclusive: Date | undefined;
  try {
    if (startDate) start = parseDayStrict(startDate);
    if (endDate) {
      const end = parseDayStrict(endDate);
      endExclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
  } catch {
    res.status(400).json({ message: 'Data invalida (use YYYY-MM-DD)' });
    return;
  }

  if (start && endExclusive && endExclusive.getTime() < start.getTime()) {
    res.status(400).json({ message: 'endDate deve ser maior ou igual a startDate' });
    return;
  }

  const query: Record<string, any> = { tenant: user.tenant._id };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (category) query.category = category;
  if (assignedTo) query.assignedTo = assignedTo;

  if (search) {
    const q = escapeRegex(search);
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { ticketNumber: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];
  }

  if (start || endExclusive) {
    query.createdAt = {
      ...(start ? { $gte: start } : null),
      ...(endExclusive ? { $lt: endExclusive } : null),
    };
  }

  // Clients can only export their own tickets.
  if (user.role === 'client') {
    query.createdBy = user._id;
  }

  const limitNum = limit ?? 5000;

  const filename = `tickets-${startDate || 'all'}_to_${endDate || 'all'}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200);
  (res as any).flushHeaders?.();

  // UTF-8 BOM helps Excel.
  res.write('\ufeff');

  const header = [
    'ticketNumber',
    'title',
    'status',
    'priority',
    'category',
    'createdBy',
    'assignedTo',
    'createdAt',
    'updatedAt',
    'firstResponseAt',
    'resolvedAt',
    'responseDue',
    'resolutionDue',
  ];

  res.write(csvLine(header));

  let written = 0;
  const cursor = Ticket.find(query)
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .populate('createdBy', 'name email')
    .populate('assignedTo', 'name email')
    .populate('category', 'name')
    .select('ticketNumber title status priority category createdBy assignedTo createdAt updatedAt sla')
    .lean()
    .cursor();

  const onClose = () => {
    try {
      cursor.close();
    } catch {
      // ignore
    }
  };

  req.on('close', onClose);

  try {
    for await (const t of cursor as any) {
      written += 1;
      const line = csvLine([
        t.ticketNumber,
        t.title,
        t.status,
        t.priority,
        t.category?.name || '',
        t.createdBy?.name || '',
        t.assignedTo?.name || '',
        t.createdAt ? new Date(t.createdAt).toISOString() : '',
        t.updatedAt ? new Date(t.updatedAt).toISOString() : '',
        t.sla?.firstResponseAt ? new Date(t.sla.firstResponseAt).toISOString() : '',
        t.sla?.resolvedAt ? new Date(t.sla.resolvedAt).toISOString() : '',
        t.sla?.responseDue ? new Date(t.sla.responseDue).toISOString() : '',
        t.sla?.resolutionDue ? new Date(t.sla.resolutionDue).toISOString() : '',
      ]);

      if (!res.write(line)) {
        await once(res as any, 'drain');
      }
    }
  } finally {
    req.off('close', onClose);
  }

  // If request was aborted, don't try to end response.
  if ((req as any).aborted) return;
  res.end();
};
