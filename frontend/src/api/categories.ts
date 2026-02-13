import { api } from '@/config/api';

export const categoriesApi = {
  list: () => api.get('/categories'),
};
