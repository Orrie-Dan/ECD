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

const checks = [
  ['districts page1', `${base}/api/v1/districts?page=1&pageSize=10`],
  ['districts search', `${base}/api/v1/districts?search=a&page=1&pageSize=5`],
  ['districts active', `${base}/api/v1/districts?isActive=true&page=1&pageSize=1`],
]

let firstId = null
for (const [name, url] of checks) {
  const r = await fetch(url, { headers: h })
  const j = await r.json().catch(() => ({}))
  if (!firstId && j.items?.[0]) firstId = j.items[0].id
  console.log(name, r.status, `total=${j.total ?? '?'}`, `items=${j.items?.length ?? '?'}`)
}

if (!firstId) {
  console.log('no district id')
  process.exit(1)
}

const detail = await fetch(`${base}/api/v1/districts/${firstId}`, { headers: h })
console.log('district detail', detail.status)

const centers = await fetch(
  `${base}/api/v1/centers?districtId=${firstId}&page=1&pageSize=10`,
  { headers: h },
)
const cj = await centers.json().catch(() => ({}))
console.log(
  'centers by district',
  centers.status,
  `total=${cj.total ?? '?'}`,
  `items=${cj.items?.length ?? '?'}`,
)

const dash = await fetch(`${base}/api/v1/analytics/dashboard?districtId=${firstId}`, {
  headers: h,
})
console.log('dashboard scoped', dash.status)

const rep = await fetch(`${base}/api/v1/reports/district?districtId=${firstId}`, {
  headers: h,
})
console.log('reports district scoped', rep.status)
