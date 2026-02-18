import { Response } from 'express';
import { Ticket } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { z } from 'zod';

const submitSurveySchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

const getSatisfactionStatsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.string().optional(),
  agentId: z.string().optional(),
});

export const submitSatisfactionSurvey = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data = submitSurveySchema.parse(req.body);
    const { ticketId } = req.params;
    const user = req.user!;

    const ticket = await Ticket.findOne({
      _id: ticketId,
      tenant: user.tenant._id,
      createdBy: user._id,
    });

    if (!ticket) {
      throw new AppError('Ticket nao encontrado', 404);
    }

    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      throw new AppError('Pesquisa so pode ser enviada para tickets resolvidos/fechados', 400);
    }

    if (ticket.satisfaction?.rating) {
      throw new AppError('Survey already submitted for this ticket', 400);
    }

    ticket.satisfaction = {
      rating: data.rating,
      comment: data.comment,
      createdAt: new Date(),
    };

    await ticket.save();

    res.json({
      message: 'Pesquisa enviada com sucesso',
      satisfaction: ticket.satisfaction,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Erro de validacao', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const getSatisfactionStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate, categoryId, agentId } = getSatisfactionStatsSchema.parse(req.query);
    const user = req.user!;

    const query: any = {
      tenant: user.tenant._id,
      'satisfaction.rating': { $exists: true },
    };

    if (startDate || endDate) {
      query['satisfaction.createdAt'] = {};
      if (startDate) query['satisfaction.createdAt'].$gte = new Date(startDate);
      if (endDate) query['satisfaction.createdAt'].$lte = new Date(endDate);
    }

    if (categoryId) query.category = categoryId;
    if (agentId) query.assignedTo = agentId;

    const tickets = await Ticket.find(query)
      .select('satisfaction category assignedTo createdAt');

    const totalResponses = tickets.length;
    const averageRating = totalResponses > 0
      ? tickets.reduce((acc, t) => acc + (t.satisfaction?.rating || 0), 0) / totalResponses
      : 0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    tickets.forEach((t) => {
      const rating = t.satisfaction?.rating;
      if (rating) distribution[rating]++;
    });

    const promoters = distribution[4] + distribution[5];
    const detractors = distribution[1] + distribution[2];
    const passives = distribution[3];
    const nps = totalResponses > 0
      ? Math.round(((promoters - detractors) / totalResponses) * 100)
      : 0;

    const satisfactionRate = totalResponses > 0
      ? Math.round(((promoters + passives) / totalResponses) * 100)
      : 0;

    const comments = tickets
      .filter((t) => t.satisfaction?.comment)
      .map((t) => ({
        rating: t.satisfaction?.rating,
        comment: t.satisfaction?.comment,
        createdAt: t.satisfaction?.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 10);

    res.json({
      stats: {
        totalResponses,
        averageRating: Math.round(averageRating * 10) / 10,
        distribution,
        promoters,
        detractors,
        passives,
        nps,
        satisfactionRate,
      },
      comments,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Parametros de consulta invalidos', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const getTicketSatisfaction = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { ticketId } = req.params;
  const user = req.user!;

  const ticket = await Ticket.findOne({
    _id: ticketId,
    tenant: user.tenant._id,
  }).select('satisfaction');

  if (!ticket) {
    throw new AppError('Ticket nao encontrado', 404);
  }

  res.json({ satisfaction: ticket.satisfaction });
};

export const getRecentSurveys = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { limit = 10 } = req.query;
  const user = req.user!;

  const tickets = await Ticket.find({
    tenant: user.tenant._id,
    'satisfaction.rating': { $exists: true },
  })
    .populate('createdBy', 'name email')
    .populate('category', 'name color')
    .sort({ 'satisfaction.createdAt': -1 })
    .limit(parseInt(limit as string));

  const surveys = tickets.map((ticket) => ({
    id: ticket._id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    rating: ticket.satisfaction?.rating,
    comment: ticket.satisfaction?.comment,
    customer: ticket.createdBy,
    category: ticket.category,
    createdAt: ticket.satisfaction?.createdAt,
  }));

  res.json({ surveys });
};
