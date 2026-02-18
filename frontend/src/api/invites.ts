import { api } from '@/config/api';

export type InviteDto = {
  _id: string;
  email: string;
  role: 'admin' | 'manager' | 'agent' | 'client';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token?: string;
  expiresAt: string;
  createdAt: string;
  invitedBy?: {
    _id: string;
    name?: string;
    email?: string;
  };
  tenant?: {
    _id: string;
    name?: string;
    slug?: string;
    logo?: string;
  };
};

export const invitesApi = {
  list: () => api.get<{ invites: InviteDto[] }>('/invites'),
  create: (data: { email: string; role: InviteDto['role'] }) =>
    api.post<{ message: string; invite: { id: string; email: string; role: string; expiresAt: string } }>('/invites', data),
  resend: (id: string) => api.post<{ message: string }>(`/invites/${id}/resend`),
  cancel: (id: string) => api.delete<{ message: string }>(`/invites/${id}`),
  accept: (token: string) => api.post<{ valid: boolean; invite: InviteDto }>('/invites/accept', { token }),
  pending: (email: string) => api.get<{ invites: InviteDto[] }>('/invites/pending', { params: { email } }),
};
