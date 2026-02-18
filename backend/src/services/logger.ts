type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const levelRank: Record<Exclude<LogLevel, 'silent'>, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getLogLevel(): LogLevel {
  const raw = String(process.env.LOG_LEVEL || '').trim().toLowerCase();
  if (raw === 'silent') return 'silent';
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw;
  return 'info';
}

function allowLevel(level: Exclude<LogLevel, 'silent'>): boolean {
  const current = getLogLevel();
  if (current === 'silent') return false;
  return levelRank[level] >= levelRank[current];
}

function shouldLogHttpSuccess(): boolean {
  // When false, only log status >= 400
  const raw = String(process.env.LOG_HTTP_SUCCESS || '').trim().toLowerCase();
  if (!raw) return true;
  return !(raw === 'false' || raw === '0' || raw === 'no');
}

function redactEmail(value: string): string {
  const at = value.indexOf('@');
  if (at <= 0) return value;
  return `***${value.slice(at)}`;
}

function redactValueForKey(key: string, value: any): any {
  const k = key.toLowerCase();
  if (
    k.includes('password') ||
    k === 'pass' ||
    k.includes('secret') ||
    k.includes('token') ||
    k.includes('authorization') ||
    k.includes('apikey')
  ) {
    return '[REDACTED]';
  }

  if (k.includes('email') && typeof value === 'string') {
    return redactEmail(value);
  }

  return value;
}

function redact(input: any, depth = 0): any {
  if (depth > 6) return '[Truncated]';
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') {
    if (/^bearer\s+/i.test(input)) return 'Bearer [REDACTED]';
    return input;
  }
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map((v) => redact(v, depth + 1));

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    out[k] = redact(redactValueForKey(k, v), depth + 1);
  }
  return out;
}

function safeJsonStringify(obj: any): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(obj, (_k, v) => {
    if (typeof v === 'object' && v !== null) {
      if (seen.has(v as object)) return '[Circular]';
      seen.add(v as object);
    }
    return v;
  });
}

function write(level: Exclude<LogLevel, 'silent'>, obj: Record<string, any>) {
  const payload = redact(obj);
  const line = safeJsonStringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (obj: Record<string, any>) => {
    if (!allowLevel('info')) return;
    write('info', obj);
  },
  warn: (obj: Record<string, any>) => {
    if (!allowLevel('warn')) return;
    write('warn', obj);
  },
  error: (obj: Record<string, any>) => {
    if (!allowLevel('error')) return;
    write('error', obj);
  },
  debug: (obj: Record<string, any>) => {
    if (!allowLevel('debug')) return;
    write('debug', obj);
  },
  shouldLogHttpSuccess,
};
