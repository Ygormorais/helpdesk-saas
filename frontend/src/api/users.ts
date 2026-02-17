import { api } from '@/config/api';

export type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'agent' | 'client';
  avatar?: string;
  isActive: boolean;
};

export const usersApi = {
  listStaff: () =>
    api.get<{ users: UserListItem[] }>('/users', {
      params: { staffOnly: true, excludeSelf: true },
    }),
};
