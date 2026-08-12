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
      ? `total=${j.total} items=${j.items?.length ?? '?'}`
      : j.name
        ? `name=${j.name}`
        : j.children
          ? 'dashboard'
          : ''
  console.log(name, r.status, extra)
  return { r, j }
}

const page1 = await probe('centers page1', `${base}/api/v1/centers?page=1&pageSize=10`)
const search = await probe('centers search', `${base}/api/v1/centers?search=a&page=1&pageSize=5`)
const active = await probe(
  'centers active',
  `${base}/api/v1/centers?status=active&page=1&pageSize=1`,
)

const districtId = page1.j.items?.[0]?.districtId
if (districtId) {
  await probe(
    'centers by district',
    `${base}/api/v1/centers?districtId=${districtId}&page=1&pageSize=10`,
  )
}

const centerId = page1.j.items?.[0]?.id
if (!centerId) {
  console.log('no center id')
  process.exit(1)
}

const detail = await probe('center detail', `${base}/api/v1/centers/${centerId}`)
await probe(
  'dashboard center',
  `${base}/api/v1/analytics/dashboard?centerId=${centerId}`,
)
await probe('children center', `${base}/api/v1/children?centerId=${centerId}&page=1&pageSize=10`)
await probe(
  'attendance center',
  `${base}/api/v1/attendance?centerId=${centerId}&page=1&pageSize=10`,
)
await probe(
  'nutrition center',
  `${base}/api/v1/nutrition/screenings?centerId=${centerId}&page=1&pageSize=10`,
)
await probe('feeding center', `${base}/api/v1/centers/${centerId}/feeding?page=1&pageSize=10`)
await probe(
  'referrals center',
  `${base}/api/v1/referrals?centerId=${centerId}&page=1&pageSize=10`,
)

const missing = await fetch(`${base}/api/v1/centers/00000000-0000-4000-8000-000000000000`, {
  headers: h,
})
console.log('center missing', missing.status)

if (!page1.r.ok || !search.r.ok || !active.r.ok || !detail.r.ok) {
  process.exit(1)
}

// Guard: page must not return the full national set
if ((page1.j.items?.length ?? 0) > 10) {
  console.log('FAIL: page1 returned more than pageSize items')
  process.exit(1)
}
if ((page1.j.total ?? 0) < 1000) {
  console.log('WARN: national total unexpectedly small', page1.j.total)
}

console.log('smoke ok')
