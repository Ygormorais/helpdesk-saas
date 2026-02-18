import { useQuery } from '@tanstack/react-query';
import { api } from '@/config/api';

type Health = {
  status?: string;
  ready?: boolean;
  deps?: {
    mongo?: { connected?: boolean; ping?: boolean };
    redis?: { configured?: boolean; ok?: boolean };
  };
};

export function useBackendHealth() {
  return useQuery({
    queryKey: ['backend-health'],
    queryFn: async () => {
      const res = await api.get('/health');
      return { ok: true, status: res.status, data: (res.data || {}) as Health };
    },
    refetchInterval: 30000,
    retry: 0,
  });
}
