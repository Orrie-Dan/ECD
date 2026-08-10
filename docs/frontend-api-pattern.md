# Frontend API Pattern (ECD)

Standard for every domain migration after Auth + Children.

Related sprint: **4.5.1 — Frontend API Foundation Hardening**.

---

## 1. Goals

- Typed LIVE API access via Orval + Axios + React Query
- MOCK mode continues to drive the same UI without page awareness
- Stable folder layout, query keys, roles, and errors across domains
- No UI redesign; no backend contract changes during migration

---

## 2. Folder structure

### Infrastructure (`src/api/`)

| Path | Responsibility |
|------|----------------|
| `client.ts` / `interceptors.ts` / `token-storage.ts` | Axios + JWT |
| `errors.ts` | `ApiError` + helpers |
| `roles.ts` | API ↔ UI role normalization |
| `query-keys.ts` | Domain query key factories |
| `query-client.ts` / `providers/` | React Query + toast bridge |
| `generated/` | Orval output — **do not edit** |
| `resources/{domain}.ts` | Thin wrappers over generated clients |
| `mappers/{domain}.mapper.ts` | DTO ↔ view-model mapping |

### Domain feature (`src/features/{domain}/`)

```
src/features/{domain}/
  queries.ts          # useXList / useXDetail
  mutations.ts        # useCreateX / useUpdateX / …
  repository.ts       # optional MOCK/LIVE bridge for DataProvider
  mappers/index.ts    # re-export api/mappers
  models/index.ts     # re-export src/models
  components/         # optional domain-only UI
  index.ts            # public barrel
```

### Shared view models (`src/models/`)

UI-facing types (`ChildViewModel`, `AuthUserViewModel`, …). Components use these (or existing `@/types`), never raw OpenAPI DTOs.

### Reference domains

- Auth → `src/features/auth/`
- Children → `src/features/children/`

---

## 3. API usage rules

1. **Pages / components** import from `@/features/{domain}` or `@/contexts/AppContext` — not from `@/api/generated`.
2. **Feature hooks** call `@/api/resources/{domain}` and map via mappers.
3. **Resources** call generated Orval functions only.
4. **Never** put Axios calls inside page components.
5. Prefer feature `queries.ts` / `mutations.ts` over ad-hoc `useQuery` in pages.

```ts
// ✅
import { useChildDetail } from '@/features/children'

// ❌
import { useChildrenControllerFindOne } from '@/api/generated/endpoints/children/children'
```

---

## 4. Mapper rules

1. Keep OpenAPI DTOs inside `resources` + `mappers`.
2. Export only view models / `@/types` shapes to the UI.
3. LIVE mutations that need optimistic locking must carry `version` on the view model.
4. Re-export mappers from `features/{domain}/mappers` for discoverability; implementation may live in `src/api/mappers/`.
5. Do not reshape UI fields for cosmetics during migration — preserve existing labels and forms.

---

## 5. Role normalization

Backend roles must not appear in components.

| API role | UI role |
|----------|---------|
| `caregiver` | `caretaker` |
| `district_focal_person` | `districtOfficer` |
| `ncda_admin` | `districtOfficer` |

```ts
import { normalizeRole, hasRole, homePathForRole, isCaretaker } from '@/api/roles'

const uiRole = normalizeRole(apiUser.role)

if (hasRole(user, 'caretaker')) { /* … */ }
if (isCaretaker(user)) { /* … */ }

navigate(homePathForRole(user.role))
```

**Forbidden in components:**

```ts
if (role === 'caregiver') { /* … */ }
if (role === 'ncda_admin') { /* … */ }
```

---

## 6. React Query conventions

### Key factories

```ts
import { auth, children, queryKeys, createDomainKeys } from '@/api/query-keys'

auth.keys.me()
children.keys.all()
children.keys.list(filters)
children.keys.detail(id)

// Future domain
export const attendance = { keys: createDomainKeys('attendance') }
```

Rules:

- Never hand-write `['children', …]` in features — use factories.
- Invalidate with `children.keys.lists()` / `children.keys.detail(id)`.
- On logout, remove `auth.keys.all` and domain `*.keys.all`.

### Stale times

Use `queryStaleTimes` from `query-keys.ts`. Override per-hook when needed; do not scatter magic numbers.

### LIVE gating

```ts
enabled: env.isLive && enabled && !!id
```

MOCK mode must leave these hooks idle; repositories / providers supply mock data.

---

## 7. API error standardization

All migrated domains consume `ApiError` via `normalizeApiError`.

Supported cases:

| Case | Detection |
|------|-----------|
| Unauthorized | `isUnauthorized` / `isUnauthorizedError` |
| Forbidden | `isForbidden` / `isForbiddenError` |
| Validation | `isValidationError` (400 / 422) |
| Conflict / version | `isConflict` / `isVersionConflict` |
| Not found | `isNotFound` / `isNotFoundError` |
| Network | `isNetworkError` / `isNetworkFailure` |

Helpers: `getApiErrorKind`, `formatApiErrorMessage`, `shouldToastApiError`.

`ApiErrorBridge` toasts non-auth failures in LIVE mode. Do not duplicate global toasts in every mutation unless the page needs field-level handling.

---

## 8. MOCK / LIVE contract

| Mode | Config | UI behavior |
|------|--------|-------------|
| MOCK | `VITE_API_MODE=mock` (default) | Demo auth + in-memory DataProvider |
| LIVE | `VITE_API_MODE=live` | JWT session + React Query resources |

Rules:

1. Components must not branch on `env.isLive` unless they are providers / repositories.
2. The same screens must work in both modes.
3. Unmigrated domains stay on mock DataProvider paths.
4. Do not remove mocks when migrating a domain — keep the MOCK branch in the repository / AuthProvider.

Verified for Auth + Children:

- Login / logout / session restore
- Children list
- Child detail
- Create / update / archive / reactivate / transfer mutations

---

## 9. Migration checklist (next domain)

Copy Auth/Children; do **not** invent a parallel pattern.

- [ ] Add `src/models/{domain}.ts` view models
- [ ] Add `src/api/mappers/{domain}.mapper.ts`
- [ ] Add `src/api/resources/{domain}.ts` (wrap generated client)
- [ ] Register query keys via `createDomainKeys('{domain}')` in `query-keys.ts`
- [ ] Create `src/features/{domain}/` with `queries.ts`, `mutations.ts`, `mappers/`, `models/`, `index.ts`
- [ ] Optional `repository.ts` if DataProvider still owns the surface
- [ ] Wire pages to feature hooks **or** keep DataProvider façade (no UI redesign)
- [ ] Use `normalizeRole` / `hasRole` — never raw API roles
- [ ] Handle `ApiError` kinds in mutations where UX requires it (esp. 409)
- [ ] Confirm MOCK + LIVE for list, detail, and mutations
- [ ] `npm run build`
- [ ] Do not migrate sibling domains in the same change unless planned

### Domains not yet migrated (do not start here without a sprint)

Centers, Settings, Compliance, Sync, …

**Out of active product scope:** Transfers (partial FE/API may remain; do not block migration, release readiness, or domain completion — revisit only if product scope changes).

Migrated: Auth, Children, Attendance, Growth, Nutrition, Feeding / Imirire, STED, Referrals, Monitoring, Reporting.

### Reporting notes

- Precedence: `/reports/*` for enrollment/dropouts/centers/district; `/monitoring/*` for attendance & nutrition aggregates; operational APIs for caretaker child-level attendance.
- No backend file export (CSV/PDF/XLSX) — UI export remains toast/stub.
- No `/reports/sectors` — product/API gap.
- Do not recalculate monitoring KPIs from operational lists in LIVE district reports.

### Monitoring notes

- Read-model only — no mutations.
- Canonical LIVE KPIs come from monitoring/analytics APIs, not recomputed from operational lists.
- Growth/MUAC district KPIs use **nutrition** monitoring (no growth monitoring endpoint).
- Feeding liters/flour and per-center milk/porridge/balanced days are not on `/monitoring/feeding` — show gap (`—`) in LIVE.
- Child-level tables/alerts/drill-downs remain operational-domain reads.
- Dashboard `newRegistrations` / `dropouts` are not on analytics dashboard — MOCK keeps mock values; LIVE shows `—`.

### Growth ↔ Nutrition overlap

- Backend entity: nutrition screening
- Growth owns measurement UX; Nutrition owns assessment list + alerts
- Shared React Query cache: `nutrition.keys.roster(childIds)`
- MUAC thresholds: `@/lib/nutrition` (single source); `@/lib/nutrition-utils` for UI aggregations
- Referral creation after screening: LIVE → atomic LocalStore transaction with screening CREATE + referral CREATE `dependsOn` screening op (`createScreeningLocalFirst`). MOCK → AppContext → referral repository after assessment succeeds.
- District growth monitoring KPIs: nutrition monitoring read model

### Feeding / Imirire notes

- Distinct from Nutrition (MUAC). Form VI is center-level daily logs + month summaries.
- Day counts (milk/porridge/balanced) are frontend-derived from daily records in MOCK.
- Month summary stores liters / flour / foodSource only (separate API entity).
- District monitoring LIVE uses `/monitoring/feeding` coverage metrics; liters/flour remain a documented gap.

### STED notes

- Distinct from Nutrition and Feeding. Structured developmental assessment (age bands 1–3 / 4–6).
- Age-band, milestone, and default-outcome rules remain frontend-owned (`features/sted/utils`).
- Backend is append-only (create + history + findOne). No update/delete.
- Referral on `outcome.referred`: LIVE → atomic LocalStore + `dependsOn` STED op (`createStedLocalFirst`). MOCK → AppContext → referral repository.
- Center roster uses per-child history fan-out until a center list endpoint exists.
- District STED monitoring LIVE uses `/monitoring/sted`; OYA/referral KPIs not on that endpoint.

### Referral notes

- Workflow domain (not standalone CRUD). Source types: `nutrition` | `sted`.
- LIVE (Sprint 4.8.5): LocalStore-first reads; CREATE + status/notes UPDATE via outbox + CAS `version`.
- Reads: LocalStore → REST seed if empty → LocalStore. Offline empty = honest empty (never MOCK).
- Status transitions: `pending` → `completed` | `cancelled` only (mirrors backend).
- Nutrition/STED referrals: `dependsOn` source operation; standalone create dedupes by `sourceId`.
- Conflict: server wins via pull; no client LWW.
- Gaps unchanged on backend: no get-by-id REST, no Idempotency-Key, no assign/delete; multi-device source races possible.
- District referral monitoring LIVE uses `/monitoring/referrals` for aggregates (online-only).

---

## 10. Commands

```bash
npm run api:sync-openapi   # copy OpenAPI from backend
npm run api:generate       # Orval regenerate
npm run build              # tsc + vite
```

Env:

```bash
VITE_API_MODE=mock|live
VITE_API_BASE_URL=http://localhost:3000
```
