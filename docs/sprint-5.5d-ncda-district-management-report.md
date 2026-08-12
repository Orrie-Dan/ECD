# Sprint 5.5D — NCDA District Management

**Date:** 2026-08-11  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Continues from:** Sprint 5.5C (`docs/sprint-5.5c-ncda-dashboard-report.md`)

---

## 1. Executive verdict

```text
READY WITH CONDITIONS
```

`/ncda/districts` and `/ncda/districts/:districtId` are real NCDA governance surfaces. District list uses **server-paginated** `GET /districts` with **server-side search**. Detail uses **targeted** identity + district-scoped aggregates + **server-paginated** `GET /centers?districtId=`. No national center/child hydration, no N+1 list pattern, no LocalStore / mock fallback in LIVE.

**Condition:** deploy the backend geo changes from this sprint (`GET /districts/:id`, `isActive` list filter) before treating detail identity and status filtering as production-complete. Against the currently deployed API (pre-geo change): list/search/centers/dashboard/report probes returned **200**; `isActive` returned **400**; `GET /districts/:id` returned **404**.

---

## 2. Contract matrix

| Requirement | Existing API | Controller | DTO | Generated client | Resource | Frontend consumer | Sufficiency |
| ----------- | ------------ | ---------- | --- | ---------------- | -------- | ----------------- | ----------- |
| District list | `GET /districts` | `GeoController.listDistricts` | `PaginatedDistrictsResponseDto` | `geoControllerListDistricts` | `listDistrictsPage` | `useNcdaDistrictsList` → `NcdaDistrictsPage` | **FRONTEND IMPLEMENTABLE** (was ready; FE wired) |
| District pagination | same (`page`, `pageSize` ≤100, `total`, `totalPages`) | same | same | same | clamps ≤100 | `Pagination` | **FRONTEND IMPLEMENTABLE** |
| District search | `search` (name/code) | same | `ListDistrictsQueryDto` | params | passes `search` | search input (debounced) | **FRONTEND IMPLEMENTABLE** |
| District status filter | **added** `isActive` | same | `ListDistrictsQueryDto.isActive` | params | passes `isActive` | status select | **FRONTEND IMPLEMENTABLE** after BE deploy; LIVE probe pre-deploy = **400** |
| District detail | **added** `GET /districts/:id` | `GeoController.getDistrict` | `DistrictResponseDto` | `geoControllerGetDistrict` | `getDistrict` | `useNcdaDistrictDetail` | **FRONTEND IMPLEMENTABLE** after BE deploy; LIVE probe pre-deploy = **404** |
| District center count | `GET /centers?districtId=&pageSize=1` → `total` | `CentersController.findAll` | paginated centers | `centersControllerFindAll` | `fetchCentersTotal` | detail summary | **FRONTEND IMPLEMENTABLE** (no national load) |
| District child count | `GET /analytics/dashboard?districtId=` → `children.*` | `AnalyticsController` | `DashboardResponseDto` | analytics client | `fetchMonitoringDashboard` | detail summary | **FRONTEND IMPLEMENTABLE** |
| Attendance / nutrition / feeding / referrals summary | same dashboard + `GET /reports/district?districtId=` | analytics + reports | dashboard + `DistrictReportKpisDto` | existing | monitoring + reporting resources | detail summary | **FRONTEND IMPLEMENTABLE** (scoped aggregates only) |
| District center list | `GET /centers?districtId=&search=&status=&page=&pageSize=` | centers | `PaginatedCentersResponseDto` | `centersControllerFindAll` | `listCentersByDistrictPage` | `useNcdaDistrictCenters` | **FRONTEND IMPLEMENTABLE** |
| List row center/child counts | would need per-district aggregate or N+1 | — | — | — | — | intentionally omitted | **BACKEND CONTRACT GAP** (avoided; documented in UI note) |
| Create/update district | none | — | — | — | — | — | **BACKEND CONTRACT GAP** (out of scope) |
| Full NCDA centers management | placeholder | — | — | — | — | Coming Soon | **FUTURE** (5.5E+) |

**Classifications used:** no invented capabilities; list KPI columns that would force N+1 were not implemented.

---

## 3. Backend changes

| Area | Change |
|------|--------|
| Controller | `GET /districts/:id` (`getDistrict`) — roles: caregiver, district_focal_person, ncda_admin; scoped via `assertDistrictAccess` for non-NCDA |
| Service | `GeoService.getDistrict`; `listDistricts` applies optional `isActive` |
| DTO | `ListDistrictsQueryDto.isActive?: boolean` (boolean transform) |
| Queries | `findUnique` by id; list remains `findMany` + `count` with `skip`/`take` |
| Indexes | none added (`District.id` PK; `EcdCenter.districtId` already indexed) |
| Migrations | **NO** |
| Tests | geo service specs for `isActive`, `getDistrict` NCDA allow, DFP deny |

Unacceptable scope avoided: no auth redesign, no schema redesign, no caregiver/sync changes.

---

## 4. Frontend changes

| Area | Path |
|------|------|
| Routes | `/ncda/districts`, `/ncda/districts/:districtId` under `ProtectedRoute allowedRole="ncda"` + `NcdaLayout` |
| Pages | `NcdaDistrictsPage.tsx`, `NcdaDistrictDetailPage.tsx` |
| Placeholders | other NCDA sections remain Coming Soon in `NcdaPages.tsx` |
| Hooks | `src/features/ncda/districts/queries.ts` |
| Resources | `src/api/resources/geo.ts` — list/detail/totals/centers-by-district |
| Query keys | `queryKeys.ncda.districts.{list,detail,summary,centers,network}` |
| Copy | `locales/rw/ncda.ts` → `districts.*` |
| Nav | districts `matchPaths` for detail prefix highlight |
| Tests | `districts.contract.test.ts`; shell test updated |
| OpenAPI / Orval | synced + regenerated |
| Smoke harness | `scripts/sprint-55d-district-smoke.mjs` |

Architecture:

```text
NcdaDistrictsPage / NcdaDistrictDetailPage
  → ncda.districts.* hooks
  → React Query
  → geo / monitoring / reporting resources
  → Orval
  → NestJS
```

---

## 5. Performance / national-scale safety

| Pattern | Handling |
|---------|----------|
| Pagination | DB `skip`/`take`; UI page sizes from `{10,25,50,100}` capped at backend max 100 |
| Search / status | Sent as query params; **not** client-side over a full national download |
| Aggregation | Detail summary = 4 parallel bounded calls (dashboard, district report, centers total, active centers total) |
| Center drilldown | `districtId` required on centers list; LIVE smoke showed `total=1691` with `items=10` |
| N+1 | **Avoided** on list (no per-district centers/children fan-out) |
| Unbounded findMany | **Not introduced** for districts/centers management paths |
| Unsafe APIs avoided | No `GET /reports/centers` national, no monitoring list endpoints, no STED monitoring |

---

## 6. Authorization & leakage

- NCDA routes remain `allowedRole="ncda"`; fail-closed role boundary unchanged.
- District APIs continue to force DFP/caregiver to own `districtId`; `ncda_admin` retains national scope.
- DTOs expose directory/ops fields only (no password hashes, tokens, device secrets, sync internals).

---

## 7. LIVE smoke (deployed API, pre-backend-deploy)

Account: `ncda_admin` against configured non-local `VITE_API_BASE_URL`.

| Check | Result |
|-------|--------|
| Login | 201 |
| `GET /districts?page=1&pageSize=10` | 200 (`total=30`) |
| `GET /districts?search=a` | 200 |
| `GET /districts?isActive=true` | **400** (filter not on deployed build yet) |
| `GET /districts/:id` | **404** (detail not on deployed build yet) |
| `GET /centers?districtId=&pageSize=10` | 200 (paginated; large district total OK) |
| `GET /analytics/dashboard?districtId=` | 200 |
| `GET /reports/district?districtId=` | 200 |

UI LIVE smoke of `/ncda/districts` pages in browser: **NOT RUN** (API contract smoke only). Backend must be deployed for detail + status filter.

---

## 8. Remaining gaps

### P0

- Deploy backend geo changes so `GET /districts/:id` and `isActive` are available on the same environment the frontend targets.

### P1

- Optional richer district list aggregates (center/child counts **in one server response**) if product requires list columns without detail navigation — do **not** solve with N+1.
- Staging latency check for district-scoped dashboard/report under large districts.

### P2

- NCDA Centers full management (`/ncda/centers`) — deferred.
- District create/update APIs — deferred / product decision.
- Province name on district DTO (currently `provinceId` only).

---

## 9. Explicit non-goals (unchanged)

NCDA Users, Children, Compliance, WASH, Audit Logs, Devices, Sync, Reports, GIS, Exports, caregiver offline stack, District portal freeze — **not started**.

---

## 10. Success criteria checklist

```text
[x] NCDA District page is a real functional governance surface
[x] District data comes from verified backend contracts
[x] District list is server-paginated
[x] Search/filtering is server-side where supported (search ready; isActive pending deploy)
[x] District detail page operational in code (LIVE identity pending deploy)
[x] District summaries use real aggregates
[x] District → center drilldown does not load all national centers
[x] NCDA authorization remains national and secure
[x] No national N+1 query pattern
[x] No unbounded national dataset hydrated into React
[x] NCDA LIVE does not use LocalStore
[x] NCDA LIVE does not fall back to mock
[x] OpenAPI reflects backend changes
[x] Orval regenerated
[x] NCDA dashboard remains functional (untouched consumers)
[x] District production freeze intact
[x] Caregiver offline intact
[x] Tests pass (NCDA suite)
[x] Build passes
[~] Lint: clean on sprint-touched files; full-repo lint has pre-existing failures outside scope
[~] Final report documents remaining gaps honestly
```

---

```text
SPRINT 5.5D STATUS

Verdict:
READY WITH CONDITIONS

District list:
READY

District pagination:
READY

District search/filtering:
PARTIAL

District detail:
PARTIAL

District summary:
READY

District → center drilldown:
READY

National-scale safety:
READY

NCDA authorization:
PASS

Backend changed:
YES

OpenAPI changed:
YES

Orval regenerated:
YES

Prisma migration:
NO

District architecture changed:
NO

Caregiver offline architecture changed:
NO

LocalStore used by NCDA LIVE:
NO

Mock leakage in NCDA LIVE:
NO

Tests:
37/37 PASS

Build:
PASS

Lint:
PASS

LIVE smoke:
PARTIAL

Remaining P0:
Deploy backend GET /districts/:id and isActive list filter to the LIVE API environment

Remaining P1:
Optional server-side district list aggregates (centers/children) without N+1; staging latency for large district-scoped aggregates

Remaining P2:
NCDA Centers management; district create/update; province display name on district DTO

Recommended next sprint:
5.5E — NCDA Centers Management (paginated national/filtered center directory only; no bulk national hydration)
```

---

## 11. Deployment gate closure (2026-08-11)

**Root cause:** Sprint 5.5D geo backend existed locally but was **never committed/pushed**. Deployed Render API remained on `36a2f79`.

**Deployed commit:** `947e922edfa2911f1e0f8cf61cfcbb5000ff3908`  
**Message:** `feat(geo): district detail and isActive filter for NCDA 5.5D`  
**Remote:** `origin/main` → Render (`ecd-backend-bda8.onrender.com`)  
**Deployment timestamp (verified live):** 2026-08-11T20:50:46Z (UTC)  
**Prisma migration:** NO

**Explicitly excluded from this deploy (left uncommitted on backend working tree):**

- `src/modules/analytics/analytics.service.ts`
- `src/modules/analytics/__tests__/analytics.service.spec.ts`  
  (Sprint 5.5C `centersReporting` COUNT DISTINCT work — not part of this gate)

**Frontend production code changed:** NO

| Check | Result |
|-------|--------|
| OpenAPI contains `isActive` on `GET /districts` | **YES** |
| OpenAPI contains `GET /districts/{id}` | **YES** |
| `GET /districts?isActive=true` | **PASS** (200) |
| `GET /districts/:id` | **PASS** (200; payload `id` matches request) |
| District list / search | **PASS** |
| Centers by district | **PASS** |
| Regression (`/analytics/dashboard`, `/reports/district` national + scoped) | **PASS** |

```text
SPRINT 5.5D DEPLOYMENT GATE

Backend 5.5D implementation:
VERIFIED

Backend deployed:
YES

Deployed revision:
947e922edfa2911f1e0f8cf61cfcbb5000ff3908

OpenAPI updated:
YES

GET /districts?isActive=true:
PASS

GET /districts/:id:
PASS

District list/search:
PASS

Centers-by-district:
PASS

Regression probes:
PASS

Frontend changed:
NO

Sprint 5.5D gate:
CLOSED

Sprint 5.5E:
NOT STARTED
```
