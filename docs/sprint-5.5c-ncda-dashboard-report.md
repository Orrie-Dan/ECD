# Sprint 5.5C — NCDA National Dashboard & Analytics Contract

**Date:** 2026-08-11  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Continues from:** Sprint 5.5B (`docs/sprint-5.5b-ncda-shell-report.md`)

---

## 1. Executive verdict

```text
READY WITH CONDITIONS
```

The NCDA portal now has a **real national dashboard** consuming **server-side aggregate contracts** only. Headline network KPIs, program performance (attendance, nutrition, feeding, referrals), enrollment/dropout period counts, and STED **assessment count** are live.

Honestly unavailable at national scale (documented in UI): enrollment/attendance **trends**, STED coverage/scores, compliance KPIs, WASH KPIs, and national follow-up alert totals.

National-scale safety for the primary analytics dashboard path was improved by replacing distinct-center `findMany` with `COUNT(DISTINCT)` (bounded scalar). No District or caregiver architecture changes.

---

## 2. Contract matrix

| Metric | Existing API | Sufficient? | National-safe? | Frontend work | Backend change |
| ------ | ------------ | ----------- | -------------- | ------------- | -------------- |
| District count | `GET /districts` (`total`) | Yes | Yes (count) | Yes — pageSize=1 | No |
| Center count | `GET /analytics/dashboard` → `centersInScope` | Yes | Yes (count) | Yes | No |
| Active centers | `GET /centers?status=active` (`total`) | Yes | Yes (count) | Yes — pageSize=1 | No |
| Enrollment (snapshot) | `GET /analytics/dashboard` → `children.*` | Yes | Yes | Yes | No |
| New registrations | `GET /reports/district` → `kpis.newRegistrations` | Yes | Yes (count) | Yes | No |
| Enrollment trend | `GET /reports/enrollment` → `trend` | Partial | **No** (take 10k) | Unavailable | Deferred |
| Dropouts | `GET /reports/district` → `kpis.dropouts` | Yes | Yes (count) | Yes | No |
| Attendance rate | `GET /analytics/dashboard` → `attendance` | Yes | Yes (counts) + centersReporting fixed | Yes | Yes — COUNT DISTINCT |
| Attendance trend | `GET /monitoring/attendance` | Shape yes | **No** (loads all centers) | Unavailable | Deferred |
| Growth / nutrition | `GET /analytics/dashboard` → `nutrition` | Yes (screenings) | Yes | Yes | No |
| Nutrition overdue/coverage | `GET /monitoring/nutrition` | Partial | Soft (loads centers; overdue take 5k) | Unavailable | Deferred |
| Feeding | `GET /analytics/dashboard` → `feeding` | Yes | Yes + centersReporting fixed | Yes | Yes — COUNT DISTINCT |
| STED count | `GET /reports/district` → `kpis.stedAssessments` | Yes (count only) | Yes | Yes | No |
| STED coverage/scores | `GET /monitoring/sted` | No | **UNSAFE** (unbounded findMany) | Unavailable | Deferred |
| Referrals | `GET /analytics/dashboard` → `referrals` | Yes | Yes | Yes | No |
| Compliance | `GET /compliance/assessments` | List only | N/A for KPI | Unavailable | Gap |
| WASH | `GET /wash` | List only | N/A for KPI | Unavailable | Gap |
| Alerts / follow-up | `GET /alerts/follow-up` | Soft-capped | Incomplete nationally | Unavailable | Deferred |

**Classification used for implementation:** only **READY** / **READY WITH FRONTEND WORK**.

---

## 3. What was implemented

### Frontend

```text
NcdaDashboardPage
  → useNcdaDashboard (period → from/to)
      → useNcdaDashboardOverview   → fetchMonitoringDashboard → GET /analytics/dashboard
      → useNcdaDashboardKpis       → fetchDistrictReport      → GET /reports/district
      → useNcdaDashboardNetwork    → fetchDistrictsTotal + fetchCentersTotal(active)
```

| Area | Path |
|------|------|
| Page | `src/pages/ncda/NcdaDashboardPage.tsx` |
| Hooks | `src/features/ncda/dashboard/queries.ts`, `useNcdaDashboard.ts` |
| Definitions | `src/features/ncda/dashboard/definitions.ts` |
| Query keys | `queryKeys.ncda.dashboard.{overview,kpis,network}` |
| Geo totals | `src/api/resources/geo.ts` |
| Section shell | `src/components/ncda/NcdaDashboardSection.tsx` |

### UX hierarchy

1. **National overview** — districts, centers, active centers, active children, children total  
2. **Program performance** — attendance, nutrition, feeding, referrals, STED count, new registrations, dropouts  
3. **Attention** — pending referrals, severe nutrition, screenings requiring referral  
4. **Trends** — honest unavailable  
5. **Unsupported contracts** — listed with reasons (not shown as `0`)

### Backend (minimal)

`AnalyticsService.getDashboard` — `centersReporting` for attendance and feeding now uses SQL `COUNT(DISTINCT center_id)` instead of hydrating distinct center id lists via `findMany`.

OpenAPI / Prisma: **unchanged** (response DTO shape identical).

---

## 4. API evidence (APIs actually used)

### A. Analytics dashboard

| Field | Value |
|-------|-------|
| Method / route | `GET /api/v1/analytics/dashboard` |
| Controller | `AnalyticsController.getDashboard` |
| DTO | `DashboardResponseDto` |
| Orval | `analyticsControllerGetDashboard` |
| Resource | `fetchMonitoringDashboard` (`src/api/resources/monitoring.ts`) |
| Query hook | `useNcdaDashboardOverview` → `ncda.dashboard.overview` |
| Auth | `caregiver`, `district_focal_person`, `ncda_admin` |
| Scope | NCDA omits filters → `centerIds: 'all'` |
| Aggregation | `count` / `groupBy` / `COUNT(DISTINCT)` |
| Freshness | Period-based (`from`/`to`; default last 30 UTC days if omitted). Child status counts are snapshots (not range-bound). |

### B. District report KPIs (national when unfiltered)

| Field | Value |
|-------|-------|
| Method / route | `GET /api/v1/reports/district` |
| Controller | `ReportsController` district method |
| Orval | `reportsControllerDistrict` |
| Resource | `fetchDistrictReport` |
| Query hook | `useNcdaDashboardKpis` → `ncda.dashboard.kpis` |
| Auth | `district_focal_person`, `ncda_admin` |
| Used fields | `newRegistrations`, `dropouts`, `stedAssessments` |
| Aggregation | All `count` |

### C. Districts total

| Field | Value |
|-------|-------|
| Method / route | `GET /api/v1/districts?page=1&pageSize=1` |
| Orval | `geoControllerListDistricts` |
| Resource | `fetchDistrictsTotal` |
| Uses | response `total` only |

### D. Active centers total

| Field | Value |
|-------|-------|
| Method / route | `GET /api/v1/centers?status=active&page=1&pageSize=1` |
| Orval | `centersControllerFindAll` |
| Resource | `fetchCentersTotal({ status: 'active' })` |
| Uses | response `total` only |

---

## 5. Metric definitions (displayed KPIs)

| Metric | Source | Scope | Period | Definition | Freshness |
|--------|--------|-------|--------|------------|-----------|
| Total Districts | `/districts` total | national | n/a | District rows visible to NCDA | snapshot |
| Total Centers | dashboard `centersInScope` | national | n/a | Non-deleted ECD centers | snapshot |
| Active Centers | `/centers?status=active` total | national | n/a | `status=active` | snapshot |
| Active Children | dashboard `children.active` | national | snapshot | `ChildStatus.active` | snapshot |
| Children total | dashboard `children.total` | national | snapshot | Non-deleted children | snapshot |
| Attendance rate / present / absent | dashboard `attendance` | national | from/to | Record counts; rate null if no records | period-based |
| Centers reporting attendance | dashboard | national | from/to | DISTINCT centers with attendance rows | period-based |
| Nutrition screenings + severity | dashboard `nutrition` | national | from/to | Screening counts by status | period-based |
| Feeding days / flags | dashboard `feeding` | national | from/to | Feeding-day counts | period-based |
| Referrals | dashboard `referrals` | national | from/to (+ pending open) | Created/completed/cancelled by date; pending open | period-based |
| New registrations | reports/district | national | from/to | `registeredAt` in range | period-based |
| Dropouts | reports/district | national | from/to | `status=archived` + `archivedAt` in range | period-based |
| STED assessments | reports/district | national | from/to | Assessment row count (not coverage) | period-based |

**Do not infer dropout rate** — no authoritative denominator contract.

---

## 6. Time range contract

Reuses existing product convention via `ChartPeriodFilter` → `effectiveRangeToMonitoringDates`:

| Aspect | Behavior |
|--------|----------|
| Params | `from`, `to` (ISO date-time) |
| Timezone | UTC day bounds |
| Inclusive | Backend treats range as inclusive calendar days |
| Default (API if omitted) | Last 30 UTC days |
| UI default | Current month (`period: 'month'`) |
| Filters implemented | Period only — **SERVER-SIDE** via `from`/`to` |
| District filter | **NOT REQUIRED** for national overview (supported by API; not exposed this sprint) |

---

## 7. Performance evidence

### Backend: analytics `centersReporting`

| | Before | After |
|--|--------|-------|
| Strategy | `findMany` + `distinct: ['centerId']` | `COUNT(DISTINCT center_id)` via `$queryRaw` |
| Response size | Up to ~N center UUIDs in memory | Single integer |
| N+1 | None | None |
| National scale | Soft risk at ~39k reporting centers | Bounded scalar |
| Tests | Analytics service unit tests updated + **PASS** | |

### Frontend

| Check | Result |
|-------|--------|
| Unbounded national list load | **No** |
| Client-side national aggregation | **No** |
| Parallel independent queries | Yes (React Query) |
| Cache | `staleTime: 120_000` for NCDA dashboard aggregates |
| Monitoring/* at national | **Not called** |
| Enrollment trend | **Not called** |

Observed production latency against ~39k centers was **not** re-measured in this sprint for the dashboard path; classification relies on query shape (counts / COUNT DISTINCT) plus Sprint 5.4C evidence that national count-style analytics are viable. Condition: validate latency in staging/prod smoke before calling the dashboard fully production-hardened.

---

## 8. Authorization

| Actor | `/ncda/dashboard` |
|-------|-------------------|
| `ncda_admin` → UI `ncda` | Allowed (`ProtectedRoute allowedRole="ncda"`) |
| `district_focal_person` | Denied |
| `caregiver` | Denied |

Backend continues to enforce JWT + `@Roles` + scope resolution. Frontend route gate is UX only.

---

## 9. MOCK mode

LIVE: real aggregates.  
MOCK: honest `LiveUnavailableState` — national dashboard requires LIVE API. **No mock leakage into LIVE.** No LocalStore.

---

## 10. Tests / build / lint

| Suite | Result |
|-------|--------|
| `src/features/ncda/*` (31 tests) | **PASS** |
| Backend `analytics.service.spec.ts` | **PASS** |
| `npm run build` | **PASS** |
| ESLint (changed NCDA paths) | **PASS** (0 warnings) |

---

## 11. Remaining gaps

### P0

None for the scoped objective (national overview with safe aggregates). Trends/compliance/WASH are not P0 for a truthful first dashboard.

### P1

1. **National-safe time-series** — SQL `date_trunc` / `groupBy` enrollment + attendance trends without soft caps or center materialization.  
2. **STED monitoring rewrite** — replace unbounded `findMany` with DB aggregation (coverage, scores).  
3. **Staging latency smoke** for `GET /analytics/dashboard` and `GET /reports/district` at national scope.

### P2

1. National compliance / WASH aggregate KPIs (new contracts).  
2. Authoritative national follow-up/alert counts (remove soft caps).  
3. Optional NCDA district filter on dashboard (already supported server-side).  
4. Active-vs-all centers already shown; inactive/archived center counts if product requires.

---

## 12. Absolute non-goals (honored)

No NCDA district/center/children/users/compliance/WASH/reports/audit/devices/sync pages.  
No District redesign. No caregiver offline changes. No LocalStore. No second Axios client. No fabricated KPIs. No District dashboard clone.

---

## 13. Success criteria checklist

```text
[x] NCDA dashboard uses real backend contracts
[x] National metrics are server-side aggregated
[x] No national operational dataset loaded into the browser
[x] No N+1 on changed backend paths
[x] National authorization verified (route + role helpers)
[x] Dashboard metrics documented
[x] Supported KPIs implemented
[x] Unsupported KPIs honestly unavailable
[x] Trends use real time-series — N/A (unavailable; honest)
[x] Partial failure handling
[x] Loading/empty/error/retry
[x] React Query caching (120s NCDA)
[x] ncda.* query namespace
[x] Orval remains contract boundary
[x] No LocalStore
[x] No mock leakage in LIVE
[x] District unchanged
[x] Caregiver offline unchanged
[~] National-scale performance evidenced (query-shape + unit tests; live latency smoke = condition)
[x] Tests pass
[x] Build passes
[x] Lint clean on changed paths
[x] Gaps documented
```

---

SPRINT 5.5C STATUS

Verdict:
READY WITH CONDITIONS

NCDA dashboard shell:
READY

National overview:
READY

National KPI contracts:
PARTIAL

Enrollment:
PARTIAL

Dropouts:
READY

Attendance:
READY

Growth:
PARTIAL

Nutrition:
READY

Feeding:
READY

STED:
PARTIAL

Referrals:
READY

Compliance:
GAP

WASH:
GAP

National-scale safety:
CONDITIONS

Backend changed:
YES

OpenAPI changed:
NO

Prisma migration:
NO

New indexes:
NO

District architecture changed:
NO

Caregiver offline architecture changed:
NO

NCDA LocalStore dependency:
NO

Client-side national aggregation:
NO

Unbounded national API loading:
NO

Mock leakage in LIVE:
NO

Tests:
31/31 PASS (frontend NCDA) + analytics service PASS

Build:
PASS

Lint:
PASS

Remaining P0:
None for sprint scope

Remaining P1:
National-safe time-series aggregates; STED monitoring rewrite; staging latency smoke for national dashboard endpoints

Remaining P2:
Compliance/WASH aggregate KPIs; authoritative national alerts; optional district filter UX

Recommended next sprint:
Sprint 5.5D — NCDA District directory / management browse (or product-ordered next NCDA domain), after optional P1 national trend contracts if charts are required first
