# Sprint 5.5 — NCDA Admin Architecture & Capability Audit

**Date:** 2026-08-11  
**Phase:** Architecture / Capability Audit (Phase 0)  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Continues from:** Sprint 5.4C District Production Freeze  
**Implementation performed:** **NO**

---

## 1. Executive verdict

```text
READY WITH CONTRACT GAPS
```

NCDA Admin can begin a **deliberate, phased frontend build** against a largely capable NestJS `/api/v1` surface. Backend already treats `ncda_admin` as **national scope** (`centerIds: 'all'`, unrestricted district/center access). District LIVE (React Query → resources → Orval → REST) is a **frozen baseline** and must not be redesigned.

What blocks a correct NCDA product today is **not** “missing dashboards.” It is:

1. **Frontend role collapse** — `ncda_admin` → `districtOfficer` → `/district/*` (still true after 5.1–5.4).
2. **No NCDA portal shell** — no UI role, login path, layout, routes, or feature module.
3. **National-scale usage risk** — several monitoring/report paths still load large center sets or unbounded assessment rows when scope is national without filters (Sprint 5.4B fixed N+1 fan-out; it did **not** remove all national-scan patterns).
4. **Selected contract gaps** — no file exports; no national device/sync admin APIs; no `districtId` on some operational lists; settings require per-district `districtId`; peer `ncda_admin` provisioning unreachable via API; no create-district/create-center REST.

```text
District architecture freeze: PRESERVED (this sprint changes docs only)
Caregiver offline architecture: UNTOUCHED
```

---

## 2. Current NCDA role behavior

### 2.1 Roles that actually exist

| Name | Backend (`UserRole`) | Frontend UI | Notes |
|------|----------------------|-------------|-------|
| `caregiver` | Yes | `caretaker` | Offline-first portal |
| `district_focal_person` | Yes | `districtOfficer` | District portal |
| `ncda_admin` | Yes | **collapsed → `districtOfficer`** | No distinct portal |
| `super_admin` | **No** | Throws `UnknownUserRoleError` | Fail-closed in FE tests |
| `District_Inspector` | **No** | Absent | Not in Prisma / OpenAPI |
| `DHI` | **No** | Absent | Not in Prisma / OpenAPI |
| `CAU` | **No** | Absent | Not in Prisma / OpenAPI |
| `caretaker` | Alias only on FE | UI role for caregiver | Not a backend enum value |

Prisma evidence (`ECD Backend/prisma/schema.prisma`):

```text
enum UserRole { caregiver | district_focal_person | ncda_admin }
```

**Product decision:** Do not invent `super_admin` / inspector / DHI / CAU portals in Sprint 5.5 unless product explicitly expands the backend role model.

### 2.2 Exact flow today (evidence-based)

```text
JWT /auth/login or /auth/me
    ↓  role: "ncda_admin" (backend truth)
mapAuthUserToViewModel → normalizeRole()
    ↓  src/api/roles.ts
API_TO_UI_ROLE.ncda_admin = "districtOfficer"
    ↓
UI user.role = "districtOfficer"
    ↓
Login via /login/district succeeds (expectedRole = districtOfficer)
    ↓
homePathForRole → /district
    ↓
ProtectedRoute allowedRole="districtOfficer" → PASS
    ↓
DistrictLayout + all /district/* pages
    ↓
API calls with Bearer JWT still carry role=ncda_admin
    ↓
Backend resolveScope → { centerIds: 'all', districtId: null }
```

**Confirmed collapse (still true post–5.4):**

```19:29:src/api/roles.ts
const API_TO_UI_ROLE: Record<BackendUserRole, UiUserRole> = {
  caregiver: 'caretaker',
  district_focal_person: 'districtOfficer',
  ncda_admin: 'districtOfficer',
}
const UI_TO_API_ROLE: Record<UiUserRole, BackendUserRole> = {
  caretaker: 'caregiver',
  districtOfficer: 'district_focal_person',
}
```

Implications:

| Concern | Current behavior |
|---------|------------------|
| Route selection | NCDA lands on District portal only |
| Layout | `DistrictLayout` (NCDA logo asset, district nav IA) |
| Permissions (FE) | Identical to district officer |
| Outbound denormalize | `districtOfficer` → `district_focal_person` — **NCDA identity lost** if any UI code sends role via denormalize |
| Data scope (BE) | National — Sprint 5.4C smoked ~39,445 centers as `ncda_admin` |
| UX honesty | UI presents district chrome while API returns national aggregates |

**Do not fix in this sprint.** Document only.

### 2.3 Authorization layers

| Layer | Mechanism | Classification |
|-------|-----------|----------------|
| Frontend routes | `ProtectedRoute` + UI role | **FRONTEND CONTROL** (UX only) |
| Frontend login expectedRole | Client check after normalize | **FRONTEND CONTROL** |
| Backend JWT + `RolesGuard` | Global APP_GUARD | **BACKEND ENFORCED** |
| Backend `@Roles(...)` | Per-controller/method | **BACKEND ENFORCED** |
| Backend scope | `resolveScope` / `resolveDistrictQueryScope` / `assertCenterAccess` | **BACKEND ENFORCED** |

Frontend must never be treated as the security boundary.

---

## 3. Proposed NCDA Admin responsibility model

### 3.1 Ownership boundaries

| Portal | Owns | Does not own |
|--------|------|--------------|
| **Caregiver** | Center operational capture; offline LocalStore; SyncEngine; outbox/CAS | National/district aggregates; user admin; audit browser |
| **District** | District-scoped monitoring, children/centers browse, reports KPIs, follow-up within district; online-only | National fleet; peer NCDA users; national audit without district actor filter; caregiver offline stack |
| **NCDA Admin** | National oversight; org browse (districts/centers); user provisioning for DFP/caregivers; governance (audit/compliance/WASH); district-filtered programme monitoring; settings per district | Day-to-day attendance/nutrition recording; caregiver sync client; District LocalStore; fake CSV/PDF exports |

### 3.2 Scope model (policy from code — not invented)

| Scope question | Backend today | Classification |
|----------------|---------------|----------------|
| National (all centers) | `ncda_admin` → `centerIds: 'all'` | **SUPPORTED** |
| Optional district filter | Monitoring/reports/analytics accept `districtId` for NCDA | **SUPPORTED** |
| Multi-district set | No multi-select scope object; filter one district or all | **PARTIALLY SUPPORTED** — **PRODUCT DECISION REQUIRED** if multi-select is needed |
| Center filter | Most list/monitoring endpoints accept `centerId` | **SUPPORTED** |
| Account binding | `ncda_admin` must have **null** `districtId`/`centerId` on create | **SUPPORTED** |
| “NCDA = all data always” | APIs allow national default; product should **prefer district filters** at UI for scale | **PRODUCT DECISION REQUIRED** (UX policy, not auth gap) |

---

## 4. District vs NCDA comparison

| Capability | District | NCDA Admin | Shared Backend? | Different Scope? |
|------------|----------|------------|-----------------|------------------|
| Dashboard | LIVE `GET /analytics/dashboard` | Same endpoint; needs national IA + filters | Yes | Yes — district forced vs optional/`all` |
| Centers | LIVE list/detail; PATCH allowed for DFP | Same; national list + district filter | Yes | Yes |
| Children | LIVE list/detail (read) | Oversight read; CRUD not primary | Yes | Yes — NCDA national; **no `districtId` query** |
| Attendance | Monitoring LIVE | Monitoring + optional district filter | Yes | Yes |
| Growth / Nutrition | Monitoring + screenings LIVE | Same contracts | Yes | Yes |
| Feeding | Monitoring LIVE | Same | Yes | Yes |
| STED | Monitoring LIVE | Same; **national assessment load risk** | Yes | Yes |
| Referrals | Monitoring + list LIVE | Same; **no `districtId` on list** | Yes | Yes |
| Gukurikirana | `GET /alerts/follow-up` LIVE | Same; soft-capped nationally | Yes | Yes |
| Compliance | **No FE** | Should own national/district browse | Yes | Yes |
| WASH | **No FE** | Should own national/district browse | Yes | Yes |
| Users | **No FE** (DFP+NCDA API) | **Primary NCDA responsibility** | Yes | Yes — DFP district-only vs NCDA national |
| Audit Logs | **No FE** | **Primary NCDA responsibility** | Yes | Yes — DFP by actor district; NCDA unscoped |
| Devices | Register + my-devices only | **No fleet API** | Personal only | N/A — gap for NCDA ops |
| Sync | Caregiver engine | Session by id only; **no ops console** | Sync APIs exist | Gap for admin monitoring |
| Reports | LIVE KPI reports | Same; prefer district filter | Yes | Yes |
| Exports | MOCK toast / LIVE unavailable | Same — **no backend export** | No real export | N/A |
| GIS | District map (mock centers historically) | Not first NCDA phase | Partial | Defer |
| Settings | District page MOCK/LIVE unavailable | API exists; **NCDA must pass `districtId`** | Yes | Yes |
| Org create (district/center) | No REST create | No REST create | — | **BACKEND GAP** if required |

**Principle:** NCDA Admin is **not** a fork of District pages with a different CSS theme. It shares contracts where appropriate and owns administration + governance surfaces District never built.

---

## 5. Backend capability inventory

Global prefix: `/api/v1`. Auth: JWT + global `RolesGuard`. Scope primitives: `SyncAccessService.resolveScope`, `resolveDistrictQueryScope`, `canAccessCenter` / `canAccessDistrict`.

### 5.1 Cross-cutting national scope

```32:35:D:\Esri\ECD Backend\src\modules\sync\sync-access.service.ts
if (user.role === UserRole.ncda_admin) {
  return { centerIds: 'all', districtId: null };
}
```

`resolveDistrictQueryScope` (`common/scope/district-query.scope.ts`): NCDA may pass optional `districtId` / `centerId` / `sectorId`; omit → national `'all'`.

### 5.2 Endpoint matrix (NCDA-relevant)

Classification: **READY** | **READY BUT NEEDS FRONTEND** | **INSUFFICIENT CONTRACT** | **BACKEND GAP** | **NOT AN NCDA ADMIN RESPONSIBILITY**

| Capability | Method / Route | Controller | Auth | Scope | Pagination | Filters | Class |
|------------|----------------|------------|------|-------|------------|---------|-------|
| Login / me | `POST /auth/login`, `GET /auth/me`, refresh, password-reset | auth | Public / JWT | N/A | N/A | — | READY |
| Users list | `GET /users` | users | DFP, ncda | NCDA national; DFP forced district | page/pageSize ≤100 | role, status, districtId, centerId, search | READY BUT NEEDS FRONTEND |
| User detail | `GET /users/:id` | users | DFP, ncda | Visibility rules | — | — | READY BUT NEEDS FRONTEND |
| Create user | `POST /users` | users | DFP, ncda | Role matrix + scope | — | role, districtId, centerId | READY BUT NEEDS FRONTEND |
| Update user | `PATCH /users/:id` | users | DFP, ncda | fullName, phone, status only | — | **no role/scope change** | READY BUT NEEDS FRONTEND |
| Reset password | `POST /users/:id/reset-password` | users | DFP, ncda | NCDA any; DFP caregivers in district | — | optional newPassword | READY BUT NEEDS FRONTEND |
| Districts | `GET /districts` | geo | all 3 | NCDA all (paginated); DFP own | Yes | search | READY BUT NEEDS FRONTEND |
| Admin units | `GET /admin-units` | geo | all 3 | NCDA can omit → full table | **No** | districtId, parentId, level | INSUFFICIENT CONTRACT (pagination) |
| Centers by district | `GET /districts/:id/centers` | geo | DFP, ncda | assertDistrictAccess | Yes | — | READY BUT NEEDS FRONTEND |
| Centers list | `GET /centers` | centers | all 3 | NCDA optional districtId | Yes | districtId, status, search | READY |
| Center detail | `GET /centers/:id` | centers | all 3 | assertCenterAccess | — | — | READY |
| Center update | `PATCH /centers/:id` | centers | DFP, ncda | assertCenterAccess + version | — | UpdateCenterDto | READY BUT NEEDS FRONTEND (admin ops) |
| Create center/district | — | — | — | — | — | — | **BACKEND GAP** |
| Children | `GET/POST/PATCH… /children` | children | all 3 | resolveScope | Yes | centerId, status, search — **no districtId** | INSUFFICIENT CONTRACT (district filter); CRUD mostly NOT NCDA day-to-day |
| Attendance list | `GET /attendance` | attendance | all 3 | resolveScope | Yes ≤200 | centerId, childId, dates | READY (read oversight) |
| Nutrition screenings | `GET /nutrition/screenings` | nutrition | all 3 | resolveScope | Yes ≤200 | centerId, childId, from/to, status | READY (Sprint 5.3) |
| Nutrition alerts | `GET /nutrition/alerts` | nutrition | all 3 | resolveScope + districtId | soft take 2000 | districtId, centerId, date, status | INSUFFICIENT CONTRACT (pagination) |
| Feeding | center-scoped GET/POST | feeding | all 3 | center | Yes | centerId path | NOT primary NCDA (use monitoring) |
| STED history | child-scoped | sted | all 3 | — | Yes | — | NOT primary (use monitoring) |
| Referrals list | `GET /referrals` | referrals | all 3 | resolveScope | Yes | status, sourceType, centerId, childId, from/to — **no districtId** | INSUFFICIENT CONTRACT |
| Follow-up alerts | `GET /alerts/follow-up` | alerts | all 3 | NCDA all if unfiltered | soft limit ≤200 (scan cap 2000) | districtId, centerId, category, limit | READY BUT NEEDS FRONTEND |
| Monitoring * | `GET /monitoring/{attendance,nutrition,feeding,sted,referrals}` | monitoring | all 3 | resolveDistrictQueryScope | in-memory page after center load | districtId, centerId, sectorId, from/to | READY (scale caveats) |
| Dashboard | `GET /analytics/dashboard` | analytics | all 3 | NCDA national OK | aggregate object | from, to, districtId, centerId | READY |
| Reports | `GET /reports/{enrollment,dropouts,centers,district}` | reports | DFP, ncda | resolveDistrictQueryScope | mixed | MonitoringQueryDto | READY (centers report scale caveat) |
| Compliance | CRUD-ish assessments + standards | compliance | list all 3; mutate DFP/ncda | district/center | Yes | centerId, districtId, status, from/to | READY BUT NEEDS FRONTEND |
| WASH | indicators CRUD | wash | list all 3; mutate DFP/ncda | district/center | Yes | centerId, districtId, from/to | READY BUT NEEDS FRONTEND |
| Audit logs | `GET /audit-logs` | audit-logs | DFP, ncda | DFP by actor district; NCDA open | Yes | entityType, entityId, action, userId, from, to — **no district/center entity filter** | READY BUT NEEDS FRONTEND |
| Settings | `GET/PATCH /settings` | settings | DFP, ncda | **NCDA requires districtId** | per-district key list | districtId | READY BUT NEEDS FRONTEND |
| Devices | `POST /devices/register`, `GET /devices/my-devices` | devices | any auth | **caller only** | unbounded per user | — | NOT AN NCDA ADMIN RESPONSIBILITY / **BACKEND GAP** for fleet |
| Sync | push/pull/session | sync | any auth | resolveScope | pull cursor | — | NOT AN NCDA ADMIN RESPONSIBILITY / **BACKEND GAP** for ops health |
| Transfers | lifecycle | transfers | all 3 | resolveScope | Yes | — | Oversight optional; not core NCDA |
| File exports | — | — | — | — | — | — | **BACKEND GAP** |

### 5.3 User administration detail

| Concern | Status |
|---------|--------|
| List / detail / create / update status / reset password | Exists and authorized |
| Activate/deactivate | Via `PATCH` `status: ACTIVE \| SUSPENDED` |
| Role assignment on update | **Not supported** (DTO forbids) — good anti-escalation |
| Create `ncda_admin` via API | **Blocked** — `canCreateRole` only allows DFP + caregiver for NCDA actors |
| Scope assignment | On create only (`resolveScopeForRole`) |
| Self-modification | Not specially blocked in service — **flag** for product/security review |
| Temp password return | Create/reset may return `temporaryPassword` in response — treat as sensitive in UI |
| Frontend consumer | **None** |

### 5.4 Audit logs detail

| Field | Support |
|-------|---------|
| Model | `AuditLog`: entityType, entityId, action, changedById, changedAt, old/new Values, metadata |
| Actions | Prisma `create \| update \| delete` only |
| Filters | entityType, entityId, action, userId, from, to, page |
| District/center filters | **Absent** (DFP scoped by **actor’s** districtId, not entity geography) |
| Safe for NCDA consume? | **Yes** if UI always filters (date/actor/entity) and never dumps national unfiltered pages as primary UX |

### 5.5 Compliance + WASH

| Domain | List | Detail | History | Filters | NCDA readiness |
|--------|------|--------|---------|---------|----------------|
| Compliance | Paginated | Yes + items | Via assessments | center, district, status, dates | **NCDA-ready** (FE missing) |
| WASH | Paginated | Yes | Via list | center, district, dates | **NCDA-ready** (FE missing) |

Not District-wired today. Do not force into District freeze work.

### 5.6 Devices + sync

| Need | Backend support |
|------|-----------------|
| Device health fleet | **Missing** — only register + my-devices |
| Sync health / failed / stuck sessions | Models exist (`SyncSession`, `SyncOperation`, retry fields); **no admin list API** |
| Session by id | `GET /sync/sessions/:sessionId` for authenticated caller |

**Recommendation:** Defer NCDA Operations console until admin APIs exist; do not hack caregiver sync endpoints into an admin UI.

### 5.7 Reporting vs exports

| Kind | Examples | Export file? |
|------|----------|--------------|
| Dashboard aggregates | `/analytics/dashboard` | No |
| Operational lists | children, referrals, screenings | No |
| Reports (JSON KPIs) | `/reports/*` | No |
| Exports (CSV/PDF) | — | **None** — District LIVE correctly shows unavailable |

Do not build fake client-side “exports” for NCDA.

---

## 6. Frontend architecture proposal

### 6.1 Current state (post–5.4)

| Area | State |
|------|-------|
| District LIVE stack | Frozen: pages → `features/district/*` hooks → React Query → `api/resources/*` → Orval → Nest |
| Query keys | `queryKeys.district.*` for online admin reads |
| Resources with wrappers | auth, children, attendance, growth, nutrition, feeding, sted, referrals, monitoring, reporting, centers, alerts |
| Generated-only (no wrapper / no page) | users, audit-logs, compliance, wash, settings, geo admin reads, devices list |
| Layouts | `CaretakerLayout`, `DistrictLayout` only |
| Routes | `/caretaker/*`, `/district/*` only |
| Mock | `VITE_API_MODE=mock\|live`; no LIVE→mock fallback (District principle) |

### 6.2 Recommended NCDA structure (do not implement yet)

```text
NCDA Admin Page
    ↓
features/ncda/* hooks (or features/admin/*)
    ↓
React Query (queryKeys.national.* / queryKeys.ncda.*)
    ↓
shared api/resources/* wrappers (new thin wrappers where missing)
    ↓
Orval generated clients
    ↓
NestJS REST
```

| Artifact | Recommendation |
|----------|----------------|
| UI role | Add `ncdaAdmin`; map `ncda_admin → ncdaAdmin` (**stop collapse**) |
| Routes | `ProtectedRoute allowedRole="ncdaAdmin"` → `/admin/*` |
| Layout | `NCDAAdminLayout` + sidebar — **parallel** to District, not shared permanently |
| Login | `/login/admin` + role card |
| Features | `src/features/ncda/{users,audit,org,dashboard,governance,…}` |
| Resources | Add `users.ts`, `audit-logs.ts`, `geo.ts`, `settings.ts`, `compliance.ts`, `wash.ts` wrappers |
| Query keys | New `national`/`ncda` root — **do not share** `district.*` caches (scope mismatch) |
| HTTP client | **One** Axios/Orval stack — no second client |
| District code | Reuse resource functions optionally; **do not** route NCDA through District pages long-term |
| Caregiver | Untouched offline stack |

### 6.3 Proposed navigation (from responsibilities + APIs)

```text
NCDA ADMIN
│
├── Overview
│   └── National dashboard (analytics + optional district filter)
│
├── Organization
│   ├── Districts          → GET /districts
│   └── Centers            → GET /centers (+ district filter)
│
├── Programmes (district-filtered by default at national scale)
│   ├── Attendance         → /monitoring/attendance
│   ├── Nutrition / Growth → /monitoring/nutrition + screenings
│   ├── Feeding            → /monitoring/feeding
│   ├── STED               → /monitoring/sted (scale caution)
│   ├── Referrals          → /monitoring/referrals + /referrals
│   └── Alerts             → /alerts/follow-up
│
├── Administration
│   ├── Users              → /users/*
│   └── Settings           → /settings?districtId=…
│
├── Governance
│   ├── Audit logs         → /audit-logs
│   ├── Compliance         → /compliance/*
│   └── WASH               → /wash/*
│
├── Reports
│   └── Enrollment / dropouts / district / centers (JSON reports only)
│
└── Operations (phase later — needs backend)
    ├── Devices (fleet)    → BACKEND GAP
    └── Sync health        → BACKEND GAP
```

**Explicitly lower priority / non-goals for first phases:** GIS, file exports, caregiver sync engine, District redesign, multi-role invent (`DHI`, etc.).

### 6.4 Mock mode

| Mode | NCDA expectation |
|------|------------------|
| `mock` | Explicit demo NCDA user + fixtures; no silent LIVE fallback |
| `live` | Truthful API errors/empty states |

Same principle as District:

```text
MOCK is explicit. LIVE is truthful.
```

---

## 7. Security findings

| Risk | Finding | Class |
|------|---------|-------|
| Role spoofing via FE | UI role is display/routing only; JWT role is authoritative | FRONTEND CONTROL + BACKEND ENFORCED |
| NCDA collapsed to district | NCDA users browse District UX; data still national | FRONTEND CONTROL defect (product) |
| Route protection | Hiding `/admin` does not protect APIs | FRONTEND CONTROL |
| Scope escalation (users create) | `assertDistrictAccess` / center checks + role matrix | BACKEND ENFORCED |
| Role escalation on update | Role not in UpdateUserDto | BACKEND ENFORCED |
| Create peer ncda_admin | Denied in `canCreateRole` | BACKEND ENFORCED (also ops gap) |
| Password reset breadth | NCDA can reset any visible user | BACKEND ENFORCED — **review UX/abuse** |
| Self suspend / self reset | No dedicated guard found in users.service | **MISSING BACKEND ENFORCEMENT** (flag) |
| IDOR centers/children | assertCenterAccess / resolveScope | BACKEND ENFORCED |
| Audit log access | DFP/ncda only | BACKEND ENFORCED |
| Device fleet | No admin API → cannot over-expose via FE | N/A / GAP |
| Sync write as NCDA | `authorizeSyncWrite` always allows NCDA | BACKEND ENFORCED — powerful; keep NCDA offline sync UI out of scope |
| Temporary passwords in API responses | Returned to caller | Flag for FE handling + transport HTTPS only |
| JWT in localStorage | Known District condition | FRONTEND CONTROL residual |

---

## 8. National-scale performance findings

Context: Sprint 5.4B/C verified NCDA monitoring under ≈39,445 centers after removing per-center N+1 `count` fan-out. Remaining risks:

| Surface | Pattern | Classification |
|---------|---------|----------------|
| `GET /analytics/dashboard` | Aggregated counts | **SAFE** (heavy but aggregate) |
| `GET /reports/district` | KPI aggregate | **SAFE** |
| `GET /reports/enrollment` | Counts + trend `take: 10000` | **SAFE** with soft cap |
| `GET /reports/dropouts` | Paginated archived | **SAFE** |
| `GET /reports/centers` | Loads **all centers in scope** then in-memory page | **NEEDS PAGINATION** |
| `GET /monitoring/*` summaries | groupBy / SQL aggregates | **SAFE** (post-5.4B) for many paths |
| `monitoring.loadCenters('all')` | `ecdCenter.findMany` all centers for per-center tables | **NEEDS PAGINATION** |
| `GET /monitoring/sted` | Unbounded `stedAssessment.findMany` then JS aggregate | **NEEDS AGGREGATION** |
| `GET /alerts/follow-up` | Scans up to 2000 children then slice | **NEEDS AGGREGATION** / soft incompleteness |
| `GET /nutrition/alerts` | Soft `take: 2000` | **NEEDS PAGINATION** |
| `GET /admin-units` | Unbounded array | **NEEDS PAGINATION** |
| `GET /centers`, `/users`, compliance, wash | Paginated | **SAFE** |
| Client-side national aggregation in FE | Must not reintroduce | **N+1 RISK** if District pages reused without district filter |

**NCDA UI rule (architectural):** At national scope, prefer **aggregates + mandatory district (or sector) filter** before rendering per-center tables. Do not treat “pageSize=20” as safe if the server still loads 39k centers to build the page.

---

## 9. Contract gaps (prioritized)

### P0 — blocks safe core NCDA Admin

| ID | Gap | Why P0 |
|----|-----|--------|
| P0.1 | Frontend `ncda_admin` → `districtOfficer` collapse | No authentic NCDA portal; identity loss on denormalize; wrong IA |
| P0.2 | No NCDA routes/layout/role guard | Cannot ship NCDA responsibilities without shell |
| P0.3 | National monitoring/report center tables without DB pagination / forced filters | Unsafe default UX at 39k centers (loadCenters / reports.centers / STED findMany) |

### P1 — important, not fundamental blockers for shell + users

| ID | Gap |
|----|-----|
| P1.1 | No FE for users / audit / compliance / WASH / geo districts / settings |
| P1.2 | Children + referrals lists lack `districtId` filter |
| P1.3 | Nutrition alerts + follow-up lack true pagination / completeness guarantees |
| P1.4 | Audit logs lack district/center **entity** filters |
| P1.5 | Settings has no national defaults (districtId required) |
| P1.6 | Cannot provision peer `ncda_admin` via API (ops/bootstrap only) |
| P1.7 | No create district / create center REST if org onboarding is in-product |

### P2 — enhancements

| ID | Gap |
|----|-----|
| P2.1 | Device fleet + sync health admin APIs |
| P2.2 | File exports (CSV/PDF) |
| P2.3 | Dedicated district-comparison analytics endpoint |
| P2.4 | Multi-district scope selection |
| P2.5 | GIS national layer |
| P2.6 | Self-modification guards on users |
| P2.7 | Admin-units pagination |
| P2.8 | Expand roles (inspector/DHI/CAU) — **product expansion**, not assumed |

---

## 10. Recommended implementation sequence

Ordered by **auth boundary → safe reads → administration → governance → scale hardening → deferred ops**. Backend contract work stays separable from FE.

```text
5.5A — NCDA auth boundary + role un-collapse
        FE: UiUserRole ncdaAdmin; normalizeRole; login/admin; ProtectedRoute
        Tests: denormalize, home path, fail-closed unknowns
        DO NOT change District freeze paths for focal persons

5.5B — NCDA Admin shell
        FE: NCDAAdminLayout, sidebar, /admin routes, mock NCDA user
        National queryKeys namespace; no District cache sharing

5.5C — User administration
        FE: resources/users + features/ncda/users
        BE: none required for MVP (existing matrix)
        Optional BE follow-up: self-guard; peer ncda create (product)

5.5D — Organization browse
        FE: districts + centers (filters, pagination honesty)
        BE: only if product requires create district/center

5.5E — National overview dashboard
        FE: /analytics/dashboard with explicit district filter UX
        Policy: unfiltered national OK for KPI cards; not for center grids

5.5F — Programme monitoring (reuse contracts, NCDA pages)
        FE: thin NCDA pages calling monitoring/reporting resources
        BE (parallel): STED aggregation; DB pagination for center breakdowns;
             discourage unfiltered national center tables

5.5G — Governance
        FE: audit logs, compliance, WASH
        BE optional: audit district/center entity filters

5.5H — Settings (per district)
        FE: always pass districtId for NCDA

5.5I — Operations (only after BE)
        BE first: device fleet + sync session admin list/filters
        FE second

5.5J — Reports honesty + production gate
        JSON reports only; exports remain unavailable until BE exists
        LIVE smoke as ncda_admin on /admin (not /district)
        National-scale performance checklist
```

**Why not “dashboard first”?** Without role separation and shell, any dashboard work re-entrenches District collapse. Without scale policy, NCDA will accidentally call the same unsafe unfiltered patterns District smoke hit before 5.4B.

---

## 11. Explicit non-goals (first NCDA phases)

Do **not** include in early NCDA implementation:

- Redesigning District data/React Query architecture
- Merging Caregiver LocalStore / SyncEngine / outbox into NCDA
- GIS as an NCDA launch requirement
- Fake CSV/PDF exports
- Device/sync ops console before admin APIs
- Inventing `super_admin` / `DHI` / `CAU` / `District_Inspector` without Prisma role expansion
- Using District pages as the permanent NCDA UX
- LIVE → mock fallbacks
- Prisma schema drive-by changes unrelated to proven P0/P1 contracts
- Client-side aggregation of all national rows

---

## 12. API contract matrix (summary)

| Capability | Existing Endpoint | Auth | Scope | Pagination | Filters | Sufficient? | Frontend Work | Backend Gap |
|------------|-------------------|------|-------|------------|---------|-------------|---------------|-------------|
| Dashboard | `GET /analytics/dashboard` | all 3 | NCDA national / optional district | Aggregate | from,to,districtId,centerId | Yes for KPIs | NCDA page + filters | District-comparison optional |
| Districts | `GET /districts` | all 3 | NCDA all | Yes | search | Yes | Org UI | Create district |
| Centers | `GET/PATCH /centers` | list all; patch DFP/ncda | NCDA optional district | Yes | districtId,status,search | Yes for browse | Org UI | Create center |
| Users | `GET/POST/PATCH /users`, reset | DFP,ncda | National vs district | Yes | role,status,district,center,search | Yes for MVP admin | Full admin UI | Peer ncda create; role change policy |
| Audit Logs | `GET /audit-logs` | DFP,ncda | NCDA open | Yes | entity,actor,action,dates | Partial | Viewer UI | district/center entity filters |
| Compliance | `/compliance/*` | list all; mutate DFP/ncda | district/center | Yes | district,center,status,dates | Yes | Governance UI | — |
| WASH | `/wash/*` | list all; mutate DFP/ncda | district/center | Yes | district,center,dates | Yes | Governance UI | — |
| Devices | register + my-devices | any | self | N/A | — | **No** for NCDA ops | Defer | Fleet admin API |
| Sync | push/pull/session | any | resolveScope | pull cursor | — | **No** for NCDA ops | Defer | Admin session/ops API |
| Reports | `/reports/*` | DFP,ncda | query scope | mixed | MonitoringQueryDto | Yes for JSON | NCDA reports | DB page centers report |
| Exports | — | — | — | — | — | **No** | Honest unavailable | Export pipeline |

---

## 13. Evidence anchors (re-audit vs Sprint 5.0)

| Sprint 5.0 claim | Still true after 5.1–5.4? |
|------------------|---------------------------|
| No NCDA portal | **YES** |
| `ncda_admin` → `districtOfficer` | **YES** |
| Backend users/compliance/WASH/audit unused by FE | **YES** |
| District dual-mode / mock follow-up | **NO** — District operational reads largely LIVE (5.2–5.4) |
| Follow-up MOCK-only | **NO** — alerts LIVE |
| Backend “mostly ready, gap is FE” | **MOSTLY YES** — with national-scale + devices/exports/org-create caveats |
| NCDA national dashboard missing | **YES** (FE); BE dashboard endpoint exists and works nationally |

District freeze references: `docs/sprint-5.4c-district-final-production-gate-report.md`.

---

## SPRINT 5.5 STATUS

```text
SPRINT 5.5 STATUS

Phase:
ARCHITECTURE / CAPABILITY AUDIT

Implementation performed:
NO

NCDA role separation verified:
NO

NCDA authorization model:
PARTIAL

NCDA national scope:
READY

NCDA frontend architecture:
GAP

Dashboard contracts:
READY

District/Center management:
PARTIAL

User administration:
READY

Audit logs:
READY

Compliance:
READY

WASH:
READY

Devices:
GAP

Sync operations:
GAP

Reports:
READY

Exports:
GAP

National-scale performance:
CONDITIONS

P0:
P0.1 Frontend ncda_admin→districtOfficer collapse; P0.2 No NCDA shell/routes/UI role; P0.3 Unsafe unfiltered national center-table / STED scan patterns for NCDA defaults

P1:
P1.1 Missing FE for users/audit/compliance/WASH/geo/settings; P1.2 children/referrals lack districtId; P1.3 alerts soft-caps; P1.4 audit lacks entity district/center filters; P1.5 settings requires districtId (no national defaults); P1.6 cannot API-create peer ncda_admin; P1.7 no create district/center REST

P2:
P2.1 device/sync admin APIs; P2.2 file exports; P2.3 district-comparison endpoint; P2.4 multi-district scope; P2.5 GIS; P2.6 user self-modification guards; P2.7 admin-units pagination; P2.8 expanded roles (inspector/DHI/CAU) only if product expands Prisma

Recommended implementation sequence:
5.5A auth/role un-collapse → 5.5B NCDA shell → 5.5C users → 5.5D org browse → 5.5E national dashboard → 5.5F programme monitoring (+ BE scale hardening parallel) → 5.5G governance → 5.5H settings → 5.5I operations (after BE) → 5.5J production gate

District architecture changed:
NO

Caregiver offline architecture changed:
NO

Production code changed:
NO

Next step:
Begin Sprint 5.5A — NCDA auth boundary + role un-collapse (frontend only; preserve District freeze; no backend auth rewrite unless tests prove a gap). Do not build pages until 5.5A/5.5B land.
```
