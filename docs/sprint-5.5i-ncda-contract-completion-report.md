# Sprint 5.5I — NCDA Contract Completion & National Monitoring Report

**Date:** 2026-08-12  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Continues from:** Sprint 5.5H (`docs/sprint-5.5h-ncda-operational-domains-report.md`)  
**Audit:** `docs/sprint-5.5i-ncda-contract-completion-audit.md`

---

## 1. Executive verdict

```text
READY WITH CONDITIONS
```

Sprint 5.5I closes the **proven national contract gaps** from 5.5H with minimal backend rewrites and NCDA frontend wiring:

- **National STED** — safe SQL-backed `GET /monitoring/sted` (district rollup at national scope)
- **Compliance / WASH aggregates** — new `GET /monitoring/compliance` and `GET /monitoring/wash`
- **National centers report** — `GET /reports/centers` uses DB pagination; NCDA UI no longer requires district
- **Exports** — remain honestly unavailable (no backend contract)

Per-center `/monitoring/*` tables, enrollment trends nationally, and CSV/PDF exports remain **Unavailable** / **GAP**.

---

## 2. Contract matrix

| Capability | Existing Contract | Sufficient? | Backend Change | Frontend Change | Status |
|------------|-------------------|-------------|----------------|-----------------|--------|
| National STED | `GET /monitoring/sted` | Yes (post-rewrite) | Rewrite `sted()` — SQL aggregates + district rollup pagination | STED section on `/ncda/monitoring` | **READY** |
| Compliance KPIs | `GET /monitoring/compliance` (new) | Partial — no single “compliance rate” | New aggregate endpoint | Stat card `totalAssessments` | **PARTIAL** |
| WASH KPIs | `GET /monitoring/wash` (new) | Partial — reporting + snapshot, no pass % | New aggregate endpoint | Stat card `centersReporting` | **PARTIAL** |
| National center reporting | `GET /reports/centers` | Yes (post-rewrite) | DB `count` + paginated `findMany`; page-scoped aggregates | Removed district gate on reports page | **READY** |
| CSV export | — | No | None | Export disabled + GAP copy | **GAP** |
| PDF export | — | No | None | Export disabled + GAP copy | **GAP** |

---

## 3. Backend changes

### Controllers (`monitoring.controller.ts`)

- `GET /monitoring/compliance` — national compliance aggregates
- `GET /monitoring/wash` — national WASH aggregates
- `GET /monitoring/sted` — contract unchanged at route level; implementation replaced

### Services

**`monitoring.service.ts`**

- `sted()` — removed unbounded national hydration; national view uses paginated district rollup; district/center views use DB-paginated center items; summary via `count`, `groupBy`, `$queryRaw`
- `compliance()` — SQL aggregates (`count`, `groupBy`, DISTINCT centers)
- `wash()` — period reporting counts + `DISTINCT ON` latest-snapshot SQL

**`reports.service.ts`**

- `centers()` — `ecd_center.count` + paginated `findMany`; metrics aggregated only for current page center IDs

### DTOs (`monitoring-response.dto.ts`)

- Extended `MonitoringStedSummaryDto`, `MonitoringStedCenterItemDto`, `granularity` on STED response
- Added `MonitoringComplianceResponseDto`, `MonitoringWashResponseDto`

### Authorization

- Reuses `resolveDistrictQueryScope` + `ncda_admin` national scope
- No role model changes

### Indexes / migrations

- **None** — no Prisma migration in this sprint

### Tests (backend)

- `npm run test:monitoring` — **10/10 PASS**
- `npm run test:reports` — **4/4 PASS**

---

## 4. Frontend changes

### Resources & mappers

- `src/api/resources/monitoring.ts` — `fetchMonitoringSted`, `fetchMonitoringCompliance`, `fetchMonitoringWash`
- `src/api/mappers/monitoring.mapper.ts` — STED mapper extended; compliance/WASH mappers added
- `src/models/monitoring.ts` — view models for STED items, compliance, WASH aggregates

### Query hooks (`ncda.*`)

- `src/features/ncda/monitoring/queries.ts` — `useNcdaMonitoringSted`, `useNcdaMonitoringCompliance`, `useNcdaMonitoringWash`; trimmed `NCDA_MONITORING_UNAVAILABLE`
- `src/features/ncda/reporting/queries.ts` — national `useNcdaCentersReport` without `districtId` gate

### Pages

- `src/pages/ncda/NcdaMonitoringPage.tsx` — STED operational table (district vs center columns), real compliance/WASH stat cards, pagination
- `src/pages/ncda/NcdaReportsPage.tsx` — national centers performance table enabled

### Locales

- `src/locales/rw/ncda.ts` — STED section copy; updated national notes for monitoring/reporting

### Tests

- `src/features/ncda/operational-domains.contract.test.ts` — updated for 5.5I expectations (**6/6 PASS**)
- `src/features/monitoring/models/index.ts`, `mock-bridge.ts` — aligned with extended STED view model

### OpenAPI / Orval

- `openapi/openapi.json` updated from backend export
- `npm run api:generate` — SUCCESS

---

## 5. Performance

| Endpoint | Strategy | National-scale notes |
|----------|----------|---------------------|
| `GET /monitoring/sted` | SQL `count`/`groupBy`/`$queryRaw` + paginated district rollup or center page | No national `findMany` on assessments |
| `GET /monitoring/compliance` | Parallel `count` + `groupBy` + DISTINCT | O(aggregates), not O(records) |
| `GET /monitoring/wash` | Period counts + bounded snapshot SQL | Scoped to centers in national/district filter |
| `GET /reports/centers` | `count` + `findMany(skip/take)` + groupBy on **page IDs only** | ~100 centers per page max |

Representative production-scale timings were not run against a full 39k-center dataset in this sprint; query shape verified by code review and unit tests.

---

## 6. Remaining gaps

### P0

- None for contracts explicitly scoped in 5.5I (STED/compliance/WASH aggregates, national centers report)

### P1

- **Per-center monitoring tables** — `/monitoring/attendance|nutrition|feeding|referrals` still unsafe nationally
- **Enrollment trend nationally** — soft `take: 10000` cap on enrollment report
- **Compliance classification KPIs** — `overallClassification` often null on synced data; no invented compliance rate
- **WASH pass/fail coverage %** — snapshot counts only; no domain-backed national pass rate

### P2

- **CSV/PDF exports** — no backend export architecture
- **DB indexes** on `sted_assessment(assessment_date, center_id)` etc. — may help at scale; not added this sprint
- **Lint** — repo-wide ESLint failures pre-existing (not introduced by 5.5I)

---

## 7. Regression protection

| Check | Status |
|-------|--------|
| `ncda_admin` → `/ncda` | Intact |
| District architecture | Unchanged |
| Caregiver LocalStore / SyncEngine | Unchanged |
| NCDA LIVE uses LocalStore | **NO** |
| NCDA LIVE uses `useData()` | **NO** |
| Mock leakage on LIVE paths | **NO** |
| National N+1 introduced | **NO** |
| National bulk hydration introduced | **NO** |

---

## SPRINT 5.5I STATUS

Verdict:
READY WITH CONDITIONS

National STED:
READY

National compliance KPIs:
PARTIAL

National WASH KPIs:
PARTIAL

National center reporting:
READY

CSV exports:
GAP

PDF exports:
GAP

Backend changed:
YES

OpenAPI changed:
YES

Prisma migration:
NO

National N+1 introduced:
NO

National bulk hydration introduced:
NO

NCDA LIVE uses LocalStore:
NO

NCDA LIVE uses useData():
NO

Mock leakage:
NO

Tests:
222/223 PASS (1 pre-existing timeout in `field-readiness.test.ts`; NCDA contract 6/6 PASS; backend monitoring 10/10; reports 4/4)

Build:
PASS

Lint:
FAIL (pre-existing repo-wide ESLint errors; no new errors in 5.5I NCDA files)

Remaining P0:
None for 5.5I scoped contracts

Remaining P1:
Per-center `/monitoring/*` national tables; enrollment trend national cap; full compliance rate semantics; WASH pass-rate semantics

Remaining P2:
CSV/PDF export architecture; optional DB indexes for assessment date scans

Recommended next sprint:
Sprint 5.5J — rewrite per-center monitoring endpoints for national-safe pagination OR export job architecture; add compliance/WASH dashboard panels using full aggregate DTOs (classification breakdown, WASH snapshot indicators)
