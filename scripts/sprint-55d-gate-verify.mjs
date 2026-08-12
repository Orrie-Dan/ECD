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

const login = await fetch(`${base}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: user, password: pass }),
})
console.log('login', login.status)
if (!login.ok) process.exit(1)
const tokens = await login.json()
const h = { Authorization: `Bearer ${tokens.accessToken}` }

const docs = await (await fetch(`${base}/docs-json`)).json()
const districtsPath = docs.paths['/api/v1/districts']
const detailPath = docs.paths['/api/v1/districts/{id}']
const isActive = districtsPath?.get?.parameters?.find((p) => p.name === 'isActive')
console.log('openapi isActive', Boolean(isActive))
console.log('openapi GET /districts/{id}', Boolean(detailPath?.get), detailPath?.get?.summary || '')

const list = await (
  await fetch(`${base}/api/v1/districts?page=1&pageSize=1`, { headers: h })
).json()
const id = list.items[0].id
const detail = await (await fetch(`${base}/api/v1/districts/${id}`, { headers: h })).json()
console.log(
  'detail payload match',
  detail.id === id,
  `code=${detail.code}`,
  `name=${detail.name}`,
  `isActive=${detail.isActive}`,
)

for (const [label, url] of [
  ['analytics national', `${base}/api/v1/analytics/dashboard`],
  ['reports district national', `${base}/api/v1/reports/district`],
  ['analytics scoped', `${base}/api/v1/analytics/dashboard?districtId=${id}`],
  ['reports scoped', `${base}/api/v1/reports/district?districtId=${id}`],
]) {
  const r = await fetch(url, { headers: h })
  console.log('regression', label, r.status)
}
