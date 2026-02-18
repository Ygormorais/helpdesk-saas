import { AlertTriangle, Server } from 'lucide-react';
import { useBackendHealth } from '@/hooks/useBackendHealth';

export default function BackendStatusBanner() {
  const q = useBackendHealth();

  if (!q.data) return null;

  const ready = q.data.ok && q.data.data?.ready !== false;
  if (ready) return null;

  const deps = q.data.data?.deps;
  const mongoBad = deps?.mongo && (!deps.mongo.connected || !deps.mongo.ping);
  const redisBad = deps?.redis?.configured && deps?.redis && deps.redis.ok === false;

  const detail = mongoBad
    ? 'MongoDB indisponivel'
    : redisBad
      ? 'Redis indisponivel'
      : 'Backend indisponivel';

  return (
    <div className="sticky top-0 z-50 border-b bg-amber-50">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <p className="text-sm text-amber-900 truncate">
            Servico degradado: {detail}. Algumas acoes podem falhar.
          </p>
        </div>
        <a
          href="/health"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-amber-900 hover:underline shrink-0"
        >
          <Server className="h-4 w-4" />
          Ver health
        </a>
      </div>
    </div>
  );
}
