import { api } from '@/config/api';

export interface WebhookDto {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  failureCount: number;
  lastTriggeredAt?: string;
  lastFailedAt?: string;
  createdAt?: string;
}

export const webhooksApi = {
  list: () => api.get<{ webhooks: WebhookDto[] }>('/webhooks'),
  create: (data: { name: string; url: string; events: string[]; headers?: Record<string, string> }) =>
    api.post('/webhooks', data),
  update: (id: string, data: Record<string, any>) => api.put(`/webhooks/${id}`, data),
  remove: (id: string) => api.delete(`/webhooks/${id}`),
  test: (id: string) => api.post(`/webhooks/${id}/test`),
};
