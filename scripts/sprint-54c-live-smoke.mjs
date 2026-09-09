/**
 * Sprint 5.4C — LIVE API smoke against deployed Render backend.
 * Mirrors Sprint 5.4A probe matrix. Does not print secrets/tokens.
 *
 * Run from frontend repo with LIVE .env present:
 *   node scripts/sprint-54c-live-smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '.smoke-tmp-54c');
fs.mkdirSync(outDir, { recursive: true });

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const feEnv = loadEnv(path.join(root, '.env'));
const beEnv = loadEnv(path.join('D:', 'Esri', 'ECD Backend', '.env'));

const baseUrl = (feEnv.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiMode = feEnv.VITE_API_MODE;
const username = beEnv.SEED_ADMIN_USERNAME || 'ncda_admin';
const password = beEnv.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

const results = [];

function record(name, data) {
  results.push({ name, ...data });
  const safe = { ...data };
  if (safe.body && typeof safe.body === 'object') {
    // keep summary only in console
  }
  console.log(
    JSON.stringify({
      name,
      ok: data.ok,
      status: data.status,
      ms: data.ms,
      note: data.note,
      total: data.total,
      items: data.items,
    }),
  );
  fs.writeFileSync(
    path.join(outDir, `${name}.json`),
    JSON.stringify(data, null, 2),
  );
}

async function req(name, method, urlPath, { token, body, timeoutMs = 120000 } = {}) {
  if (!baseUrl.startsWith('https://') || /localhost|127\.0\.0\.1/i.test(baseUrl)) {
    throw new Error(`Refusing non-production base URL host class: ${baseUrl}`);
  }
  const url = `${baseUrl}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const ms = Date.now() - t0;
    const text = await res.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 500) };
    }
    const isHtml502 =
      res.status === 502 ||
      (typeof text === 'string' && /bad gateway/i.test(text));
    const note = isHtml502
      ? '502/gateway'
      : res.ok
        ? 'ok'
        : `http_${res.status}`;
    record(name, {
      ok: res.ok && !isHtml502,
      status: res.status,
      ms,
      note,
      urlPath,
      total: parsed?.total,
      items: Array.isArray(parsed?.items) ? parsed.items.length : undefined,
      summaryKeys: parsed?.summary ? Object.keys(parsed.summary) : undefined,
      body: parsed,
    });
    return { res, parsed, ms, ok: res.ok && !isHtml502 };
  } catch (e) {
    const ms = Date.now() - t0;
    const msg = e instanceof Error ? e.message : String(e);
    record(name, {
      ok: false,
      status: 0,
      ms,
      note: msg.includes('abort') ? 'timeout' : msg.slice(0, 200),
      urlPath,
    });
    return { res: null, parsed: null, ms, ok: false };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(
    JSON.stringify({
      phase: 'config',
      apiMode,
      host: new URL(baseUrl).host,
      https: baseUrl.startsWith('https://'),
      localhost: /localhost|127\.0\.0\.1/i.test(baseUrl),
      username,
    }),
  );

  if (apiMode !== 'live') {
    throw new Error(`VITE_API_MODE must be live, got ${apiMode}`);
  }

  // Deploy version marker
  const docs = await req('docs_json', 'GET', '/api/docs-json', { timeoutMs: 60000 });
  const docsText = JSON.stringify(docs.parsed || {});
  console.log(
    JSON.stringify({
      phase: 'deploy_marker',
      hasScreenings: /nutrition\/screenings/.test(docsText),
      hasReferralFrom:
        /"from"/.test(docsText) && /referrals/.test(docsText),
    }),
  );

  const login = await req('login', 'POST', '/api/v1/auth/login', {
    body: { username, password },
    timeoutMs: 60000,
  });
  const token = login.parsed?.accessToken || login.parsed?.tokens?.accessToken;
  if (!token) {
    console.log(JSON.stringify({ phase: 'abort', reason: 'login_failed' }));
    writeSummary();
    process.exit(1);
  }

  await req('me', 'GET', '/api/v1/auth/me', { token });
  await req('dashboard', 'GET', '/api/v1/analytics/dashboard', { token });
  await req('centers', 'GET', '/api/v1/centers?page=1&pageSize=100', { token });

  const from = '2026-07-01';
  const to = '2026-08-11';
  const q = `from=${from}&to=${to}&page=1&pageSize=20`;

  await req('attendance_mon', 'GET', `/api/v1/monitoring/attendance?${q}`, {
    token,
  });
  await req('nutrition_mon', 'GET', `/api/v1/monitoring/nutrition?${q}`, {
    token,
  });
  await req('feeding_mon', 'GET', `/api/v1/monitoring/feeding?${q}`, { token });
  await req('sted_mon', 'GET', `/api/v1/monitoring/sted?${q}`, { token });
  await req('referrals_mon', 'GET', `/api/v1/monitoring/referrals?${q}`, {
    token,
  });

  await req('followup', 'GET', '/api/v1/alerts/follow-up?limit=50', { token });
  await req(
    'screenings',
    'GET',
    `/api/v1/nutrition/screenings?page=1&pageSize=50&from=${from}&to=${to}`,
    { token },
  );
  await req('nutrition_alerts', 'GET', '/api/v1/nutrition/alerts', { token });
  await req(
    'referrals_list',
    'GET',
    `/api/v1/referrals?page=1&pageSize=50&from=${from}&to=${to}`,
    { token },
  );
  await req('enrollment', 'GET', `/api/v1/reports/enrollment?${q}`, { token });
  await req('dropouts', 'GET', `/api/v1/reports/dropouts?${q}`, { token });
  await req('district_report', 'GET', `/api/v1/reports/district?${q}`, {
    token,
  });
  await req('centers_report', 'GET', `/api/v1/reports/centers?${q}`, { token });
  await req('children', 'GET', '/api/v1/children?page=1&pageSize=20', {
    token,
  });

  const centersBody = JSON.parse(
    fs.readFileSync(path.join(outDir, 'centers.json'), 'utf8'),
  ).body;
  const centerId = centersBody?.items?.[0]?.id;
  if (centerId) {
    await req('center_detail', 'GET', `/api/v1/centers/${centerId}`, { token });
  } else {
    record('center_detail', {
      ok: false,
      status: 0,
      ms: 0,
      note: 'no_center_id',
    });
  }

  // Logout check: refresh should work; we only clear client-side in FE.
  // Call me again to confirm session still valid, then report logout as FE concern.
  await req('me_after', 'GET', '/api/v1/auth/me', { token });

  writeSummary();
}

function writeSummary() {
  const summary = {
    host: new URL(baseUrl).host,
    apiMode,
    results: results.map((r) => ({
      name: r.name,
      ok: r.ok,
      status: r.status,
      ms: r.ms,
      note: r.note,
      total: r.total,
      items: r.items,
    })),
  };
  fs.writeFileSync(
    path.join(outDir, 'summary.json'),
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify({ phase: 'summary', ...summary }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
