import { Response } from 'express';
import { Ticket, User, Comment } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { z } from 'zod';

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
  const daysRaw = parseInt(req.query.days as string, 10) || 30;
  const days = Math.min(365, Math.max(1, daysRaw));

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
  const limitRaw = parseInt(req.query.limit as string, 10) || 10;
  const limit = Math.min(50, Math.max(1, limitRaw));

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

const reportsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
  agentLimit: z.coerce.number().int().min(1).max(50).optional(),
});

function toUtcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseDay(value: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  return toUtcDayStart(d);
}

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const tenantId = user.tenant._id;

  const parsed = reportsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid query', errors: parsed.error.errors });
    return;
  }

  const { startDate, endDate, days, agentLimit } = parsed.data;

  const now = new Date();
  const defaultDays = days ?? 30;

  let start: Date;
  let end: Date;
  try {
    start = startDate
      ? parseDay(startDate)
      : toUtcDayStart(new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000));
    end = endDate ? parseDay(endDate) : toUtcDayStart(now);
  } catch {
    res.status(400).json({ message: 'Invalid date (use YYYY-MM-DD)' });
    return;
  }

  if (end.getTime() < start.getTime()) {
    res.status(400).json({ message: 'endDate must be >= startDate' });
    return;
  }

  // end is inclusive day; use [start, endExclusive)
  const endExclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000);

  const [createdByDay, resolvedByDay] = await Promise.all([
    Ticket.aggregate([
      { $match: { tenant: tenantId, createdAt: { $gte: start, $lt: endExclusive } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
          },
          created: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Ticket.aggregate([
      {
        $match: {
          tenant: tenantId,
          'sla.resolvedAt': { $ne: null, $gte: start, $lt: endExclusive },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$sla.resolvedAt', timezone: 'UTC' },
          },
          resolved: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const trendMap = new Map<string, { date: string; created: number; resolved: number }>();
  for (const row of createdByDay) {
    trendMap.set(row._id, { date: row._id, created: row.created ?? 0, resolved: 0 });
  }
  for (const row of resolvedByDay) {
    const prev = trendMap.get(row._id) ?? { date: row._id, created: 0, resolved: 0 };
    trendMap.set(row._id, { ...prev, resolved: row.resolved ?? 0 });
  }
  const trend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const statusAgg = await Ticket.aggregate([
    { $match: { tenant: tenantId, createdAt: { $gte: start, $lt: endExclusive } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const status: Record<string, number> = {
    open: 0,
    in_progress: 0,
    waiting_customer: 0,
    resolved: 0,
    closed: 0,
  };
  for (const s of statusAgg) status[String(s._id)] = s.count;

  const slaAgg = await Ticket.aggregate([
    {
      $match: {
        tenant: tenantId,
        'sla.resolvedAt': { $ne: null, $gte: start, $lt: endExclusive },
      },
    },
    {
      $group: {
        _id: null,
        totalResolved: { $sum: 1 },
        withinSla: {
          $sum: {
            $cond: [{ $lte: ['$sla.resolvedAt', '$sla.resolutionDue'] }, 1, 0],
          },
        },
      },
    },
  ]);

  const slaRow = slaAgg[0] || { totalResolved: 0, withinSla: 0 };
  const outsideSla = Math.max(0, slaRow.totalResolved - slaRow.withinSla);

  const agentsAgg = await Ticket.aggregate([
    {
      $match: {
        tenant: tenantId,
        assignedTo: { $ne: null },
        'sla.resolvedAt': { $ne: null, $gte: start, $lt: endExclusive },
      },
    },
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
        resolved: { $sum: 1 },
        avgResolutionMs: { $avg: { $subtract: ['$sla.resolvedAt', '$createdAt'] } },
      },
    },
    { $sort: { resolved: -1 } },
    { $limit: agentLimit ?? 5 },
  ]);

  res.json({
    data: {
      range: {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      },
      trend,
      status,
      sla: {
        totalResolved: slaRow.totalResolved,
        withinSla: slaRow.withinSla,
        outsideSla,
        withinRate: slaRow.totalResolved > 0 ? Math.round((slaRow.withinSla / slaRow.totalResolved) * 100) : 0,
      },
      agents: agentsAgg,
    },
  });
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
