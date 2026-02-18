import { api } from '@/config/api';

export interface TicketListParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  search?: string;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
}

export interface AddCommentInput {
  content: string;
  isInternal?: boolean;
}

export const ticketsApi = {
  list: (params: TicketListParams) => api.get('/tickets', { params }),
  getById: (id: string) => api.get(`/tickets/${id}`),
  create: (data: CreateTicketInput) => api.post('/tickets', data),
  addComment: (ticketId: string, data: AddCommentInput) => api.post(`/tickets/${ticketId}/comments`, data),
  update: (ticketId: string, data: Record<string, unknown>) => api.put(`/tickets/${ticketId}`, data),
  reopen: (ticketId: string) => api.post(`/tickets/${ticketId}/reopen`),
};
