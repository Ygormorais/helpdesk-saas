import fs from 'node:fs/promises';

const backend = String(process.env.BACKEND_URL || '').trim();
const frontend = String(process.env.FRONTEND_URL || '').trim();
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || '10000');
const defaultMaxLatencyMs = Number(process.env.MAX_LATENCY_MS || '5000');
const maxBackendLatencyMs = Number(process.env.MAX_BACKEND_LATENCY_MS || String(defaultMaxLatencyMs));
const maxFrontendLatencyMs = Number(process.env.MAX_FRONTEND_LATENCY_MS || String(defaultMaxLatencyMs));
const retries = Math.max(0, Number(process.env.HEALTHCHECK_RETRIES || '2'));
const retryDelayMs = Math.max(0, Number(process.env.HEALTHCHECK_RETRY_DELAY_MS || '1500'));
const outputFile = String(process.env.SYNTHETIC_OUTPUT_FILE || '').trim();

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(name, fn) {
  let lastError;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      const result = await fn();
      return { ...result, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt <= retries) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[warn] ${name} attempt ${attempt} failed: ${message}`);
        await sleep(retryDelayMs * attempt);
      }
    }
  }
  throw lastError;
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

const result = {
  status: 'error',
  checkedAt: new Date().toISOString(),
  backend: backendBase,
  frontend: frontendBase,
  commitSha: 'unknown',
  maxBackendLatencyMs,
  maxFrontendLatencyMs,
  retries,
  retryDelayMs,
  checks: {},
  attempts: {},
  error: '',
};

async function writeResult() {
  if (!outputFile) {
    return;
  }
  await fs.writeFile(outputFile, JSON.stringify(result, null, 2), 'utf8');
}

try {
  const live = await withRetry('backend live', () =>
    getJson(`${backendBase}/health/live`, 'backend live')
  );
  result.attempts.backendLive = live.attempts;
  result.checks.backendLiveMs = live.durationMs;
  assertLatency('backend live', live.durationMs, maxBackendLatencyMs);
  if (live.payload.status !== 'ok') {
    throw new Error('backend live: status != ok');
  }

  const ready = await withRetry('backend ready', () =>
    getJson(`${backendBase}/health`, 'backend ready')
  );
  result.attempts.backendReady = ready.attempts;
  result.checks.backendReadyMs = ready.durationMs;
  assertLatency('backend ready', ready.durationMs, maxBackendLatencyMs);
  if (ready.payload.status !== 'ok' || ready.payload.ready !== true) {
    throw new Error('backend ready: expected status=ok and ready=true');
  }

  const version = await withRetry('backend version', () =>
    getJson(`${backendBase}/health/version`, 'backend version')
  );
  result.attempts.backendVersion = version.attempts;
  result.checks.backendVersionMs = version.durationMs;
  assertLatency('backend version', version.durationMs, maxBackendLatencyMs);
  if (version.payload.status !== 'ok') {
    throw new Error('backend version: status != ok');
  }
  result.commitSha = version.payload.commitSha || 'unknown';

  const frontendRoot = await withRetry('frontend root', () =>
    getStatus(`${frontendBase}/`, 'frontend root')
  );
  result.attempts.frontendRoot = frontendRoot.attempts;
  result.checks.frontendRootMs = frontendRoot.durationMs;
  assertLatency('frontend root', frontendRoot.durationMs, maxFrontendLatencyMs);

  result.status = 'ok';
  result.error = '';
  await writeResult();
  console.log(JSON.stringify(result));
} catch (error) {
  result.status = 'error';
  result.error = error instanceof Error ? error.message : String(error);
  await writeResult();
  console.error('[error]', result.error);
  console.log(JSON.stringify(result));
  process.exitCode = 1;
}
