import { Response } from 'express';
import { Ticket, User, Comment } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';

export const getDashboardStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const tenantId = user.tenant._id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalTickets,
    openTickets,
    inProgressTickets,
    resolvedTickets,
    ticketsThisMonth,
    totalAgents,
    avgResponseTime,
    satisfaction,
  ] = await Promise.all([
    Ticket.countDocuments({ tenant: tenantId }),
    Ticket.countDocuments({ tenant: tenantId, status: 'open' }),
    Ticket.countDocuments({ tenant: tenantId, status: 'in_progress' }),
    Ticket.countDocuments({ tenant: tenantId, status: 'resolved' }),
    Ticket.countDocuments({ tenant: tenantId, createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ tenant: tenantId, role: { $in: ['agent', 'manager', 'admin'] } }),
    getAverageResponseTime(tenantId),
    getSatisfactionScore(tenantId),
  ]);

  res.json({
    stats: {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      ticketsThisMonth,
      totalAgents,
      avgResponseTime,
      satisfaction,
    },
  });
};

export const getTicketsByStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const tenantId = user.tenant._id;

  const stats = await Ticket.aggregate([
    { $match: { tenant: tenantId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const data = {
    open: stats.find((s) => s._id === 'open')?.count || 0,
    in_progress: stats.find((s) => s._id === 'in_progress')?.count || 0,
    waiting_customer: stats.find((s) => s._id === 'waiting_customer')?.count || 0,
    resolved: stats.find((s) => s._id === 'resolved')?.count || 0,
    closed: stats.find((s) => s._id === 'closed')?.count || 0,
  };

  res.json({ data });
};

export const getTicketsByPriority = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const tenantId = user.tenant._id;

  const stats = await Ticket.aggregate([
    { $match: { tenant: tenantId } },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);

  const data = {
    urgent: stats.find((s) => s._id === 'urgent')?.count || 0,
    high: stats.find((s) => s._id === 'high')?.count || 0,
    medium: stats.find((s) => s._id === 'medium')?.count || 0,
    low: stats.find((s) => s._id === 'low')?.count || 0,
  };

  res.json({ data });
};

export const getTicketsByCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const tenantId = user.tenant._id;

  const stats = await Ticket.aggregate([
    { $match: { tenant: tenantId } },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryData',
      },
    },
    { $unwind: '$categoryData' },
    { $group: { _id: '$categoryData.name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  res.json({ data: stats });
};

export const getTicketsTrend = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const tenantId = user.tenant._id;
  const days = parseInt(req.query.days as string) || 30;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await Ticket.aggregate([
    {
      $match: {
        tenant: tenantId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        created: { $sum: 1 },
        resolved: {
          $sum: {
            $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ data: stats });
};

export const getTopAgents = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const tenantId = user.tenant._id;

  const stats = await Ticket.aggregate([
    { $match: { tenant: tenantId, assignedTo: { $ne: null } } },
    {
      $lookup: {
        from: 'users',
        localField: 'assignedTo',
        foreignField: '_id',
        as: 'agent',
      },
    },
    { $unwind: '$agent' },
    {
      $group: {
        _id: '$agent._id',
        name: { $first: '$agent.name' },
        total: { $sum: 1 },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
        },
        avgTime: {
          $avg: {
            $cond: [
              { $eq: ['$status', 'resolved'] },
              { $subtract: ['$sla.resolvedAt', '$createdAt'] },
              null,
            ],
          },
        },
      },
    },
    { $sort: { resolved: -1 } },
    { $limit: 5 },
  ]);

  res.json({ data: stats });
};

export const getSLACompliance = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const tenantId = user.tenant._id;

  const stats = await Ticket.aggregate([
    { $match: { tenant: tenantId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        responseMet: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$sla.firstResponseAt', null] },
                  { $lte: ['$sla.firstResponseAt', '$sla.responseDue'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        resolutionMet: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$sla.resolvedAt', null] },
                  { $lte: ['$sla.resolvedAt', '$sla.resolutionDue'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        breached: {
          $sum: {
            $cond: [
              {
                $or: [
                  {
                    $and: [
                      { $ne: ['$sla.firstResponseAt', null] },
                      { $gt: ['$sla.firstResponseAt', '$sla.responseDue'] },
                    ],
                  },
                  {
                    $and: [
                      { $ne: ['$sla.resolvedAt', null] },
                      { $gt: ['$sla.resolvedAt', '$sla.resolutionDue'] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const data = stats[0] || { total: 0, responseMet: 0, resolutionMet: 0, breached: 0 };

  res.json({
    data: {
      ...data,
      responseRate: data.total > 0 ? Math.round((data.responseMet / data.total) * 100) : 0,
      resolutionRate: data.total > 0 ? Math.round((data.resolutionMet / data.total) * 100) : 0,
      breachRate: data.total > 0 ? Math.round((data.breached / data.total) * 100) : 0,
    },
  });
};

export const getSatisfactionStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const tenantId = user.tenant._id;

  const stats = await Ticket.aggregate([
    { $match: { tenant: tenantId, 'satisfaction.rating': { $exists: true } } },
    {
      $group: {
        _id: '$satisfaction.rating',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  stats.forEach((s) => {
    distribution[s._id] = s.count;
  });

  const avgRating =
    stats.length > 0
      ? stats.reduce((acc, s) => acc + s._id * s.count, 0) /
        stats.reduce((acc, s) => acc + s.count, 0)
      : 0;

  res.json({
    data: {
      distribution,
      average: Math.round(avgRating * 10) / 10,
      totalResponses: stats.reduce((acc, s) => acc + s.count, 0),
    },
  });
};

export const getRecentActivity = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const tenantId = user.tenant._id;
  const limit = parseInt(req.query.limit as string) || 10;

  const [tickets, comments] = await Promise.all([
    Ticket.find({ tenant: tenantId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('createdBy', 'name')
      .select('ticketNumber title status priority updatedAt createdAt createdBy'),
    Comment.find({ tenant: tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('author', 'name')
      .select('content ticket createdAt author'),
  ]);

  const activity = [
    ...tickets.map((t) => ({
      type: 'ticket',
      action: t.createdAt?.getTime() === t.updatedAt?.getTime() ? 'created' : 'updated',
      ticket: t,
      timestamp: t.updatedAt,
    })),
    ...comments.map((c) => ({
      type: 'comment',
      ticket: c.ticket,
      author: c.author,
      timestamp: c.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  res.json({ data: activity });
};

async function getAverageResponseTime(tenantId: any): Promise<number> {
  const stats = await Ticket.aggregate([
    { $match: { tenant: tenantId, 'sla.firstResponseAt': { $exists: true } } },
    {
      $group: {
        _id: null,
        avgTime: { $avg: { $subtract: ['$sla.firstResponseAt', '$createdAt'] } },
      },
    },
  ]);

  const avgMs = stats[0]?.avgTime || 0;
  return Math.round(avgMs / (1000 * 60 * 60));
}

async function getSatisfactionScore(tenantId: any): Promise<number> {
  const stats = await Ticket.aggregate([
    { $match: { tenant: tenantId, 'satisfaction.rating': { $exists: true } } },
    {
      $group: {
        _id: null,
        avg: { $avg: '$satisfaction.rating' },
      },
    },
  ]);

  return Math.round((stats[0]?.avg || 0) * 10) / 10;
}
