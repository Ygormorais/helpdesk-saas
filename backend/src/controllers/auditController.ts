import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { auditService, AuditAction } from '../services/auditService.js';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(50),
  action: z.string().optional(),
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
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    const result = await auditService.getLogs(user.tenant._id.toString(), query);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Invalid query parameters', errors: error.errors });
      return;
    }
    throw error;
  }
};
