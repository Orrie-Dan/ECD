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
      : j.fullName
        ? `name=${j.fullName}`
        : j.message
          ? `msg=${j.message}`
          : ''
  console.log(name, r.status, extra)
  return { r, j }
}

const page1 = await probe('children page1', `${base}/api/v1/children?page=1&pageSize=10`)
const search = await probe(
  'children search',
  `${base}/api/v1/children?search=a&page=1&pageSize=5`,
)
const active = await probe(
  'children active',
  `${base}/api/v1/children?status=active&page=1&pageSize=1`,
)

const districts = await probe('districts', `${base}/api/v1/districts?page=1&pageSize=1`)
const districtId = districts.j.items?.[0]?.id
let districtFilterStatus = 'skip'
if (districtId) {
  const d = await probe(
    'children by district',
    `${base}/api/v1/children?districtId=${districtId}&page=1&pageSize=10`,
  )
  districtFilterStatus = String(d.r.status)
}

if (!page1.r.ok || !search.r.ok || !active.r.ok) process.exit(1)
if ((page1.j.items?.length ?? 0) > 10) {
  console.log('FAIL: page1 returned more than pageSize items')
  process.exit(1)
}

const childId = page1.j.items?.[0]?.id
if (childId) {
  const detail = await probe('child detail', `${base}/api/v1/children/${childId}`)
  await probe(
    'attendance child',
    `${base}/api/v1/attendance?childId=${childId}&page=1&pageSize=10`,
  )
  await probe(
    'nutrition child',
    `${base}/api/v1/nutrition/screenings?childId=${childId}&page=1&pageSize=10`,
  )
  await probe(
    'sted child',
    `${base}/api/v1/children/${childId}/sted-history?page=1&pageSize=10`,
  )
  await probe(
    'referrals child',
    `${base}/api/v1/referrals?childId=${childId}&page=1&pageSize=10`,
  )
  if (!detail.r.ok) process.exit(1)
} else {
  console.log('child detail/ops SKIP (no children in LIVE dataset)')
}

const missing = await fetch(`${base}/api/v1/children/00000000-0000-4000-8000-000000000000`, {
  headers: h,
})
console.log('child missing', missing.status)
console.log('districtFilterStatus', districtFilterStatus)

if (districtFilterStatus === '400') {
  console.log('NOTE: districtId filter not on deployed API yet (expected until backend deploy)')
}

console.log('smoke ok')
