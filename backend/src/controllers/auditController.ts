import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { auditService } from '../services/auditService.js';
import { AuditAction } from '../models/index.js';
import { z } from 'zod';
import { planService } from '../services/planService.js';

const querySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(50),
  action: z.nativeEnum(AuditAction).optional(),
  userId: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  endDate: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
});

export const getAuditLogs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const query = querySchema.parse(req.query);
    const user = req.user!;

    if (!['admin', 'manager'].includes(user.role)) {
      res.status(403).json({ message: 'Permissoes insuficientes' });
      return;
    }

    const auditDays = await planService.getAuditRetentionDays(user.tenant._id.toString());
    const cutoff = new Date(Date.now() - auditDays * 24 * 60 * 60 * 1000);
    const startDate = query.startDate && query.startDate > cutoff ? query.startDate : cutoff;

    const result = await auditService.getLogs(user.tenant._id.toString(), {
      ...query,
      startDate,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Parametros de consulta invalidos', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const exportAuditLogsCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = querySchema.parse(req.query);
    const user = req.user!;

    if (!['admin', 'manager'].includes(user.role)) {
      res.status(403).json({ message: 'Permissoes insuficientes' });
      return;
    }

    const has = await planService.checkFeatureAccess(user.tenant._id.toString(), 'auditExport');
    if (!has) {
      res.status(403).json({ message: 'Export de auditoria disponivel apenas em planos superiores. Faça upgrade para liberar.' });
      return;
    }

    const auditDays = await planService.getAuditRetentionDays(user.tenant._id.toString());
    const cutoff = new Date(Date.now() - auditDays * 24 * 60 * 60 * 1000);
    const startDate = query.startDate && query.startDate > cutoff ? query.startDate : cutoff;

    const result = await auditService.getLogs(user.tenant._id.toString(), {
      ...query,
      startDate,
      page: 1,
      limit: Math.min(5000, query.limit || 50),
    } as any);

    const rows = (result.logs || []) as any[];

    const header = ['createdAt', 'action', 'resourceType', 'resourceId', 'userId', 'userEmail', 'ip', 'userAgent', 'details'];
    const escape = (v: any) => {
      const s = String(v ?? '');
      const safe = s.replace(/"/g, '""');
      return `"${safe}"`;
    };

    const lines = [header.join(',')];
    for (const l of rows) {
      lines.push([
        escape(l.createdAt || ''),
        escape(l.action || ''),
        escape(l.resourceType || ''),
        escape(l.resourceId || ''),
        escape(l.user?._id || l.userId || ''),
        escape(l.user?.email || ''),
        escape(l.ip || ''),
        escape(l.userAgent || ''),
        escape(JSON.stringify(l.details || {})),
      ].join(','));
    }

    const csv = `${lines.join('\n')}\n`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send(csv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Parametros de consulta invalidos', errors: error.errors });
      return;
    }
    throw error;
  }
};
