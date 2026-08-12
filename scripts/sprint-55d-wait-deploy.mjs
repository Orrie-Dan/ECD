/**
 * Poll deployed API until Sprint 5.5D geo gate probes pass (or timeout).
 * Usage: node scripts/sprint-55d-wait-deploy.mjs
 */
import fs from 'node:fs'

function load(p) {
  const o = {}
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)
    if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return o
}

const fe = load('d:/Esri/ECD/.env')
const be = load('D:/Esri/ECD Backend/.env')
const base = (fe.VITE_API_BASE_URL || '').replace(/\/$/, '')
const user = be.SEED_ADMIN_USERNAME || 'ncda_admin'
const pass = be.SEED_ADMIN_PASSWORD || 'ChangeMe123!'
const maxAttempts = 20
const delayMs = 30_000

if (!base || /localhost|127\.0\.0\.1/.test(base)) {
  console.log('SKIP: no non-local VITE_API_BASE_URL')
  process.exit(1)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function probeOnce() {
  const login = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass }),
  })
  if (!login.ok) return { ok: false, reason: `login ${login.status}` }
  const tokens = await login.json()
  const h = { Authorization: `Bearer ${tokens.accessToken}` }

  const docs = await fetch(`${base}/docs-json`)
  const openapi = docs.ok ? await docs.json() : null
  const hasIsActive = Boolean(
    openapi?.paths?.['/api/v1/districts']?.get?.parameters?.some((p) => p.name === 'isActive'),
  )
  const hasDetail = Boolean(openapi?.paths?.['/api/v1/districts/{id}']?.get)

  const list = await fetch(`${base}/api/v1/districts?page=1&pageSize=1`, { headers: h })
  const listJson = await list.json().catch(() => ({}))
  const id = listJson.items?.[0]?.id

  const active = await fetch(`${base}/api/v1/districts?isActive=true&page=1&pageSize=1`, {
    headers: h,
  })
  const detail = id
    ? await fetch(`${base}/api/v1/districts/${id}`, { headers: h })
    : { status: 0 }
  let detailBody = null
  if (detail.status === 200) {
    detailBody = await detail.json().catch(() => null)
  }

  const ok = active.status === 200 && detail.status === 200 && detailBody?.id === id
  return {
    ok,
    hasIsActive,
    hasDetail,
    list: list.status,
    active: active.status,
    detail: detail.status,
    detailMatches: detailBody?.id === id,
    id,
  }
}

for (let i = 1; i <= maxAttempts; i++) {
  const started = new Date().toISOString()
  try {
    const result = await probeOnce()
    console.log(
      `[${started}] attempt ${i}/${maxAttempts}`,
      JSON.stringify(result),
    )
    if (result.ok) {
      console.log('GATE_PROBES_PASS')
      process.exit(0)
    }
  } catch (e) {
    console.log(`[${started}] attempt ${i}/${maxAttempts} error`, String(e))
  }
  if (i < maxAttempts) await sleep(delayMs)
}

console.log('GATE_PROBES_TIMEOUT')
process.exit(1)
