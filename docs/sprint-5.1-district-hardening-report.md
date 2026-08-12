# Sprint 5.1 — District Portal Data Architecture Hardening Report

## Executive Verdict

**READY WITH CONDITIONS**

District LIVE primary server state for feasible pages now goes through React Query → existing API resources / Orval → REST. Remaining `useData()` occurrences are MOCK-only wrappers or documented contract gaps (child-level rosters / history not exposed by monitoring aggregates). LIVE never silently falls back to MOCK or LocalStore for primary KPIs.

---

## Architecture

**Before**

```text
District Page → useData() → caregiver DataProvider → LocalStore → large client-side dataset
```

**After (LIVE)**

```text
District Page → District feature hook / repository → React Query → API resource / Orval → REST
```

**MOCK**

```text
District Page → MOCK wrapper → useData() / mock builders (unchanged UX)
```

---

## Pages

| Page | LIVE data source | MOCK data source | useData remaining? | Status |
| --- | --- | --- | --- | --- |
| Children | `GET /api/v1/children` (React Query) | `useData()` MOCK wrapper | MOCK-only | Migrated |
| Child Detail | `GET /api/v1/children/:id` | `useData()` MOCK wrapper | MOCK-only | Migrated |
| Attendance Monitoring | `GET /api/v1/monitoring/attendance` | mock center rows + optional context drill-down | MOCK-only | Migrated; child drill-down = **CONTRACT GAP** |
| Dashboard | analytics dashboard + nutrition monitoring | mock dashboard builders via `useData()` arrays | MOCK-only | Migrated; registrations/dropouts = gap (`—`) |
| Feeding Monitoring | `GET /api/v1/monitoring/feeding` | feeding days/summaries via `useData()` | MOCK-only | Migrated; liters/flour/per-center meal days limited vs MOCK |
| STED Monitoring | `GET /api/v1/monitoring/sted` | STED/referral/children via `useData()` | MOCK-only | Migrated; OYA / referral created-completed = gap (`—`) |
| Referral Monitoring | `GET /api/v1/monitoring/referrals` | summary + operational detail list via `useData()` | MOCK-only | Migrated aggregates; detail list = **CONTRACT GAP** |
| Growth Monitoring | `GET /api/v1/monitoring/nutrition` | child rows/alerts via `useData()` | MOCK-only | Aggregates migrated; child roster = **CONTRACT GAP** |
| Reports | monitoring attendance + `/reports/*` previews | attendance/children via `useData()` for drill history | MOCK-only | Aggregates migrated; child history = **CONTRACT GAP**; exports unsupported in LIVE |
| Gukurikirana | `GET /api/v1/alerts/follow-up` (read-only) | `ACTION_ALERTS` mock | None in LIVE | Migrated; no dismiss/ack mutations |
| Center Detail | centers directory API + honest limited sections | mock center + `ACTION_ALERTS` (MOCK only) | None | LIVE does **not** show fake alerts |
| Settings | read-only user display; save blocked honestly | local mock save toast | None (`useAuth` only) | Honest LIVE — no fake persistence |

---

## Final `useData()` audit

Scope: `src/pages/district`, `src/features/monitoring`, `src/features/reporting`.

| File | Usage | LIVE/MOCK | Classification | Action |
| --- | --- | --- | --- | --- |
| `ChildrenPage.tsx` | MOCK wrapper only | MOCK | legitimate | keep |
| `DistrictChildDetailPage.tsx` | MOCK wrapper only | MOCK | legitimate | keep |
| `AttendanceMonitoringPage.tsx` | MOCK wrapper only | MOCK | legitimate | keep |
| `DashboardPage.tsx` | MOCK wrapper only | MOCK | legitimate | keep |
| `FeedingMonitoringPage.tsx` | MOCK wrapper only | MOCK | legitimate | keep |
| `StedMonitoringPage.tsx` | MOCK wrapper only | MOCK | legitimate | keep |
| `ReferralMonitoringPage.tsx` | MOCK wrapper only | MOCK | legitimate | keep |
| `GrowthMonitoringPage.tsx` | MOCK wrapper only | MOCK | legitimate | keep |
| `ReportsPage.tsx` | MOCK wrapper only | MOCK | legitimate | keep |
| `features/monitoring/*` | none | — | — | — |
| `features/reporting/*` | none | — | — | — |

**Objective met:** zero unjustified `useData()` dependency for District LIVE primary server state.

---

## API Coverage

### API-backed (LIVE)

- `GET /api/v1/children`, `GET /api/v1/children/:id`
- `GET /api/v1/monitoring/attendance|nutrition|feeding|sted|referrals`
- `GET /api/v1/analytics/dashboard` (via monitoring dashboard resource)
- `GET /api/v1/reports/*` (enrollment/dropouts/centers/district where used by report previews)
- `GET /api/v1/alerts/follow-up`
- Centers directory for Center Detail LIVE header/stats

### MOCK-only

- Synthetic attendance child drill-down
- `ACTION_ALERTS` (Gukurikirana MOCK + Center Detail MOCK)
- Settings mock save
- Report PDF/Excel export toasts

### Contract gaps (documented; no backend changes)

1. **Attendance child-day roster**
   - Required: per-center child attendance status for selected date
   - Existing: monitoring attendance center aggregates; operational `GET /attendance` is not used as District bulk hydrate
   - Missing: District-oriented child roster endpoint for a center/day
   - Impact: LIVE drill-down shows honest unavailable
   - Follow-up: backend child-day attendance list for District scope

2. **Growth / Referral / Reports child-level tables & history**
   - Required: child roster / referral detail rows / attendance history by child
   - Existing: monitoring aggregates only (plus operational caregiver APIs unsuitable as District bulk source)
   - Missing: District-scoped operational list contracts with pagination
   - Impact: LIVE shows aggregate cards/tables; child tables/history honestly unavailable
   - Follow-up: paginated District operational endpoints

3. **Dashboard newRegistrations / dropouts**
   - Required: distinct registration/dropout KPIs
   - Existing: analytics dashboard children/attendance/nutrition/referrals/feeding
   - Missing: dedicated registration/dropout fields on dashboard DTO
   - Impact: LIVE shows `—`

4. **Feeding liters/flour & per-center milk/porridge/balanced days**
   - Existing feeding monitoring lacks those MOCK columns → LIVE shows `—` / daysRecorded

5. **STED OYA / referral created-completed**
   - Not on STED monitoring summary → LIVE shows `—`

6. **Alert mutations**
   - Only GET follow-up exists → LIVE Gukurikirana is read-only

7. **Report exports**
   - No file export endpoints → LIVE export blocked with honest copy

8. **Settings persistence**
   - No confirmed District settings write contract used → LIVE save blocked

---

## Performance

Bulk caregiver LocalStore hydration is eliminated for LIVE primary state on migrated pages:

- Children list/detail no longer load full District roster via `useData()`
- Monitoring pages pass empty arrays into LIVE paths; mock builders do not run in LIVE
- Reports LIVE attendance comparison uses monitoring aggregates, not unbounded caregiver attendance windows
- Remaining gaps intentionally avoid unbounded client fetches to preserve old drill-down UX

---

## Error UX

Migrated LIVE pages include loading / empty / error / retry (or honest unavailable) where applicable:

| Page | Loading | Empty | Error + retry | Honest gap |
| --- | --- | --- | --- | --- |
| Children | yes | yes | yes | unsupported filters note |
| Child Detail | yes | not found | yes | — |
| Attendance | yes | yes | yes | child drill-down |
| Dashboard | yes | skeleton until data | yes | registrations/dropouts |
| Feeding | yes | yes | yes | column gaps |
| STED | yes | yes | yes | OYA/referral KPIs |
| Referral | yes | aggregate empty | yes | detail list |
| Growth | yes | center empty | yes | child roster |
| Reports | yes | yes | yes | history + exports |
| Gukurikirana | yes | yes | yes | read-only |
| Center Detail | yes | not found | yes | trends/activity/alerts limited |
| Settings | n/a | n/a | save blocked | no fake persist |

---

## Query Keys

District namespace added in `src/api/query-keys.ts`:

```text
district.children
district.child
district.attendance
district.dashboard
district.monitoring
district.reporting
district.referrals
district.alerts
district.centers
district.settings
```

Existing caregiver/domain keys remain intact. Follow-up alerts LIVE uses `district.keys.alerts(...)`. Monitoring/reporting pages continue to use existing `monitoring.*` / `reporting.*` resource keys (no duplicate factories required).

---

## Test Results

Executed:

1. `npm run test` → **PASS**
   - Test Files: **13 passed (13)**
   - Tests: **131 passed (131)**
   - Includes new contract tests:
     - Attendance LIVE no-`useData` + scoped monitoring attendance params
     - Follow-up alerts GET filter wiring
2. `npm run build` → **PASS** (`tsc -b && vite build`)
3. `npm run lint` → **FAIL** (pre-existing repository lint debt)
   - Dominant failures: generated Orval `react-hooks/immutability`, unrelated `set-state-in-effect`, `react-refresh/only-export-components`
   - Sprint 5.1 did **not** attempt to fix unrelated lint debt
   - No evidence that Sprint 5.1 introduced a new unique lint class beyond existing generated/app debt

Caregiver offline / LocalStore / sync tests remain passing within the 131 total.

---

## Backend

```text
Backend changed: NO
OpenAPI changed: NO
```

Frontend-only. Generated clients consumed as-is. No invented endpoints/DTO fields.

---

## Remaining Risks

### P0

- None blocking District LIVE honesty for migrated aggregates.

### P1

- Child-level District operational UX remains unavailable until backend contracts exist (Growth/Referral detail/Attendance drill-down/Reports history).
- Dashboard registrations/dropouts still null in LIVE.

### P2

- Feeding/STED LIVE column fidelity vs MOCK.
- District query namespace not yet fully adopted by every monitoring page (monitoring keys still correct and stable).
- Lint debt in generated Orval clients remains noisy.

---

## Next Sprint (evidence-based)

Recommend a **District Operational Read Contracts** sprint (not automatically “5.2”) focused on backend+frontend together:

1. Paginated District child-day attendance by `centerId` + date
2. Paginated District growth/nutrition child roster (or explicit product decision to keep aggregate-only)
3. Paginated District referral operational list for monitoring detail
4. Dashboard fields for newRegistrations/dropouts
5. Optional: alert acknowledge/dismiss only if product requires mutations

Until those contracts exist, frontend should keep the current honest LIVE limited states.

---

## Success criteria checklist

- [x] Children migrated
- [x] Child Detail migrated
- [x] Attendance migrated OR documented as contract gap (both: aggregates migrated; child drill-down gap)
- [x] Dashboard migrated OR documented (KPIs API-backed; registrations/dropouts gap)
- [x] Feeding Monitoring migrated OR documented
- [x] STED Monitoring migrated OR documented
- [x] Referral Monitoring migrated OR documented (aggregates + detail gap)
- [x] Growth Monitoring migrated OR documented (aggregates + child roster gap)
- [x] Reports migrated OR documented (aggregates + history/export gaps)
- [x] Gukurikirana honest LIVE API GET behavior (read-only)
- [x] Center Detail does not show fake alerts in LIVE
- [x] Settings does not fake persistence
- [x] Remaining `useData()` usage justified (MOCK-only)
- [x] LIVE never silently falls back to MOCK
- [x] MOCK remains unchanged for migrated areas
- [x] District query namespace established
- [x] Error/empty/retry standardized on migrated pages
- [x] Caregiver offline tests remain passing
- [x] Build passes
- [x] No backend/OpenAPI changes
