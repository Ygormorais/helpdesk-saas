import { api } from '@/config/api';

export type Macro = {
  _id: string;
  name: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const macrosApi = {
  list: (params?: { active?: boolean; search?: string }) =>
    api.get<{ macros: Macro[]; usage?: { current: number; max: number } }>('/macros', { params }),

  create: (data: { name: string; content: string; isActive?: boolean }) =>
    api.post<{ macro: Macro }>('/macros', data),

  update: (id: string, data: Partial<{ name: string; content: string; isActive: boolean }>) =>
    api.put<{ macro: Macro }>(`/macros/${id}`, data),

  remove: (id: string) => api.delete(`/macros/${id}`),
};
