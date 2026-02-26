import { useEffect, useMemo, useRef, useState } from "react";
import { makeClient } from "@jp/client";
import type { Job, JobStatus } from "@jp/client";
import { loadConfig, saveConfig } from "./storage";

type HealthState = {
  health: "ok" | "down" | "unknown";
  ready: "ok" | "down" | "unknown";
  details?: string;
};

function cls(...xs: Array<string | false | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function truncate(v: string, n = 28): string {
  if (v.length <= n) return v;
  return `${v.slice(0, n - 1)}…`;
}

export function App() {
  const initial = useMemo(() => loadConfig(), []);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState(initial.apiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [health, setHealth] = useState<HealthState>({
    health: "unknown",
    ready: "unknown"
  });

  const client = useMemo(() => {
    const key = apiKey.trim().length ? apiKey.trim() : undefined;
    return makeClient({ baseUrl: baseUrl.trim(), apiKey: key });
  }, [baseUrl, apiKey]);

  const [createRows, setCreateRows] = useState(250);
  const [createValue, setCreateValue] = useState("portfolio");
  const [creating, setCreating] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<JobStatus | "">("");
  const [limit, setLimit] = useState(20);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(true);
  const pollRef = useRef<number | null>(null);

  const [queueStats, setQueueStats] = useState<any>(null);
  const [dlqJobs, setDlqJobs] = useState<any[]>([]);

  useEffect(() => {
    saveConfig({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() || undefined });
  }, [baseUrl, apiKey]);

  async function refreshHealth() {
    const h: HealthState = { health: "unknown", ready: "unknown" };
    try {
      const r = await fetch(new URL("/health", baseUrl).toString());
      h.health = r.ok ? "ok" : "down";
    } catch {
      h.health = "down";
    }
    try {
      const r = await fetch(new URL("/ready", baseUrl).toString());
      h.ready = r.ok ? "ok" : "down";
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        h.details = t.slice(0, 2000);
      }
    } catch {
      h.ready = "down";
    }
    setHealth(h);
  }

  async function loadJobs(next?: { cursor?: string }) {
    setError(null);
    setLoading(true);
    try {
      const query: any = {
        limit,
        cursor: next?.cursor ?? cursor
      };
      if (status) query.status = status;
      const res = await client.listJobs(query);
      if (res.error) throw new Error(JSON.stringify(res.error));
      const data: any = res.data;
      setJobs(data.items);
      setNextCursor(data.nextCursor);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadQueue() {
    try {
      const res = await client.getQueueStats();
      if (res.error) throw new Error();
      setQueueStats(res.data);
    } catch {
      setQueueStats(null);
    }
  }

  async function loadDlq() {
    try {
      const res = await client.listDlqJobs({ start: 0, end: 25 });
      if (res.error) throw new Error();
      setDlqJobs((res.data as any).items || []);
    } catch {
      setDlqJobs([]);
    }
  }

  useEffect(() => {
    void refreshHealth();
    void loadJobs({ cursor: undefined });
    void loadQueue();
    void loadDlq();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, status, limit]);

  useEffect(() => {
    if (!polling) {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      void loadJobs({ cursor: undefined });
      void loadQueue();
    }, 3000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, client, status, limit]);

  async function createJob() {
    setError(null);
    setCreating(true);
    try {
      const res = await client.createJob(
        { type: "report.generate", payload: { rows: createRows, value: createValue } },
        `dash:${Date.now()}`
      );
      if (res.error) throw new Error(JSON.stringify(res.error));
      const job: any = res.data;
      setLastCreatedId(job.id);
      setCursor(undefined);
      await loadJobs({ cursor: undefined });
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setCreating(false);
    }
  }

  async function cancelJob(id: string) {
    setError(null);
    try {
      const res = await client.cancelJob(id);
      if (res.error) throw new Error(JSON.stringify(res.error));
      await loadJobs({ cursor: undefined });
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  async function retryJob(id: string) {
    setError(null);
    try {
      const res = await client.retryJob(id);
      if (res.error) throw new Error(JSON.stringify(res.error));
      await loadJobs({ cursor: undefined });
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  async function openArtifact(id: string) {
    setError(null);
    try {
      const res = await client.getJobArtifact(id);
      if (res.error) throw new Error(JSON.stringify(res.error));
      const a: any = res.data;
      if (a.type === "s3") {
        window.open(a.url, "_blank", "noopener,noreferrer");
        return;
      }
      alert(`Local artifact path:\n${a.path}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  const healthBadge = (v: "ok" | "down" | "unknown") =>
    cls("badge", v === "ok" && "ok", v === "down" && "down");

  return (
    <div className="page">
      <header className="top">
        <div className="brand">
          <div className="mark" aria-hidden="true" />
          <div>
            <div className="title">Job Platform</div>
            <div className="subtitle">Operations dashboard (portfolio)</div>
          </div>
        </div>

        <div className="health">
          <div className={healthBadge(health.health)}>health: {health.health}</div>
          <div className={healthBadge(health.ready)}>ready: {health.ready}</div>
          <button className="btn ghost" onClick={() => void refreshHealth()}>
            refresh
          </button>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <div className="cardHead">
            <h2>Connection</h2>
            <div className="hint">Saved in localStorage</div>
          </div>

          <div className="form">
            <label>
              <div className="label">API base URL</div>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:4010"
                spellCheck={false}
              />
            </label>

            <label>
              <div className="label">API key (optional)</div>
              <div className="row">
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Bearer or x-api-key"
                  type={showKey ? "text" : "password"}
                  spellCheck={false}
                />
                <button className="btn ghost" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? "hide" : "show"}
                </button>
              </div>
            </label>

            <div className="row">
              <label className="toggle">
                <input type="checkbox" checked={polling} onChange={(e) => setPolling(e.target.checked)} />
                <span>auto refresh</span>
              </label>
              <button className="btn" onClick={() => void loadJobs({ cursor: undefined })}>
                reload jobs
              </button>
              <button className="btn ghost" onClick={() => void loadQueue()}>
                queue
              </button>
              <button className="btn ghost" onClick={() => void loadDlq()}>
                dlq
              </button>
            </div>
          </div>

          {health.details ? (
            <pre className="note">{health.details}</pre>
          ) : (
            <div className="note">
              Tip: set `API_KEY` to enable auth, and `METRICS_ENABLED=1` for Prometheus.
            </div>
          )}
        </section>

        <section className="card">
          <div className="cardHead">
            <h2>Create job</h2>
            <div className="hint">type: report.generate</div>
          </div>

          <div className="form">
            <div className="row">
              <label className="grow">
                <div className="label">rows</div>
                <input
                  inputMode="numeric"
                  value={String(createRows)}
                  onChange={(e) => setCreateRows(Number(e.target.value || 0))}
                />
              </label>
              <label className="grow">
                <div className="label">value</div>
                <input value={createValue} onChange={(e) => setCreateValue(e.target.value)} />
              </label>
            </div>

            <div className="row">
              <button className="btn primary" disabled={creating} onClick={() => void createJob()}>
                {creating ? "creating..." : "enqueue"}
              </button>
              {lastCreatedId ? <div className="hint">last: {truncate(lastCreatedId, 42)}</div> : null}
            </div>
          </div>
        </section>

        <section className="card span2">
          <div className="cardHead">
            <h2>Jobs</h2>
            <div className="row">
              <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="">all</option>
                <option value="queued">queued</option>
                <option value="processing">processing</option>
                <option value="succeeded">succeeded</option>
                <option value="failed">failed</option>
                <option value="cancelled">cancelled</option>
              </select>
              <select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
              <button
                className="btn ghost"
                disabled={!nextCursor}
                onClick={() => {
                  setCursor(nextCursor || undefined);
                  void loadJobs({ cursor: nextCursor || undefined });
                }}
              >
                next page
              </button>
              <div className="hint">{loading ? "loading..." : `${jobs.length} items`}</div>
            </div>
          </div>

          {error ? <div className="error">{error}</div> : null}

          <div className="table">
            <div className="thead">
              <div>job</div>
              <div>status</div>
              <div>attempts</div>
              <div>created</div>
              <div>actions</div>
            </div>
            {jobs.map((j) => (
              <div key={j.id} className="trow">
                <div className="mono">{truncate(j.id, 34)}</div>
                <div className={cls("status", `s-${j.status}`)}>{j.status}</div>
                <div>{j.attempts}</div>
                <div className="muted">{fmtTime(j.createdAt)}</div>
                <div className="actions">
                  <button className="btn tiny" onClick={() => void openArtifact(j.id)} disabled={!j.artifactKey}>
                    artifact
                  </button>
                  <button
                    className="btn tiny ghost"
                    onClick={() => void cancelJob(j.id)}
                    disabled={j.status === "succeeded" || j.status === "cancelled"}
                  >
                    cancel
                  </button>
                  <button
                    className="btn tiny ghost"
                    onClick={() => void retryJob(j.id)}
                    disabled={j.status !== "failed" && j.status !== "cancelled"}
                  >
                    retry
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="cardHead">
            <h2>Queue</h2>
            <div className="hint">BullMQ counts</div>
          </div>
          <pre className="pre">{queueStats ? JSON.stringify(queueStats, null, 2) : "(unavailable)"}</pre>
        </section>

        <section className="card">
          <div className="cardHead">
            <h2>DLQ (first 25)</h2>
            <div className="hint">Best-effort view</div>
          </div>
          <div className="dlq">
            {dlqJobs.length === 0 ? <div className="muted">(empty)</div> : null}
            {dlqJobs.map((j, idx) => (
              <div key={`${j.id || idx}`} className="dlqItem">
                <div className="mono">{j.id || "(no id)"}</div>
                <div className="muted">{j.name}</div>
                {j.failedReason ? <div className="error">{j.failedReason}</div> : null}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="muted">
          Dashboard uses `@jp/client` generated from OpenAPI. Source: `job-platform/packages/dashboard/`.
        </div>
      </footer>
    </div>
  );
}
