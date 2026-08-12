# Sprint 5.5I — NCDA Contract Completion Audit

**Date:** 2026-08-12  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Continues from:** Sprint 5.5H (`docs/sprint-5.5h-ncda-operational-domains-report.md`)

---

## 1. Audit method

Verified against:

- Prisma schema (`compliance_assessment`, `wash_indicator`, `sted_assessment`, `ecd_center`)
- Nest controllers: `monitoring.controller.ts`, `reports.controller.ts`
- Services: `monitoring.service.ts`, `reports.service.ts`
- DTOs / Swagger decorators
- Authorization: `resolveDistrictQueryScope`, `ncda_admin` → national scope
- OpenAPI (`openapi/openapi.json`) and Orval generated clients
- NCDA frontend hooks/pages (5.5H baseline)

Classification used: **FRONTEND IMPLEMENTABLE**, **EXISTING CONTRACT BUT INSUFFICIENT**, **EXISTING CONTRACT BUT UNSAFE FOR NATIONAL USE**, **BACKEND CONTRACT GAP**, **SCALABILITY GAP**, **NOT JUSTIFIED**.

---

## 2. STED national monitoring

### Pre-5.5I: `GET /monitoring/sted`

| Question | Finding |
|----------|---------|
| Pagination | Cosmetic — `slice` after unbounded load |
| District / center / child / date filters | Partial (date + scope via centers) |
| Center/district identity in response | Yes (center rows) |
| National user authorization | Allowed but unsafe |
| Aggregation vs hydration | **Hydration** — `findMany` all STED in range + `loadCenters('all')` |
| N+1 | Per-center aggregation in memory |
| Safe at ~39k centers | **NO** |

**Classification:** **EXISTING CONTRACT BUT UNSAFE FOR NATIONAL USE**

### Post-5.5I: `GET /monitoring/sted` (rewritten)

| Question | Finding |
|----------|---------|
| Pagination | **SERVER-SIDE** (`skip`/`take` on district rollup or center page) |
| National default | `granularity: 'district'` — paginated district rollup |
| District/center scope | Center-granularity table with DB pagination |
| Date filtering | `assessmentDate` inclusive range |
| Summary | SQL `count`, `groupBy`, `$queryRaw` DISTINCT, AVG score |
| National bulk hydration | **Removed** — no unbounded `findMany` for national list |
| N+1 at national scale | **No** — bounded parallel aggregates + one paginated rollup query |

**Classification:** **FRONTEND IMPLEMENTABLE** (after backend fix)

---

## 3. National compliance KPIs

### Pre-5.5I

- `GET /compliance/assessments` — paginated list only
- No aggregate endpoint

**Classification:** **BACKEND CONTRACT GAP**

### Post-5.5I: `GET /monitoring/compliance`

Metrics derived from existing model fields:

| Metric | Source |
|--------|--------|
| `totalAssessments` | `count` on `compliance_assessment` |
| `centersAssessed` | `COUNT DISTINCT center_id` |
| `centersInScope` | `ecd_center.count` in scope |
| `byStatus` | `groupBy status` |
| `byType` | `groupBy assessmentType` |
| `byClassification` | `groupBy overallClassification` (non-null) |
| `classificationNullRate` | populated vs total assessments |

No invented “compliance rate” — classification may be sparse on synced records (`classificationNullRate` exposed honestly).

**Classification:** **FRONTEND IMPLEMENTABLE**

---

## 4. National WASH KPIs

### Pre-5.5I

- `GET /wash/indicators` — paginated list only
- No national coverage aggregate

**Classification:** **BACKEND CONTRACT GAP**

### Post-5.5I: `GET /monitoring/wash`

Two semantic layers (not merged into fake %):

| Layer | Metrics |
|-------|---------|
| `reporting` (period) | `recordsInRange`, `centersReporting` |
| `latestSnapshot` (point-in-time) | `centersWithData`, per-indicator availability counts |

Uses period-filtered counts + `DISTINCT ON` SQL for latest snapshot per center.

**Classification:** **FRONTEND IMPLEMENTABLE** (partial KPI surface — no pass/fail % without clearer domain semantics)

---

## 5. National center reporting

### Pre-5.5I: `GET /reports/centers`

- Loaded **all** centers nationally
- Aggregated metrics for entire fleet
- Paginated in memory with `slice`

**Classification:** **EXISTING CONTRACT BUT UNSAFE FOR NATIONAL USE**

### Post-5.5I: `GET /reports/centers` (rewritten)

- `ecd_center.count` + `findMany` with `skip`/`take`
- Page-scoped aggregates only (`pageIds` — enrolled, attendance, nutrition severe, feeding, referrals, STED)
- National pagination without required `districtId`

**Classification:** **FRONTEND IMPLEMENTABLE**

---

## 6. Exports (CSV / PDF)

Repository search: no `StreamableFile`, no `/export` routes, no CSV/PDF generators in backend.

**Classification:** **BACKEND CONTRACT GAP**

No background job export architecture found for national reports.

**Action:** UI remains **Export unavailable** — documented, not faked.

---

## 7. Per-center monitoring tables (`/monitoring/attendance|nutrition|feeding|referrals`)

Still hydrate all centers nationally then paginate in memory.

**Classification:** **EXISTING CONTRACT BUT UNSAFE FOR NATIONAL USE**

NCDA monitoring page does **not** call these endpoints.

---

## 8. Filter classification (NCDA monitoring / reporting)

| Filter | STED | Compliance agg | WASH agg | Centers report |
|--------|------|----------------|----------|----------------|
| `from` / `to` | SERVER-SIDE | SERVER-SIDE | SERVER-SIDE | SERVER-SIDE |
| `districtId` | SERVER-SIDE | SERVER-SIDE | SERVER-SIDE | SERVER-SIDE |
| `centerId` | SERVER-SIDE | SERVER-SIDE | SERVER-SIDE | UNSUPPORTED on report |
| `page` / `pageSize` | SERVER-SIDE | — | — | SERVER-SIDE |
| Status / score filters | UNSUPPORTED | — | — | UNSUPPORTED |

---

## 9. Authorization

- `ncda_admin` → `ncda` scope via existing `resolveDistrictQueryScope`
- No new roles introduced
- District/caregiver guards unchanged

---

## 10. Sprint 5.5I implementation scope (from audit)

| Area | Backend | Frontend |
|------|---------|----------|
| STED national | Rewrite `sted()` | STED table + summary on `/ncda/monitoring` |
| Compliance KPIs | New `compliance()` route | Stat card + aggregates available |
| WASH KPIs | New `wash()` route | Stat card (centers reporting) |
| Centers report | Rewrite `centers()` | Remove artificial district gate |
| Exports | None | Keep unavailable |
| Prisma migration | None required | — |
| OpenAPI / Orval | Updated | Regenerated |

---

## 11. Hard-stop checks

| Condition | Result |
|-----------|--------|
| National STED cannot be safely scoped | **Resolved** — district rollup + SQL aggregates |
| Authorization insufficient | **No** — reuses national scope |
| Compliance semantics ambiguous | **Partial** — classification sparse; `classificationNullRate` documented |
| WASH semantics ambiguous | **Partial** — reporting vs snapshot split |
| Export architecture missing | **Yes** — documented GAP |
| National reporting needs redesign | **Resolved** — DB pagination |
| Caregiver sync risk | **No changes** to sync layer |
| Role boundary risk | **No** |
| National N+1 introduced | **No** |
| OpenAPI accurate | **Yes** — regenerated |

**Audit verdict:** Proceed with minimal backend completion + frontend wiring; exports remain blocked.
