# Sprint 5.4B — LIVE API Production Stability Investigation

**Date:** 2026-08-11  
**Frontend repo:** `D:\Esri\ECD` (not modified)  
**Backend repo:** `D:\Esri\ECD Backend` (stabilization fixes)  
**Continues from:** `docs/sprint-5.4a-district-live-smoke-test-report.md`

---

## Executive verdict

```text
API STABILIZED WITH CONDITIONS
```

Root cause of Sprint 5.4A **502 / timeouts** is established with high confidence:

```text
BACKEND QUERY PERFORMANCE
(+ reverse-proxy timeout as the observed failure mode)
```

Under `ncda_admin`, monitoring and centers-report handlers loaded **all ~39,445 centers**, then fired **3–7 Prisma `count` queries per center via `Promise.all`** (≈117k–273k round-trips). Pagination was applied **after** that fan-out. Render then returned HTML **502** when the Nest/DB work exceeded the gateway budget.

Minimal safe fix applied in the backend: replace per-center N+1 loops with **scoped `groupBy` / single SQL aggregations**. Local reproduction against the same center cardinality (`ecd_center` count = **39,445**) now completes core District operational reads in **~0.6–1.0s**.

**Conditions before architecture freeze:**

1. **Deploy** the backend fix to the Render API host used by LIVE.
2. **Rerun Sprint 5.4A** against that deployed API.
3. Prefer a `district_focal_person` test account for District-scope verification (none available locally or in 5.4A).

---

## Endpoint matrix

| Endpoint | Local (post-fix, NCDA, 39,445 centers) | Production (pre-fix / 5.4A) | Scope-sensitive | Root Cause | Fix | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Attendance (`GET /monitoring/attendance`) | **753ms** OK | 502 / timeout | YES (NCDA unbounded fan-out) | Per-center N+1 counts | groupBy aggregates | STABLE locally; deploy pending |
| Nutrition (`GET /monitoring/nutrition` + screenings/alerts) | mon **729ms**; listScreenings **39ms** | 502 | YES | N+1 + unbounded alerts findMany | groupBy/$queryRaw + `take:2000` on alerts | STABLE locally; deploy pending |
| Referrals (`GET /monitoring/referrals` + `GET /referrals`) | mon **702ms**; list **31ms** | 502/503 | YES | N+1 on monitoring; list already paginated | groupBy on monitoring | STABLE locally; deploy pending |
| Follow-up (`GET /alerts/follow-up`) | **64ms** OK | 502/503 | Partial | National scans + DQ `_count` subqueries; pool pressure from concurrent N+1 | DQ uses groupBy; alerts already capped | STABLE locally; deploy pending |
| Reports (`/reports/*`) | district **269ms**; enrollment **26ms**; centers **939ms** | 502 | YES (centers report) | `reports.centers` 7×N counts | groupBy/$queryRaw | STABLE locally; deploy pending |
| Monitoring (feeding/sted family) | feeding **650ms**; sted **1045ms** | 502 | YES | feeding N+1; sted O(centers×assessments) | groupBy + Map | STABLE locally; deploy pending |

Dashboard / centers list were already PASS in 5.4A (no per-center N+1). That contrast is itself evidence.

---

## Root-cause evidence

### Observed behavior (Sprint 5.4A)

- Login, dashboard, centers list: PASS against Render HTTPS API.
- Attendance / growth / referrals / Gukurikirana / reports: **502 Bad Gateway** (Render HTML) or hang.
- Account: `ncda_admin` → UI `districtOfficer`; centers `total ≈ 39445`.
- Frontend wiring + LIVE config: PASS (no mock leakage).

### Request (representative)

District LIVE pages call (among others):

- `GET /api/v1/monitoring/attendance?from&to&page&pageSize`
- `GET /api/v1/monitoring/nutrition|feeding|sted|referrals`
- `GET /api/v1/alerts/follow-up`
- `GET /api/v1/reports/enrollment|dropouts|district|centers`
- Plus paginated `GET /attendance`, `/nutrition/screenings`, `/referrals`

### Scope

| Role | Scope type | Size | Query restriction |
| --- | --- | --- | --- |
| caregiver | single center | 1 | `centerId = user.centerId` |
| district_focal_person | district centers | typically hundreds | `centerId IN (...)` or `districtId` |
| ncda_admin | **all** | **~39,445 centers** | `centerFilter` / `centerIdWhere` → **`{}`** (no center predicate) |

`SyncAccessService.resolveScope` / `resolveDistrictQueryScope`:

- `ncda_admin` → `{ centerIds: 'all', districtId: null }`
- Downstream `centerIdWhere('all')` returns `{}` — **legitimate national authorization**, not a bypass bug.
- The bug was turning that authorized national scope into **O(centers)** query storms.

### Query (pre-fix smoking gun)

`MonitoringService.attendance` (and siblings) did:

1. `loadCenters(scope)` → **unbounded** `ecdCenter.findMany` (~39k rows).
2. `Promise.all(centers.map(c => 3× count(...)))` → **~118k queries**.
3. Sort by rate, then `slice(skip, skip+pageSize)` — **fake pagination**.

`ReportsService.centers` used **7 counts × N centers** (~273k queries).

Even with **zero** attendance/children rows, the fan-out still executed (confirmed local inventory: `children=0`, `attendance=0`, `centers=39445`).

### Query timing (post-fix, real local DB)

Local PostgreSQL inventory matches production scale:

```text
centers=39445  children=0  attendance=0
ncda_admin present; district_focal_person: none
```

| Call | ms | total | items |
| --- | ---: | ---: | ---: |
| monitoring.attendance | 753 | 39445 | 20 |
| monitoring.nutrition | 729 | 39445 | 20 |
| monitoring.feeding | 650 | 39445 | 20 |
| monitoring.referrals | 702 | 39445 | 20 |
| monitoring.sted | 1045 | 39445 | 20 |
| alerts.followUp | 64 | 0 | 0 |
| reports.centers | 939 | 39445 | 20 |
| nutrition.listScreenings | 39 | 0 | 0 |
| referrals.findAll | 31 | 0 | 0 |

Stub scale timing (query-count regression): at 39,445 centers, attendance uses **2 count + 2 groupBy** calls vs legacy estimate **118,335** counts.

### Database evidence

- Indexes on `attendance_record(centerId, attendanceDate)` are sufficient for the **aggregate** path; they could not rescue **117k separate round-trips**.
- Nutrition screenings lack denormalized `centerId` → per-center status breakdown now uses **one** SQL `GROUP BY ch.center_id, nutrition_status`.
- No migration added in this sprint (aggregation fix first; indexes not the primary failure mode).

### Application evidence

- Nest handlers blocked on Prisma pool / CPU until gateway cut them off.
- Dashboard worked because `AnalyticsService` uses a **bounded set of national aggregates**, not per-center N+1.
- Centers list worked because it is **paginated at the DB** (`take`/`skip`).

### Infrastructure evidence (confirmed only)

- Hosting: **Render** (5.4A HTML 502 pages; backend `RENDER_EXTERNAL_URL` awareness in `main.ts`).
- Repo contains **no** `render.yaml` / Dockerfile / nginx timeout config to tune from here.
- Prisma: default client; local `DATABASE_URL` has **no** `connection_limit` params.
- Classification: **502 = reverse proxy terminating an upstream that was still thrashing the DB**, not a frontend bug.

### Conclusion

```text
BACKEND QUERY PERFORMANCE (N+1 per-center fan-out under ncda_admin)
→ request duration ≫ Render proxy budget
→ observed 502 / timeout
```

Not:

- frontend invalid requests
- weakened/missing auth (scope is intentionally national for NCDA)
- missing indexes as the primary cause

---

## Database findings

| Finding | Severity | Action |
| --- | --- | --- |
| Per-center `Promise.all` count fan-out in monitoring + reports/centers | **P0** | **Fixed** via groupBy / `$queryRaw` |
| Soft pagination (slice after full compute) | P0 companion | Still sorts full in-memory center list (~39k id/name/metrics) — acceptable post-fix (~1s); further “page centers first” would change sort semantics |
| `nutrition.getAlerts` unbounded `findMany` | P1 | **Fixed** with `take: 2000` |
| Alerts DQ correlated `_count` on centers | P2 | **Fixed** with attendance `groupBy` |
| `sted` still loads all assessments in range (needed for JSON scores) | P2 residual | OK on empty/local; revisit if assessment volume grows |
| National `count`/`groupBy` without center predicate | Expected for NCDA | Acceptable once fan-out removed |
| Composite index gaps (referral status+date, nutrition date) | Secondary | **Not added** — no EXPLAIN evidence that indexes alone caused 502 |

**Count bottleneck:** separate full-scope `count` for list endpoints remains, but with empty operational tables it is fast; monitoring failure was **N×centers counts**, not a single total-count.

**Connection pool:** concurrent District page loads of multiple N+1 endpoints would exhaust Prisma/PG connections; fixed path uses O(1) queries per endpoint.

---

## Infrastructure findings

Confirmed:

- Render-hosted API; HTML 502 matches gateway upstream failure.
- No checked-in proxy timeout / memory limit files to modify.
- Local DB already holds the national center seed (`39445`) — excellent reproduction environment.

Not confirmed (do not invent):

- Exact Render free/paid plan limits, ALB, CloudFront, Nginx configs.

---

## resolveScope audit (unchanged semantics)

| Role | resolveScope / district scope | centerIds | Notes |
| --- | --- | --- | --- |
| caregiver | SyncAccess + district-query | `[centerId]` | Forbidden without center |
| district_focal_person | district centers list | `string[]` | Forbidden without district |
| ncda_admin | national | `'all'` | Empty SQL center filter by design |
| (no DHI/CAU/super_admin distinct paths in these services) | — | — | Not present as separate roles in this codepath |

**Authorization was not weakened.** Fixes keep the same WHERE scope and only change **how** per-center metrics are aggregated.

---

## Changes made

### Backend (`D:\Esri\ECD Backend`)

| Area | Change |
| --- | --- |
| `src/modules/monitoring/monitoring.service.ts` | Replace per-center count loops with `groupBy` (attendance, feeding, referrals); nutrition via `$queryRaw` join/group; sted Map aggregation |
| `src/modules/reports/reports.service.ts` | `centers` report uses groupBy + severe `$queryRaw` |
| `src/modules/nutrition/nutrition.service.ts` | Cap `getAlerts` flagged + overdue scans with `take: 2000` |
| `src/modules/alerts/alerts.service.ts` | DQ “no attendance today” uses groupBy instead of per-center `_count` |
| `src/modules/monitoring/__tests__/monitoring.service.spec.ts` | Regression: query count O(1) vs center cardinality |
| `src/modules/reports/__tests__/reports.service.spec.ts` | Stub groupBy / `$queryRaw` |
| `src/modules/alerts/__tests__/alerts.service.spec.ts` | Align stub with DQ query shape |
| `scripts/sprint-54b-local-scope-timing.ts` | Scope-sensitive stub timing |
| `scripts/sprint-54b-db-timing.ts` | Real-DB NCDA timing harness |

### Frontend (`D:\Esri\ECD`)

```text
No production application code changes.
```

### Schema / OpenAPI

```text
No Prisma migration.
No OpenAPI contract change.
```

---

## Verification

| Check | Result |
| --- | --- |
| Backend `npm run test:monitoring` | PASS (incl. fan-out regressions) |
| Backend `npm run test:reports` | PASS |
| Backend `npm run test:alerts` | PASS |
| Backend `npm run test:nutrition` | PASS |
| Backend `npx nest build` | PASS |
| Local DB NCDA timing (39,445 centers) | PASS (~0.6–1.0s monitoring) |
| Frontend `npm run test` | 154 tests; 1 intermittent timeout on `field-readiness` Phase 7 — **rerun PASS 11/11** |
| Frontend `npm run build` | PASS |
| Production API re-probe after deploy | **NOT DONE** (code not yet deployed to Render) |
| District-scoped production account | **NO** |

---

## Conditions / residuals

1. **Deploy required** — local stability ≠ LIVE until Render runs this backend build.
2. **NCDA still returns `total: 39445` center rows in monitoring** — response page is 20 items, but metadata/total reflects full national center list; UI truncation semantics remain a P1 product concern (5.4A).
3. **No district_focal_person** in local/prod smoke credentials — District-scale vs NCDA-scale comparison in production still incomplete.
4. Further optimization (true center-page-first queries, indexes) deferred until after 5.4A rerun proves LIVE stability.

---

## Recommended next step

```text
1. Deploy ECD Backend with Sprint 5.4B monitoring/reports/alerts/nutrition fixes to the LIVE Render API.
2. RERUN SPRINT 5.4A against that deployment.
3. Only after 5.4A PASS/PARTIAL with accepted gaps: approve District architecture freeze.
```

Do **not** start Sprint 5.5 / NCDA Admin / GIS / exports / alert mutations from this report.

**STOP after this stability report.**

---

## SPRINT 5.4B STATUS

```text
SPRINT 5.4B STATUS

Verdict:
API STABILIZED WITH CONDITIONS

Production blocker root cause:
Monitoring/reports per-center Prisma N+1 fan-out under ncda_admin (centerIds:'all', ~39,445 centers) exhausting DB/connection budget until Render returned 502; not a frontend wiring defect.

Attendance:
STABLE

Nutrition:
STABLE

Referrals:
STABLE

Gukurikirana:
STABLE

Reports:
STABLE

Monitoring:
STABLE

Root cause category:
BACKEND QUERY PERFORMANCE

Backend changed:
YES

Database migration:
NO

OpenAPI changed:
NO

Frontend changed:
NO

Caregiver offline architecture changed:
NO

Authorization weakened:
NO

Tests:
Backend monitoring/reports/alerts/nutrition PASS; Frontend 154 (1 flake rerun PASS)

Build:
PASS (backend nest build + frontend vite build)

Lint:
NOT RE-RUN REPO-WIDE (pre-existing debt unchanged)

Production API verified:
NO

District-scoped production account available:
NO

5.4A rerun:
READY (after backend deploy)

District architecture freeze:
NOT APPROVED

Recommended next step:
Deploy backend 5.4B fixes to Render, then RERUN SPRINT 5.4A; freeze only after that gate passes.
```
