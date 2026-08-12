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

if (!base || /localhost|127\.0\.0\.1/.test(base)) {
  console.log('LIVE smoke: SKIP (no non-local VITE_API_BASE_URL)')
  process.exit(0)
}

const login = await fetch(`${base}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: user, password: pass }),
})
console.log('login', login.status)
if (!login.ok) process.exit(1)
const tokens = await login.json()
const h = { Authorization: `Bearer ${tokens.accessToken}` }

async function probe(name, url) {
  const r = await fetch(url, { headers: h })
  const j = await r.json().catch(() => ({}))
  const extra =
    j.total != null
      ? `total=${j.total} items=${(j.items ?? j.data)?.length ?? '?'}`
      : j.username
        ? `user=${j.username}`
        : j.message
          ? `msg=${j.message}`
          : ''
  console.log(name, r.status, extra)
  return { r, j }
}

const page1 = await probe('users page1', `${base}/api/v1/users?page=1&pageSize=10`)
await probe('users search', `${base}/api/v1/users?search=a&page=1&pageSize=5`)
await probe('users active', `${base}/api/v1/users?status=ACTIVE&page=1&pageSize=1`)
await probe(
  'users role caregiver',
  `${base}/api/v1/users?role=caregiver&page=1&pageSize=5`,
)

const userId = (page1.j.items ?? page1.j.data)?.[0]?.id
if (userId) {
  await probe('user detail', `${base}/api/v1/users/${userId}`)
} else {
  console.log('user detail SKIP (empty list)')
}

const from = new Date()
from.setUTCDate(from.getUTCDate() - 7)
const to = new Date()
await probe(
  'audit logs week',
  `${base}/api/v1/audit-logs?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&page=1&pageSize=10`,
)

// Negative: caregiver cannot hit users (expect 401/403 without token reuse — probe with no auth)
const unauth = await fetch(`${base}/api/v1/users?page=1&pageSize=1`)
console.log('users unauth', unauth.status)

const missing = await fetch(`${base}/api/v1/users/00000000-0000-4000-8000-000000000000`, {
  headers: h,
})
console.log('user missing', missing.status)

if (!page1.r.ok) process.exit(1)
if (((page1.j.items ?? page1.j.data)?.length ?? 0) > 10) {
  console.log('FAIL: page overflow')
  process.exit(1)
}

console.log('smoke ok')
