import { api } from '@/config/api';

export type ReportSchedule = {
  _id: string;
  name: string;
  isActive: boolean;
  frequency: 'daily' | 'weekly';
  hour: number;
  dayOfWeek?: number;
  recipients: string[];
  params?: { days?: number; startDate?: string; endDate?: string };
  nextRunAt: string;
  lastRunAt?: string;
  lastError?: string;
};

export const reportSchedulesApi = {
  list: () => api.get<{ schedules: ReportSchedule[] }>('/report-schedules'),
  create: (data: any) => api.post('/report-schedules', data),
  update: (id: string, data: any) => api.put(`/report-schedules/${id}`, data),
  remove: (id: string) => api.delete(`/report-schedules/${id}`),
};
