import { getRedisClient } from './redisClient.js';
import { logger } from './logger.js';

type CounterName =
  | 'http_requests_total'
  | 'http_4xx_total'
  | 'http_5xx_total'
  | 'db_not_ready_total';

type RouteKey = {
  method: string;
  route: string;
  statusClass: '2xx' | '3xx' | '4xx' | '5xx' | 'other';
};

function toStatusClass(code: number): RouteKey['statusClass'] {
  if (code >= 200 && code < 300) return '2xx';
  if (code >= 300 && code < 400) return '3xx';
  if (code >= 400 && code < 500) return '4xx';
  if (code >= 500 && code < 600) return '5xx';
  return 'other';
}

function routeField(key: RouteKey): string {
  return `${key.method}|${key.route}|${key.statusClass}`;
}

export class MetricsService {
  private counters = new Map<CounterName, number>();
  private routes = new Map<string, number>();
  private latencyMs: number[] = [];
  private startedAt = Date.now();
  private initialized = false;

  inc(name: CounterName, by = 1) {
    const prev = this.counters.get(name) || 0;
    this.counters.set(name, prev + by);

    void this.persistCounter(name, by);
  }

  observeLatency(ms: number) {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.latencyMs.push(ms);
    // keep last 2000 samples
    if (this.latencyMs.length > 2000) {
      this.latencyMs.splice(0, this.latencyMs.length - 2000);
    }

    void this.persistLatency(Math.round(ms));
  }

  observeHttp(params: {
    method: string;
    route: string;
    statusCode: number;
    durationMs: number;
    errorCode?: string;
  }) {
    this.inc('http_requests_total', 1);
    this.observeLatency(params.durationMs);

    if (params.statusCode >= 400 && params.statusCode < 500) this.inc('http_4xx_total', 1);
    if (params.statusCode >= 500) this.inc('http_5xx_total', 1);
    if (params.statusCode === 503 && params.errorCode === 'DB_NOT_READY') this.inc('db_not_ready_total', 1);

    const key: RouteKey = {
      method: String(params.method || '').toUpperCase(),
      route: params.route || '/',
      statusClass: toStatusClass(params.statusCode),
    };
    const field = routeField(key);
    const prev = this.routes.get(field) || 0;
    this.routes.set(field, prev + 1);
    void this.persistRoute(field, 1);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const redis = await getRedisClient();
    if (!redis) return;

    try {
      const [counters, routes, latencyRaw] = await Promise.all([
        redis.hGetAll('metrics:counters'),
        redis.hGetAll('metrics:routes'),
        redis.lRange('metrics:latency', 0, 1999),
      ]);

      for (const [k, v] of Object.entries(counters || {})) {
        const n = Number(v);
        if (!Number.isFinite(n)) continue;
        this.counters.set(k as CounterName, n);
      }

      for (const [k, v] of Object.entries(routes || {})) {
        const n = Number(v);
        if (!Number.isFinite(n)) continue;
        this.routes.set(k, n);
      }

      const lat = (latencyRaw || [])
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n >= 0);
      if (lat.length > 0) {
        this.latencyMs = lat;
      }
    } catch (err: any) {
      logger.warn({ msg: 'metrics.redis_load_failed', error: String(err?.message || err) });
    }
  }

  snapshot() {
    const uptimeSec = Math.floor((Date.now() - this.startedAt) / 1000);
    const lat = this.latencyMs.slice().sort((a, b) => a - b);
    const pct = (p: number) => {
      if (lat.length === 0) return 0;
      const idx = Math.min(lat.length - 1, Math.floor((p / 100) * lat.length));
      return Math.round(lat[idx]);
    };

    return {
      uptimeSec,
      counters: Object.fromEntries(this.counters.entries()),
      routes: Object.fromEntries(this.routes.entries()),
      latencyMs: {
        count: lat.length,
        p50: pct(50),
        p90: pct(90),
        p95: pct(95),
        p99: pct(99),
      },
    };
  }

  toPrometheus(): string {
    const snap = this.snapshot();
    const lines: string[] = [];

    const counter = (name: string, value: number) => {
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value}`);
    };

    const gauge = (name: string, value: number) => {
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    };

    gauge('app_uptime_seconds', snap.uptimeSec);
    for (const [k, v] of Object.entries(snap.counters || {})) {
      counter(k, Number(v) || 0);
    }

    lines.push('# TYPE http_request_latency_ms gauge');
    lines.push(`http_request_latency_ms{quantile="0.50"} ${snap.latencyMs.p50}`);
    lines.push(`http_request_latency_ms{quantile="0.90"} ${snap.latencyMs.p90}`);
    lines.push(`http_request_latency_ms{quantile="0.95"} ${snap.latencyMs.p95}`);
    lines.push(`http_request_latency_ms{quantile="0.99"} ${snap.latencyMs.p99}`);
    lines.push(`# TYPE http_request_latency_ms_count gauge`);
    lines.push(`http_request_latency_ms_count ${snap.latencyMs.count}`);

    // Per-route series
    lines.push('# TYPE http_requests_by_route_total counter');
    for (const [field, value] of Object.entries(snap.routes || {})) {
      const [method, route, statusClass] = String(field).split('|');
      const v = Number(value) || 0;
      const safeRoute = (route || '').replace(/"/g, '');
      lines.push(
        `http_requests_by_route_total{method="${method}",route="${safeRoute}",status_class="${statusClass}"} ${v}`
      );
    }

    return `${lines.join('\n')}\n`;
  }

  private async persistCounter(name: CounterName, by: number) {
    const redis = await getRedisClient();
    if (!redis) return;
    try {
      await redis.hIncrBy('metrics:counters', name, by);
    } catch {
      // ignore
    }
  }

  private async persistRoute(field: string, by: number) {
    const redis = await getRedisClient();
    if (!redis) return;
    try {
      await redis.hIncrBy('metrics:routes', field, by);
    } catch {
      // ignore
    }
  }

  private async persistLatency(ms: number) {
    const redis = await getRedisClient();
    if (!redis) return;
    try {
      await redis
        .multi()
        .lPush('metrics:latency', String(ms))
        .lTrim('metrics:latency', 0, 1999)
        .exec();
    } catch {
      // ignore
    }
  }
}

export const metricsService = new MetricsService();
