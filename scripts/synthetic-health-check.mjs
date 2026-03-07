const backend = String(process.env.BACKEND_URL || '').trim();
const frontend = String(process.env.FRONTEND_URL || '').trim();
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || '10000');

if (!backend || !frontend) {
  console.error('[error] BACKEND_URL e FRONTEND_URL sao obrigatorias.');
  process.exit(2);
}

const trimSlash = (value) => value.replace(/\/+$/, '');
const backendBase = trimSlash(backend);
const frontendBase = trimSlash(frontend);

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

async function getJson(url, name) {
  const res = await fetch(url, { signal: controller.signal });
  if (!res.ok) {
    throw new Error(`${name}: expected HTTP 200, got ${res.status}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${name}: invalid JSON`);
  }
}

async function getStatus(url, name) {
  const res = await fetch(url, { signal: controller.signal });
  if (!res.ok) {
    throw new Error(`${name}: expected HTTP 200, got ${res.status}`);
  }
  return true;
}

try {
  const live = await getJson(`${backendBase}/health/live`, 'backend live');
  if (live.status !== 'ok') {
    throw new Error('backend live: status != ok');
  }

  const ready = await getJson(`${backendBase}/health`, 'backend ready');
  if (ready.status !== 'ok' || ready.ready !== true) {
    throw new Error('backend ready: expected status=ok and ready=true');
  }

  const version = await getJson(`${backendBase}/health/version`, 'backend version');
  if (version.status !== 'ok') {
    throw new Error('backend version: status != ok');
  }

  await getStatus(`${frontendBase}/`, 'frontend root');

  console.log(
    JSON.stringify({
      status: 'ok',
      checkedAt: new Date().toISOString(),
      backend: backendBase,
      frontend: frontendBase,
      commitSha: version.commitSha || 'unknown',
    })
  );
} catch (error) {
  console.error('[error]', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
