import { api } from '@/config/api';

export type AutomationRule = {
  _id: string;
  name: string;
  isActive: boolean;
  trigger: 'ticket.created';
  conditions?: {
    category?: { _id: string; name: string } | string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
  actions: {
    assignTo?: { _id: string; name: string; email?: string } | string;
    setStatus?: 'open' | 'in_progress';
  };
  createdAt: string;
  updatedAt: string;
};

export const automationsApi = {
  list: () => api.get<{ rules: AutomationRule[]; usage?: { current: number; max: number } }>('/automations'),
  create: (data: any) => api.post('/automations', data),
  update: (id: string, data: any) => api.put(`/automations/${id}`, data),
  remove: (id: string) => api.delete(`/automations/${id}`),
};
