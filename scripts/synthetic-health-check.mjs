const backend = String(process.env.BACKEND_URL || '').trim();
const frontend = String(process.env.FRONTEND_URL || '').trim();
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || '10000');
const defaultMaxLatencyMs = Number(process.env.MAX_LATENCY_MS || '5000');
const maxBackendLatencyMs = Number(process.env.MAX_BACKEND_LATENCY_MS || String(defaultMaxLatencyMs));
const maxFrontendLatencyMs = Number(process.env.MAX_FRONTEND_LATENCY_MS || String(defaultMaxLatencyMs));

if (!backend || !frontend) {
  console.error('[error] BACKEND_URL e FRONTEND_URL sao obrigatorias.');
  process.exit(2);
}

const trimSlash = (value) => value.replace(/\/+$/, '');
const backendBase = trimSlash(backend);
const frontendBase = trimSlash(frontend);

function assertLatency(name, durationMs, thresholdMs) {
  if (thresholdMs > 0 && durationMs > thresholdMs) {
    throw new Error(`${name}: latency ${durationMs}ms above threshold ${thresholdMs}ms`);
  }
}

async function getJson(url, name) {
  const controller = new AbortController();
  const started = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const durationMs = Date.now() - started;
    if (!res.ok) {
      throw new Error(`${name}: expected HTTP 200, got ${res.status}`);
    }
    const text = await res.text();
    try {
      return { payload: JSON.parse(text), durationMs };
    } catch {
      throw new Error(`${name}: invalid JSON`);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function getStatus(url, name) {
  const controller = new AbortController();
  const started = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const durationMs = Date.now() - started;
    if (!res.ok) {
      throw new Error(`${name}: expected HTTP 200, got ${res.status}`);
    }
    return { durationMs };
  } finally {
    clearTimeout(timer);
  }
}

try {
  const checks = {};

  const live = await getJson(`${backendBase}/health/live`, 'backend live');
  checks.backendLiveMs = live.durationMs;
  assertLatency('backend live', live.durationMs, maxBackendLatencyMs);
  if (live.payload.status !== 'ok') {
    throw new Error('backend live: status != ok');
  }

  const ready = await getJson(`${backendBase}/health`, 'backend ready');
  checks.backendReadyMs = ready.durationMs;
  assertLatency('backend ready', ready.durationMs, maxBackendLatencyMs);
  if (ready.payload.status !== 'ok' || ready.payload.ready !== true) {
    throw new Error('backend ready: expected status=ok and ready=true');
  }

  const version = await getJson(`${backendBase}/health/version`, 'backend version');
  checks.backendVersionMs = version.durationMs;
  assertLatency('backend version', version.durationMs, maxBackendLatencyMs);
  if (version.payload.status !== 'ok') {
    throw new Error('backend version: status != ok');
  }

  const frontendRoot = await getStatus(`${frontendBase}/`, 'frontend root');
  checks.frontendRootMs = frontendRoot.durationMs;
  assertLatency('frontend root', frontendRoot.durationMs, maxFrontendLatencyMs);

  console.log(
    JSON.stringify({
      status: 'ok',
      checkedAt: new Date().toISOString(),
      backend: backendBase,
      frontend: frontendBase,
      commitSha: version.payload.commitSha || 'unknown',
      maxBackendLatencyMs,
      maxFrontendLatencyMs,
      checks,
    })
  );
} catch (error) {
  console.error('[error]', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
