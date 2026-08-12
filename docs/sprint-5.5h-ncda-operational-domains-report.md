# Sprint 5.5H — NCDA Compliance, WASH, Monitoring & Reporting

**Date:** 2026-08-11  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Continues from:** Sprint 5.5G (`docs/sprint-5.5g-ncda-users-governance-report.md`)

---

## 1. Executive verdict

```text
READY WITH CONDITIONS
```

Four NCDA LIVE surfaces replace Coming Soon placeholders with **truthful** contracts:

| Route | What shipped |
|-------|----------------|
| `/ncda/compliance` | Paginated assessment browse + detail + standards catalogue |
| `/ncda/wash` | Paginated WASH indicator browse + detail |
| `/ncda/monitoring` | National-safe aggregates only (`/analytics/dashboard` + `/reports/district`) |
| `/ncda/reports` | District KPIs, enrollment/dropout summaries; centers table **requires district** |

National compliance/WASH KPIs, `/monitoring/*` center tables, STED monitoring, enrollment trends, and CSV/PDF exports remain **Unavailable** / **BACKEND CONTRACT GAP** — never faked as `0` or client-scanned.

**Backend changes:** none.  
**OpenAPI / Prisma:** unchanged.

---

## 2. Contract matrix

| Capability | API | Classification |
|------------|-----|----------------|
| Compliance assessment list | `GET /compliance/assessments` page/status/district/center/from/to | **FRONTEND IMPLEMENTABLE** |
| Compliance assessment detail + items | `GET /compliance/assessments/:id` | **FRONTEND IMPLEMENTABLE** |
| Compliance standards catalogue | `GET /compliance/standards` | **FRONTEND IMPLEMENTABLE** |
| National compliance rate / classification pie | — | **BACKEND CONTRACT GAP** |
| Latest assessment per center (national) | — | **BACKEND CONTRACT GAP** |
| Non-compliant centers fleet | — | **BACKEND CONTRACT GAP** (would require unsafe client scan) |
| WASH indicator list | `GET /wash/indicators` page/district/center/from/to | **FRONTEND IMPLEMENTABLE** |
| WASH indicator detail | `GET /wash/indicators/:id` | **FRONTEND IMPLEMENTABLE** |
| National WASH coverage % | — | **BACKEND CONTRACT GAP** |
| Monitoring national KPIs (children, attendance, nutrition, feeding, referrals) | `GET /analytics/dashboard` | **FRONTEND IMPLEMENTABLE** |
| STED count | `GET /reports/district` → `stedAssessments` | **FRONTEND IMPLEMENTABLE** |
| Per-center monitoring tables | `GET /monitoring/*` | **EXISTING API BUT INSUFFICIENT** (in-memory pagination after `loadCenters('all')`) |
| STED monitoring table | `GET /monitoring/sted` | **EXISTING API BUT INSUFFICIENT** (**P0** unbounded `findMany`) |
| Compliance/WASH monitoring KPIs | — | **BACKEND CONTRACT GAP** |
| District report KPIs | `GET /reports/district` | **FRONTEND IMPLEMENTABLE** |
| Enrollment summary | `GET /reports/enrollment` summary | **FRONTEND IMPLEMENTABLE** |
| Enrollment trend (national) | same + soft `take: 10000` | **EXISTING API BUT INSUFFICIENT** |
| Dropouts summary | `GET /reports/dropouts` | **FRONTEND IMPLEMENTABLE** |
| Dropouts child table | same (DB-paginated) | **FRONTEND IMPLEMENTABLE** with **required district** (product/scale) |
| Centers performance | `GET /reports/centers` | **EXISTING API BUT INSUFFICIENT** nationally; **FRONTEND IMPLEMENTABLE** with district |
| CSV/PDF export | — | **BACKEND CONTRACT GAP** |

---

## 3. Compliance implementation

- Resource: `src/api/resources/compliance.ts` (pageSize clamp ≤100)
- Hooks: `ncda.compliance.list|detail|standards`
- Page: filters = district, center (after district), status, from/to — all **SERVER-SIDE**
- Detail panel loads items for one assessment
- Banner: national aggregates Unavailable (not `0`)
- Mutations (create/verify) **not** shipped this sprint (browse-first governance)

### Filter classification

| Filter | Class |
|--------|-------|
| districtId | SERVER-SIDE |
| centerId | SERVER-SIDE |
| status | SERVER-SIDE |
| from / to | SERVER-SIDE |
| assessmentType / overallClassification | UNSUPPORTED (no query params) |

---

## 4. WASH implementation

- Resource: `src/api/resources/wash.ts`
- Hooks: `ncda.wash.list|detail`
- Same server filter discipline; boolean facility filters = **UNSUPPORTED**
- No client-side % calculation across pages

---

## 5. Monitoring implementation

- Uses `fetchMonitoringDashboard` + `fetchDistrictReport` under `ncda.monitoring.*`
- Optional district scopes aggregates (server-side on those endpoints)
- **Never** calls `fetchMonitoringAttendance|Nutrition|Feeding|Sted|Referrals` from NCDA monitoring
- Compliance / WASH KPI tiles show `—`
- Unavailable list documents STED monitoring, per-center tables, trends

---

## 6. Reporting implementation

| Report | National | With district |
|--------|----------|---------------|
| District KPIs | Live | Live |
| Enrollment summary | Live | Live |
| Enrollment trend | Unavailable | Unavailable (same soft cap) |
| Dropouts summary | Live | Live |
| Dropouts items | Hidden until district | Live (DB page) |
| Centers performance | Blocked | Live |
| Export | Disabled + GAP copy | Same |

---

## 7. Export capability

```text
BACKEND CONTRACT GAP
```

No CSV/PDF/`StreamableFile` endpoints. UI export control is **disabled** with explicit GAP copy. No fake client CSV from unbounded national loads.

---

## 8. Backend / OpenAPI / Prisma

| Item | Status |
|------|--------|
| Backend changed | **NO** |
| OpenAPI changed | **NO** |
| Prisma migration | **NO** |
| Authorization broadened | **NO** (`ncda_admin` already on listed endpoints) |

---

## 9. Performance findings

| Finding | Severity | FE action |
|---------|----------|-----------|
| `GET /monitoring/sted` unbounded findMany | **P0** | Not called |
| `/monitoring/*` + `/reports/centers` hydrate all centers then slice | **P0** if national UI | Not called without district; centers gated |
| Compliance/WASH unfiltered `count` | **P1** | Prefer district/date filters in UX; browse allowed |
| Enrollment trend take 10000 | **P1** | Trend Unavailable |
| FE page-walking for national KPIs | **P0** if done | Explicitly forbidden |

**National-scale N+1 introduced by this sprint:** NO  
**National bulk hydration introduced:** NO

---

## 10. Security findings

- Routes remain under `ProtectedRoute allowedRole="ncda"`
- No LocalStore / caregiver `useData()` / mock fallback on LIVE
- No invented metrics or exports
- Distinct query namespace `ncda.compliance|wash|monitoring|reporting` (not District keys)

---

## 11. Frontend deliverables

| Area | Path |
|------|------|
| Pages | `NcdaCompliancePage`, `NcdaWashPage`, `NcdaMonitoringPage`, `NcdaReportsPage` |
| Resources | `api/resources/compliance.ts`, `wash.ts` |
| Hooks | `features/ncda/{compliance,wash,monitoring,reporting}/queries.ts` |
| Query keys | extended `createNcdaKeys()` |
| Tests | `operational-domains.contract.test.ts` |
| Copy | `locales/rw/ncda.ts` domain sections |

MOCK mode: pages show `LiveUnavailableState` (same pattern as 5.5C–G). MOCK Coming Soon for Devices/Sync unchanged.

---

## 12. Remaining gaps

| Gap | Priority |
|-----|----------|
| Compliance/WASH national aggregates + latest-per-center | P1 product / contract |
| Rewrite `/monitoring/*` + `/reports/centers` to SQL-paged centers | P0 before national center tables |
| Fix `/monitoring/sted` to aggregates | P0 |
| Report export endpoints | P1 |
| Enrollment trend SQL `date_trunc` | P1 |
| Compliance classification write path / center denorm sync | P2 |

---

## 13. Verification

```text
npm run test   → 223/223 PASS
npm run build  → PASS
npm run lint   → FAIL (pre-existing; generated Orval + unrelated setState)
                 Sprint 5.5H files: eslint clean
```

Backend tests: not run (no backend changes).

---

```text
SPRINT 5.5H STATUS

Verdict:
READY WITH CONDITIONS

Compliance:
PARTIAL

WASH:
PARTIAL

Monitoring:
PARTIAL

Reporting:
PARTIAL

Exports:
GAP

Backend changed:
NO

OpenAPI changed:
NO

Prisma migration:
NO

National-scale N+1 introduced:
NO

National bulk hydration:
NO

LocalStore used by NCDA LIVE:
NO

Mock leakage:
NO

Tests:
223/223 PASS

Build:
PASS

Lint:
FAIL (pre-existing only; new 5.5H files clean)

Remaining P0:
- Do not call GET /monitoring/sted or unfiltered /monitoring/* /reports/centers from NCDA (already avoided)
- Backend rewrite of those endpoints before any national per-center monitoring UI

Remaining P1:
- Compliance/WASH aggregate + latest-per-center contracts
- Report CSV/PDF export endpoints
- Enrollment trend without soft cap
- Prefer required district/date on heavy compliance/WASH counts

Remaining P2:
- overallClassification write + center currentComplianceLevel sync
- WASH boolean query filters
- Devices/Sync fleet APIs (carry-over from 5.5G)

Recommended next sprint:
Sprint 5.6 — backend national-safe monitoring/centers report rewrite + compliance/WASH aggregates (or NCDA GIS / remaining platform ops if product prioritizes differently). Do not start until explicitly requested.
```
