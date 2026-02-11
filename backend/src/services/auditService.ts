import { Request } from 'express';
import { AuditLog, AuditAction, IUser } from '../models/index.js';

interface AuditContext {
  user: IUser;
  ip?: string;
  userAgent?: string;
}

export class AuditService {
  async log(
    action: AuditAction,
    resource: string,
    resourceId: string,
    details: Record<string, any>,
    context: AuditContext
  ): Promise<void> {
    try {
      await AuditLog.create({
        action,
        user: context.user._id,
        tenant: context.user.tenant,
        resource,
        resourceId,
        details: new Map(Object.entries(details)),
        ip: context.ip,
        userAgent: context.userAgent,
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  async getLogs(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      action?: AuditAction;
      userId?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ logs: any[]; total: number; pages: number }> {
    const {
      page = 1,
      limit = 50,
      action,
      userId,
      resource,
      startDate,
      endDate,
    } = options;

    const query: any = { tenant: tenantId };

    if (action) query.action = action;
    if (userId) query.user = userId;
    if (resource) query.resource = resource;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log._id,
        action: log.action,
        user: log.user,
        resource: log.resource,
        resourceId: log.resourceId,
        details: Object.fromEntries(log.details || {}),
        ip: log.ip,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      total,
      pages: Math.ceil(total / limit),
    };
  }
}

export const auditService = new AuditService();
