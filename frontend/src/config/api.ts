import axios from 'axios';
import React from 'react';
import { toast } from '@/hooks/use-toast';
import { ToastAction, type ToastActionElement } from '@/components/ui/toast';

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

    if (error.response?.status === 403) {
      const msg = String(error.response?.data?.message || 'Acesso negado');
      const looksLikePlanGate = /upgrade|plano|limite|dispon[ií]vel apenas/i.test(msg);
      if (!looksLikePlanGate) {
        return Promise.reject(error);
      }
      const now = Date.now();
      (window as any).__lastForbiddenToastAt = (window as any).__lastForbiddenToastAt || 0;
      const last = Number((window as any).__lastForbiddenToastAt) || 0;
      if (now - last > 2500) {
        (window as any).__lastForbiddenToastAt = now;
        const isOnPlans = window.location.pathname.startsWith('/plans');
        toast({
          title: 'Funcionalidade bloqueada',
          description: msg,
          variant: 'destructive',
          action: isOnPlans
            ? undefined
            : (React.createElement(
                ToastAction,
                {
                  altText: 'Ver planos',
                  onClick: () => {
                    window.location.href = '/plans';
                  },
                },
                'Ver planos'
              ) as unknown as ToastActionElement),
        });
      }
    }
    return Promise.reject(error);
  }
);
