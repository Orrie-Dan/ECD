# Technical documentation

**System:** ECD Rwanda frontend  
**Repository:** this project  
**Runtime:** React SPA (Vite) talking to NestJS `/api/v1`  
**UI language:** Kinyarwanda (`src/locales/rw/`)

This document is for people who will host, configure, or change the application.

---

## 1. Purpose

The app digitizes the **operational ECD Book** (Igitabo cy’Urugo Mbonezamikurire) for caregivers and gives District and NCDA officers monitoring, governance, and a first compliance/WASH layer.

It is **not** a replacement for the existing ArcGIS ECD Mapping System (~32,000 centers). The intended ToR shape is **option 2**: a modular operational app that should be **linked** to that mapping platform. GIS views in this SPA are reserved for that work.

Aligned sources:

- National Standards for ECD in Rwanda (NCDA, May 2024)
- Paper ECD Book (center register)
- CRS–ESRI consulting agreement, Appendix A (July 2026)

---

## 2. What the product does

### 2.1 Caretaker (Umurezi) — digital ECD Book

| Paper form | App capability |
|---|---|
| I. Umwirondoro | Child register (child, 2 guardians, village) |
| II–IV. STED | Developmental / early disability screen wizard |
| V. Ubwitabire | Daily attendance |
| VI. Imirire | Center feeding log + month summary |
| VII. Gupima imikurire | Weight + MUAC, nutrition class, referrals |

Also: child edit, transfers (online), archive, attendance reports, offline save + sync.

### 2.2 District (Umukozi w’Akarere)

Dashboard, centers, children, caregiver users, monitoring hub (attendance / growth / feeding / STED), Gukurikirana follow-up, referrals, reports.

### 2.3 NCDA

National overview, monitoring, inspections (compliance assessments), WASH indicators, districts/centers/children (contextual), users/roles, settings (devices/sync), audit logs, reports.

---

## 3. Technology stack

| Layer | Choice |
|---|---|
| UI | React 19, TypeScript 6 |
| Build | Vite 8 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 |
| Data (server) | Axios + TanStack Query 5 + Orval-generated clients |
| Data (offline) | Dexie 4 / IndexedDB |
| Charts | Recharts 3 |
| Icons | Lucide React |
| PWA | `vite-plugin-pwa` (app shell only; **no** `/api/**` cache) |
| Tests | Vitest |

Backend (separate repo): NestJS REST, JWT, device registration, sync push/pull, optimistic lock (`version`).

---

## 4. Environment and run modes

| Variable | Values | Meaning |
|---|---|---|
| `VITE_API_MODE` | `mock` (default) \| `live` | Mock uses in-memory UI data. Live uses Nest at `VITE_API_BASE_URL`. |
| `VITE_API_BASE_URL` | URL, no trailing slash | Default `http://localhost:3000`. Production live builds **must not** point at localhost. |

Defined in `src/config/env.ts`.

```bash
npm install
npm run dev          # local SPA
npm run build        # typecheck + production bundle
npm run test         # Vitest
npm run lint         # ESLint (generated Orval files may report noise)
```

OpenAPI:

```bash
npm run api:sync-openapi   # pull spec into openapi/openapi.json
npm run api:generate       # regenerate src/api/generated/ — do not edit by hand
```

---

## 5. Authentication and roles

- Login: JWT access + refresh tokens in `localStorage` (`src/api/token-storage.ts`).
- Requests send `Authorization: Bearer` and `x-device-id`.
- Refresh is queued in `src/api/interceptors.ts`.

| Backend role | UI role | Home path |
|---|---|---|
| `caregiver` | `caretaker` | `/caretaker` |
| `district_focal_person` | `districtOfficer` | `/district` |
| `ncda_admin` | `ncda` | `/ncda/dashboard` |

Unknown roles **fail closed** (`UnknownUserRoleError`). Mapping: `src/api/roles.ts`.  
Routes are wrapped in `ProtectedRoute` by UI role (`src/App.tsx`).

Caritas is a **training stakeholder**, not an app role.

---

## 6. Frontend architecture (maintainers)

```text
src/
  api/            Axios, Orval, resources, mappers, query keys
  features/       Domain queries/mutations/repositories (children, attendance, …)
  pages/          Route screens by role
  layouts/        Caretaker / District / NCDA shells + navigation
  components/     UI + domain widgets
  locales/rw/     All user-visible strings
  storage/        LocalStore interface + Dexie
  sync/           Outbox engine, push/pull, session poll
  offline/        Device registration, logout policy, UX
  config/         env
  types/          UI domain types
```

**Rule:** React Query is a UI cache, not the durable store. In LIVE caretaker mode, durable truth is IndexedDB (`LocalStore`). See `docs/frontend-api-pattern.md` and `docs/adr-offline-first-foundation.md`.

Domain layout (after Auth + Children):

```text
src/features/{domain}/
  queries.ts
  mutations.ts
  repository.ts
  mappers/
  models/
  utils/
  index.ts
```

Current domains: `auth`, `children`, `attendance`, `growth`, `nutrition`, `feeding`, `sted`, `referrals`, `monitoring`, `reporting`, plus district/NCDA feature folders.

---

## 7. Offline and sync

**Who:** caretaker LIVE only. MOCK never uses LocalStore. District/NCDA are online reads.

**Workspace:** `ecd-offline-u-{userId}` per account. Device UUID is shared. See `docs/adr-offline-user-isolation.md`.

**Offline-capable:** children (create/read; some edits), attendance, nutrition/growth screening, feeding day + month, STED, referrals.

**Online-only:** transfers, monitoring, reporting, WASH, compliance.

**Outbox:** `sync_operations` with stable `clientOperationId`, `dependsOn[]`, statuses `pending | blocked | syncing | applied | conflict | failed`. Push batch max **500**. Pull is cursor-based; cursor advances only after local apply.

**Conflicts:** server wins (CAS `version`). User can acknowledge.

**User-visible save:** local write confirms **Byabitswe kuri iki gikoresho**. Do not claim “saved on server” until sync succeeds.

**Logout with pending ops:**

1. Huza hanyuma usohoke  
2. Bika ku gikoresho  
3. Siba amakuru yo ku gikoresho (confirm)

Full field ops: `docs/offline-operations.md`.

### Sync engine statuses

`IDLE | SYNCING | PENDING | SYNC_ERROR | CONFLICT_PRESENT | AUTH_REQUIRED | OFFLINE | SERVER_UNAVAILABLE | DEVICE_BLOCKED | DEVICE_PENDING`

Heartbeats: 3s healthy, 1.5s retry, 8s server backoff (`src/sync/sync-types.ts`).

---

## 8. API contract

- OpenAPI 1.0 in `openapi/openapi.json`.
- Success bodies are bare DTOs. Errors: `{ success, statusCode, message, timestamp }` (+ `entity` / `currentVersion` on lock conflicts).
- Lists: offset pagination (`items`, `page`, `pageSize`, `total`, `totalPages`).
- Sync pull: cursor pagination.

Wrappers: `src/api/resources/`. Generated clients: `src/api/generated/`.

Honesty rule in LIVE: if an endpoint does not exist, UI shows **Ntabwo biboneka kuri murongo** — never silent mock data.

---

## 9. Security notes

- Tokens in localStorage (session), not in domain IndexedDB tables.
- Passwords / reset tokens never stored in LocalStore.
- Service worker must not cache authenticated API responses.
- IndexedDB at rest is not encrypted (post-pilot item).
- Pilot policy: one primary user per tablet, device PIN, no shared browser profiles, disable account on lost device.

---

## 10. Testing and quality

```bash
npm run test          # unit / contract tests (Vitest)
npm run test:watch
```

Contract tests live next to features (`*.contract.test.ts`, `*.test.ts`) and encode role boundaries, pagination, and “no mock in live” rules. Treat them as executable documentation of API usage.

---

## 11. Known product limits (honest)

- Facility **type** (day-care / model / school / community / home-based) and **accreditation year** are not first-class center fields.
- Compliance uses four **domains** (WASH, safety, nutrition, learning_environment), not the four scored PDF inspection tools.
- NCDA national compliance/WASH **aggregates** are not computed in the browser; UI states when the API is missing.
- Growth Form VII UI collects weight + MUAC; height (`tuyaze`) is on the type only.
- File export of reports is not a live endpoint.
- ArcGIS mapping-system integration is not implemented.

---

## 12. Where to change what

| Need | Start here |
|---|---|
| New caretaker field | `src/types/index.ts` + feature + locale + OpenAPI (backend first) |
| New API | Update OpenAPI → `npm run api:generate` → resource + mapper |
| New NCDA page | `src/layouts/ncda/navigation.ts` + `src/App.tsx` + `src/pages/ncda/` |
| Sync entity | `src/storage/types.ts` `SyncableEntityType` + engine mappers |
| Copy / labels | `src/locales/rw/` only |
