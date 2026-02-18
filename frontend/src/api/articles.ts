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

  searchAi: (params: { q: string; category?: string; limit?: number }) =>
    api.get<{ mode: 'ai' | 'fallback'; results: Array<ArticleListItem & { score: number }> }>('/articles/search', { params }),

  getBySlug: (slug: string) => api.get<{ article: ArticleDetail }>(`/articles/${slug}`),

  related: (slug: string, params?: { limit?: number }) =>
    api.get<{ articles: ArticleListItem[] }>(`/articles/${slug}/related`, { params }),

  byTicket: (ticketId: string) =>
    api.get<{ articles: ArticleListItem[] }>(`/articles/by-ticket/${ticketId}`),

  create: (data: { title: string; content: string; excerpt?: string; category?: string; tags?: string[]; isPublished?: boolean }) =>
    api.post('/articles', data),

  update: (id: string, data: Record<string, any>) => api.put(`/articles/${id}`, data),

  remove: (id: string) => api.delete(`/articles/${id}`),

  vote: (id: string, helpful: boolean) => api.post(`/articles/${id}/vote`, { helpful }),

  feedback: (id: string, data: { helpful: boolean; comment?: string }) =>
    api.post(`/articles/${id}/feedback`, data),

  listFeedback: (id: string, params?: { page?: number; limit?: number; commentOnly?: boolean; helpful?: boolean }) =>
    api.get<{ feedback: Array<{ id: string; helpful: boolean; comment?: string; createdAt: string; user?: any }>; stats: any; pagination: any }>(
      `/articles/${id}/feedback`,
      { params }
    ),

  linkTicket: (articleId: string, ticketId: string) =>
    api.post(`/articles/${articleId}/related-tickets`, { ticketId }),

  unlinkTicket: (articleId: string, ticketId: string) =>
    api.delete(`/articles/${articleId}/related-tickets/${ticketId}`),
};
