import { useQuery } from '@tanstack/react-query';

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
      const res = await fetch('/health', { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as Health;
      return { ok: res.ok, status: res.status, data };
    },
    refetchInterval: 30000,
    retry: 0,
  });
}
