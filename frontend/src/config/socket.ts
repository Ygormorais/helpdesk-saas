type Env = {
  VITE_SOCKET_URL?: string;
  VITE_BACKEND_URL?: string;
  VITE_API_URL?: string;
};

const stripTrailingSlashes = (s: string) => s.replace(/\/+$/, '');

const stripApiSuffix = (s: string) => {
  const trimmed = stripTrailingSlashes(s);
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

export function getSocketUrl(): string | undefined {
  const env = import.meta.env as unknown as Env;

  const raw = String(env.VITE_SOCKET_URL || env.VITE_BACKEND_URL || '').trim();
  if (raw && /^https?:\/\//i.test(raw)) return stripApiSuffix(raw);

  const api = String(env.VITE_API_URL || '').trim();
  if (api && /^https?:\/\//i.test(api)) return stripApiSuffix(api);

  // Use same-origin (Vite proxy / production origin)
  return undefined;
}
