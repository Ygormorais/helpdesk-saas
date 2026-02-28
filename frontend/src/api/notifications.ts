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
  list: (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    archivedOnly?: boolean;
    q?: string;
    type?: string;
  }) =>
    api.get<{ notifications: NotificationDto[]; pagination: any; unreadTotal?: number }>('/notifications', { params }),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markUnread: (id: string) => api.post(`/notifications/${id}/unread`),
  markManyRead: (ids: string[]) => api.post('/notifications/read', { ids }),
  markManyUnread: (ids: string[]) => api.post('/notifications/unread', { ids }),
  markAllRead: () => api.post('/notifications/read-all'),
  clearMine: () =>
    api.delete<{ success: boolean; modifiedCount?: number; archivedIds?: string[]; truncated?: boolean }>(
      '/notifications'
    ),
  archive: (ids: string[]) => api.post('/notifications/archive', { ids }),
  unarchive: (ids: string[]) => api.post('/notifications/unarchive', { ids }),
  unarchiveAll: () => api.post('/notifications/unarchive-all'),
};
