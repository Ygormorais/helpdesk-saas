import axios from 'axios';

const normalizeBaseUrl = (url: string) => {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '/api';
  if (trimmed === '/api') return '/api';

  // If an absolute backend URL is provided, default to its /api.
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  return trimmed;
};

const API_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '/api');

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
