import { api } from '@/config/api';

export interface ArticleListItem {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  tags?: string[];
  views?: number;
  helpful?: { yes: number; no: number };
  isPublished?: boolean;
  createdAt: string;
  updatedAt?: string;
  category?: { _id: string; name: string; color: string };
  author?: { _id: string; name: string };
}

export interface ArticleDetail extends ArticleListItem {
  content: string;
  seo?: { metaTitle?: string; metaDescription?: string };
}

export const articlesApi = {
  listAdmin: (params?: { page?: number; limit?: number; status?: string; category?: string; search?: string }) =>
    api.get<{ articles: ArticleListItem[]; pagination: any }>('/articles', { params }),

  listPublic: (params?: { category?: string; search?: string }) =>
    api.get<{ articles: ArticleListItem[] }>('/articles/public', { params }),

  getBySlug: (slug: string) => api.get<{ article: ArticleDetail }>(`/articles/${slug}`),

  create: (data: { title: string; content: string; excerpt?: string; category?: string; tags?: string[]; isPublished?: boolean }) =>
    api.post('/articles', data),

  update: (id: string, data: Record<string, any>) => api.put(`/articles/${id}`, data),

  remove: (id: string) => api.delete(`/articles/${id}`),

  vote: (id: string, helpful: boolean) => api.post(`/articles/${id}/vote`, { helpful }),
};
