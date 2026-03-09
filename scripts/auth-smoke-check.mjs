import fs from 'node:fs/promises';

const args = process.argv.slice(2);

if (args.length < 3) {
  console.error(
    'Usage: node scripts/auth-smoke-check.mjs <backend_url> <email> <password> [frontend_url]'
  );
  process.exit(2);
}

const backend = String(args[0] || '').trim().replace(/\/+$/, '');
const email = String(args[1] || '').trim();
const password = String(args[2] || '');
const frontend = String(args[3] || '').trim().replace(/\/+$/, '');
const timeoutMs = Math.max(1000, Number(process.env.AUTH_SMOKE_TIMEOUT_MS || '10000'));
const outputFile = String(process.env.AUTH_SMOKE_OUTPUT_FILE || '').trim();

const result = {
  status: 'error',
  severity: 'none',
  failureScope: 'none',
  checkedAt: new Date().toISOString(),
  backend,
  frontend: frontend || undefined,
  email,
  commitSha: 'unknown',
  checks: {},
  error: '',
};

function classify(payload) {
  if (payload.status === 'skipped') {
    return { severity: 'none', failureScope: 'skipped' };
  }

  if (payload.status === 'ok') {
    return { severity: 'none', failureScope: 'none' };
  }

  switch (payload.failureScope) {
    case 'health-version':
      return { severity: 'P2', failureScope: payload.failureScope };
    case 'unknown':
      return { severity: 'P1', failureScope: payload.failureScope };
    default:
      return { severity: 'P1', failureScope: payload.failureScope || 'unknown' };
  }
}

async function writeResult() {
  const classification = classify(result);
  result.severity = classification.severity;
  if (!result.failureScope || result.failureScope === 'none') {
    result.failureScope = classification.failureScope;
  }
  if (!outputFile) {
    return;
  }
  await fs.writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

async function timedFetch(url, init, name) {
  const started = Date.now();
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  return {
    res,
    durationMs: Date.now() - started,
    name,
  };
}

async function expectJson(url, init, name, failureScope) {
  const { res, durationMs } = await timedFetch(url, init, name);
  if (!res.ok) {
    throw Object.assign(new Error(`${name}: expected HTTP 200, got ${res.status}`), {
      failureScope,
    });
  }

  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw Object.assign(new Error(`${name}: invalid JSON response`), {
      failureScope,
    });
  }

  return { payload, durationMs };
}

async function expectFrontend(url) {
  const { res, durationMs } = await timedFetch(url, {}, 'frontend root');
  if (!res.ok) {
    throw Object.assign(new Error(`frontend root: expected HTTP 200, got ${res.status}`), {
      failureScope: 'frontend-root',
    });
  }

  const body = await res.text();
  if (!body.toLowerCase().includes('<!doctype html')) {
    throw Object.assign(new Error('frontend root: response did not look like HTML'), {
      failureScope: 'frontend-root',
    });
  }

  return { durationMs };
}

function fail(error, scope = 'unknown') {
  result.status = 'error';
  result.failureScope = scope;
  result.error = error instanceof Error ? error.message : String(error);
}

try {
  console.log(`[info] backend:  ${backend}`);
  if (frontend) {
    console.log(`[info] frontend: ${frontend}`);
  }

  if (frontend) {
    const frontendRoot = await expectFrontend(`${frontend}/`);
    result.checks.frontendRootMs = frontendRoot.durationMs;
    console.log('[ok] frontend root');
  }

  const login = await expectJson(
    `${backend}/api/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    },
    'auth login',
    'auth-login'
  );
  result.checks.authLoginMs = login.durationMs;
  console.log('[ok] auth login');

  const token = String(login.payload?.token || '').trim();
  if (!token) {
    throw Object.assign(new Error('auth login: token missing in response'), {
      failureScope: 'auth-token',
    });
  }
  console.log('[ok] auth token');

  const me = await expectJson(
    `${backend}/api/auth/me`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    'auth me',
    'auth-me'
  );
  result.checks.authMeMs = me.durationMs;

  const userEmail = String(me.payload?.user?.email || '').trim().toLowerCase();
  if (userEmail !== email.toLowerCase()) {
    throw Object.assign(
      new Error(`auth me: expected user email ${email}, got ${userEmail || '<empty>'}`),
      {
        failureScope: 'auth-me',
      }
    );
  }
  console.log('[ok] auth me');

  const version = await expectJson(
    `${backend}/health/version`,
    {},
    'health version',
    'health-version'
  );
  result.checks.backendVersionMs = version.durationMs;
  result.commitSha = String(version.payload?.commitSha || 'unknown');
  console.log(`[ok] health version ${result.commitSha}`);

  result.status = 'ok';
  result.failureScope = 'none';
  result.error = '';
  await writeResult();
  console.log('[ok] auth smoke test passed');
  console.log(JSON.stringify(result));
} catch (error) {
  fail(error, error?.failureScope || 'unknown');
  await writeResult();
  console.error('[error]', result.error);
  console.log(JSON.stringify(result));
  process.exit(1);
}
