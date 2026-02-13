import { api } from '@/config/api';

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  ticketId?: string;
  chatId?: string;
  createdBy?: string;
  createdAt: string;
  read: boolean;
}

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get<{ notifications: NotificationDto[]; pagination: any }>('/notifications', { params }),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  clearMine: () => api.delete('/notifications'),
};
