import { api } from '@/config/api';

export type AuditLogRow = {
  id: string;
  action: string;
  user?: { name?: string; email?: string; _id?: string };
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
};

export const auditApi = {
  list: (params: any) =>
    api.get<{ logs: AuditLogRow[]; total: number; pages: number }>('/audit', { params }),

  exportCsv: (params: any) =>
    api.get('/audit/export', { params, responseType: 'blob' }),
};
