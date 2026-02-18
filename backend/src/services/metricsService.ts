type CounterName =
  | 'http_requests_total'
  | 'http_4xx_total'
  | 'http_5xx_total'
  | 'db_not_ready_total';

export class MetricsService {
  private counters = new Map<CounterName, number>();
  private latencyMs: number[] = [];
  private startedAt = Date.now();

  inc(name: CounterName, by = 1) {
    const prev = this.counters.get(name) || 0;
    this.counters.set(name, prev + by);
  }

  observeLatency(ms: number) {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.latencyMs.push(ms);
    // keep last 2000 samples
    if (this.latencyMs.length > 2000) {
      this.latencyMs.splice(0, this.latencyMs.length - 2000);
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

    return `${lines.join('\n')}\n`;
  }
}

export const metricsService = new MetricsService();
