import { Response } from 'express';
import { Ticket, TicketStatus, Comment, CommentType } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

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
    const ticketNumber = `${tenant.settings.ticketPrefix}-${String(ticketCount + 1).padStart(5, '0')}`;

    const now = new Date();
    const slaResponseTime = new Date(now.getTime() + tenant.settings.slaResponseTime * 60 * 60 * 1000);
    const slaResolutionTime = new Date(now.getTime() + tenant.settings.slaResolutionTime * 60 * 60 * 1000);

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
    page = 1,
    limit = 20,
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

  if (updates.assignedTo) {
    updates.assignedTo = updates.assignedTo;
  }

  Object.assign(ticket, updates);
  await ticket.save();

  await ticket.populate('createdBy', 'name email avatar');
  await ticket.populate('category', 'name color');
  await ticket.populate('assignedTo', 'name email avatar');

  res.json({ message: 'Ticket updated successfully', ticket });
};

export const addComment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { content, isInternal } = addCommentSchema.parse(req.body);

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
    ticket.sla.firstResponseAt = new Date();
  }

  if (user.role === 'client' && ticket.status === TicketStatus.IN_PROGRESS) {
    ticket.status = TicketStatus.WAITING_CUSTOMER;
  }

  if (user.role !== 'client' && ticket.status === TicketStatus.WAITING_CUSTOMER) {
    ticket.status = TicketStatus.IN_PROGRESS;
  }

  await ticket.save();

  await comment.populate('author', 'name email avatar');

  res.status(201).json({ message: 'Comment added', comment });
};
