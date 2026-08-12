# Sprint 5.2 — District Operational Read Contract Audit

**Date:** 2026-08-11  
**Scope:** District portal operational reads (attendance, growth/nutrition, referrals, dashboard, reports, center detail)  
**Backend source of truth in this repo:** `openapi/openapi.json` → Orval clients under `src/api/generated/`  
**Note:** Nest/Prisma live in the sibling backend repo; this audit reconstructs contracts from OpenAPI + generated clients + frontend resources.

---

## 1. Executive verdict

```text
READY WITH CONTRACT GAPS
```

Existing OpenAPI contracts already supported several District operational workflows that Sprint 5.1 left as “unavailable” placeholders (**miswired, not missing**). Sprint 5.2 wired those frontend-only paths. Remaining gaps are genuine backend/OpenAPI absences (notably paginated nutrition screenings).

| Workflow | Verdict |
| --- | --- |
| Paginated attendance records (scoped) | **FRONTEND IMPLEMENTABLE** |
| Center+day child roster via children∩attendance join | **FRONTEND IMPLEMENTABLE** (scoped; not a dedicated roster API) |
| Paginated referral list + status/source/center/child | **FRONTEND IMPLEMENTABLE** (miswired today) |
| Dashboard registrations / dropouts | **AVAILABLE BUT MISWIRED** (`/reports/enrollment`, `/reports/dropouts`, `/reports/district`) |
| Follow-up alerts on Dashboard / Gukurikirana | **AVAILABLE** (`GET /alerts/follow-up`) |
| Growth/nutrition **aggregates** | **AVAILABLE** (`/monitoring/nutrition`) |
| Paginated district **screening list** | **BACKEND CONTRACT GAP** |
| Referral list **date** filter | **BACKEND CONTRACT GAP** |
| Report file exports / sectors report | **BACKEND CONTRACT GAP** |

District must stay server-state-first (React Query → resources → Orval). MOCK remains isolated. No caregiver `useData()` / LocalStore for LIVE primary state.

---

## 2. Contract matrix

| Domain | Requirement | Existing API | Generated Client | Sufficient? | Frontend Work | Backend Gap |
| --- | --- | --- | --- | --- | --- | --- |
| Attendance | Paginated records | `GET /api/v1/attendance` | `attendanceControllerFindAll` | **Yes** | District hooks + page wire | — |
| Attendance | center / child / date filters | same (`centerId`,`childId`,`startDate`,`endDate`) | `AttendanceControllerFindAllParams` | **Yes** | Pass filters SERVER-SIDE | — |
| Attendance | Status / `present` query filter | — | — | **No** | CLIENT-SIDE SAFE on page; disable “submission status” pretence as server | Optional `present` query param |
| Attendance | Center overview / rates | `GET /monitoring/attendance` | `monitoringControllerAttendance` | **Yes** | Already LIVE (5.1) | — |
| Attendance | Center child-day roster (names + unrecorded) | `GET /children?centerId` + `GET /attendance?centerId&dates` | children + attendance findAll | **Partial** | Scoped join for selected center+day | Dedicated child-day roster with names would simplify |
| Attendance | District-wide history dump | findAll without tight filters | — | **Unsafe** | Do **not** call `fetchAllAttendance` district-wide | — |
| Growth | Aggregate KPIs / center table | `GET /monitoring/nutrition` | `monitoringControllerNutrition` | **Yes** (aggregates only) | Wire `yearMonth`→`from`/`to` | — |
| Growth | Paginated screening records | — | — | **No** | Keep child table Unavailable | `GET` district/center screenings list |
| Growth | Per-child history / MUAC / H/W | `GET /children/:id/nutrition-history`, `…/growth-chart` | `nutritionControllerGetHistory`, `GetGrowthChart` | **Yes** (per child) | Child detail only; not district roster | — |
| Growth | Nutrition alerts (child signals) | `GET /nutrition/alerts` | `nutritionControllerGetAlerts` | **Yes** (no offset page) | Wire on Growth LIVE | Optional pagination |
| Referral | Paginated list | `GET /api/v1/referrals` | `referralsControllerFindAll` | **Yes** | Wire LIVE detail table | — |
| Referral | status / source / center / child | same query params | `ReferralsControllerFindAllParams` | **Yes** | SERVER-SIDE filters | — |
| Referral | Date filter on list | — (only monitoring `from`/`to`) | — | **No** | Mark UNSUPPORTED on list | Add `from`/`to` to findAll |
| Referral | destination / reason / statuses | on `ReferralResponseDto` | — | **Yes** | Render fields | childName/centerName not on DTO |
| Referral | Overdue as status | derived client-side (14d) | — | **No** as server filter | Disable or CLIENT-SIDE on page | Optional overdue query |
| Referral | History | `GET /children/:id/referrals` | `referralsControllerGetChildHistory` | **Yes** | Child detail | Not offset-paginated |
| Referral vs alerts | Follow-up alerts | `GET /alerts/follow-up` | `alertsControllerGetFollowUp` | **Separate domain** | Gukurikirana + Dashboard panel | No dismiss/ack |
| Dashboard | centers / children / attendance / nutrition / feeding / referrals KPIs | `GET /analytics/dashboard` | via `fetchMonitoringDashboard` | **Yes** (partial UI) | Already wired | STED not on dashboard DTO |
| Dashboard | registrations / dropouts | `/reports/enrollment`, `/reports/dropouts`, `/reports/district` | reports controllers | **Yes** | Wire into `useDashboardMonitoring` | Not on analytics dashboard DTO itself |
| Dashboard | Recent activity feed | — | — | **No** | Keep unavailable | Activity feed API |
| Dashboard | Late arrivals | — | — | **No** | Keep `—` | Field on attendance |
| Reports | enrollment / dropouts / centers / district previews | `/reports/*` | Orval reports | **Yes** | Already used in Reports LIVE | — |
| Reports | Attendance comparison | `/monitoring/attendance` | monitoring | **Yes** | Already LIVE | — |
| Reports | PDF/Excel export | — | — | **No** | Keep blocked | Export endpoints |
| Reports | Sectors report | — | — | **No** | Keep gap | `/reports/sectors` |
| Center detail | Header + snapshot KPIs | `GET /centers/:id` detail DTO | `centersControllerFindOne` | **Partial** | Map `caregiversCount`, attendance today, `pendingReferralsCount` | — |
| Center detail | children / attendance / referrals lists | children, attendance, referrals findAll with `centerId` | — | **Yes** | Optional drill sections (paginated) | — |
| Center detail | growth / STED operational grids | per-child history only | — | **No** at center list | Aggregates only | Center screening/STED lists |

---

## 3. Current District page dependency map

| Page | LIVE primary | MOCK | `useData()` | Aggregate APIs | Operational APIs |
| --- | --- | --- | --- | --- | --- |
| Children / Child Detail | React Query children | `useData()` | MOCK-only | — | `GET /children`, `GET /children/:id` |
| Attendance Monitoring | monitoring attendance | `useData()` + synthetic drill | MOCK-only | `/monitoring/attendance` | **was unused** → wire `GET /attendance` (+ children join for drill) |
| Growth Monitoring | monitoring nutrition | `useData()` rows/alerts | MOCK-only | `/monitoring/nutrition` | alerts API unused; no screening list |
| Referral Monitoring | monitoring referrals | `useData()` list | MOCK-only | `/monitoring/referrals` | **`GET /referrals` unused** |
| Gukurikirana | follow-up alerts | `ACTION_ALERTS` | none LIVE | — | `GET /alerts/follow-up` |
| Dashboard | analytics dashboard + nutrition monitoring | `useData()` builders | MOCK-only | dashboard + monitoring | reports for reg/dropout **miswired null** |
| Feeding / STED | monitoring | `useData()` | MOCK-only | monitoring | — |
| Reports | monitoring + `/reports/*` | `useData()` history | MOCK-only | both | attendance history gap |
| Center Detail | centers directory | mock charts/alerts | none LIVE | — | detail snapshot fields **miswired** |
| Settings | auth display | mock save | none | — | no write contract |

**Classification of remaining `useData()`:** legitimate MOCK wrappers only after Sprint 5.1 — keep. Do not use for LIVE primary state.

---

## 4. API evidence

### 4.1 Attendance — operational list

| Field | Value |
| --- | --- |
| HTTP | `GET /api/v1/attendance` |
| Controller (OpenAPI `operationId`) | `AttendanceController_findAll` |
| Query | `centerId?`, `childId?`, `startDate?`, `endDate?`, `from?`/`to?` (deprecated), `page?`, `pageSize?` (max 200), `limit?` (deprecated) |
| Response | `PaginatedAttendanceResponseDto` → `AttendanceResponseDto[]` (`present`, `absentReason`, ids, dates, version…) |
| Orval | `attendanceControllerFindAll` — `src/api/generated/endpoints/attendance/attendance.ts` |
| Resource | `fetchAttendanceList` — `src/api/resources/attendance.ts` |
| Current consumer | Caregiver attendance features; **not** District LIVE (pre-5.2) |

### 4.2 Attendance — monitoring aggregate

| Field | Value |
| --- | --- |
| HTTP | `GET /api/v1/monitoring/attendance` |
| Orval | `monitoringControllerAttendance` |
| Resource | `fetchMonitoringAttendance` |
| Consumer | `useAttendanceMonitoringView` → Attendance Monitoring page |

### 4.3 Nutrition / growth

| HTTP | Orval | Resource | Consumer |
| --- | --- | --- | --- |
| `GET /monitoring/nutrition` | `monitoringControllerNutrition` | `fetchMonitoringNutrition` | Growth + Dashboard |
| `GET /nutrition/alerts` | `nutritionControllerGetAlerts` | `fetchNutritionAlerts` | `useNutritionAlerts` (unused by Growth page) |
| `GET /children/:id/nutrition-history` | `nutritionControllerGetHistory` | `fetchNutritionHistory` / screening history | Caregiver / per-child |
| `GET /children/:id/growth-chart` | `nutritionControllerGetGrowthChart` | `fetchChildGrowthChart` | Per-child chart |
| `POST /children/:id/nutrition-screenings` | create | write path | Caregiver |

**No** district/center paginated screening list endpoint.

### 4.4 Referrals

| HTTP | Orval | Resource | Consumer |
| --- | --- | --- | --- |
| `GET /api/v1/referrals` | `referralsControllerFindAll` | `fetchReferralList` | Caregiver / **unused District LIVE list** |
| `GET /children/:id/referrals` | `referralsControllerGetChildHistory` | `fetchChildReferralHistory` | Per-child |
| `GET /monitoring/referrals` | `monitoringControllerReferrals` | `fetchMonitoringReferrals` | Referral Monitoring aggregates |
| `GET /alerts/follow-up` | `alertsControllerGetFollowUp` | `fetchFollowUpAlerts` | Gukurikirana LIVE |

Referral DTO includes `reason`, `destination`, `status` (`pending`\|`completed`\|`cancelled`). **No** `childName` / `centerName` on list DTO. **No** date query on findAll.

### 4.5 Dashboard / reports

| HTTP | Orval | Resource | Notes |
| --- | --- | --- | --- |
| `GET /analytics/dashboard` | analytics dashboard | `fetchMonitoringDashboard` | children, attendance, nutrition, referrals, feeding, `centersInScope` — **no** registrations/dropouts/STED |
| `GET /reports/enrollment` | `reportsControllerEnrollment` | `fetchEnrollmentReport` | `summary.newRegistrations` + trend |
| `GET /reports/dropouts` | `reportsControllerDropouts` | `fetchDropoutsReport` | `summary.dropouts` |
| `GET /reports/district` | `reportsControllerDistrict` | `fetchDistrictReport` | KPIs include both + STED assessments |
| `GET /reports/centers` | `reportsControllerCenters` | `fetchCentersReport` | Per-center snapshot |

### 4.6 Centers

| HTTP | Orval | Resource | Notes |
| --- | --- | --- | --- |
| `GET /centers/:id` | `centersControllerFindOne` | `getCenterDirectoryItem` | Detail DTO has `caregiversCount`, `attendancePresentToday`, `attendanceAbsentToday`, `pendingReferralsCount` — **mapper drops them** |

---

## 5. Contract gaps (prioritized)

### P0 — blocks a core District operational responsibility

1. **Paginated district/center nutrition screening list**  
   Growth Monitoring child roster / MUAC table cannot scale without N× `nutrition-history` fan-out (forbidden for District LIVE).  
   **Required (recommended):**  
   `GET /api/v1/nutrition/screenings?centerId&from&to&nutritionStatus&page&pageSize`  
   Response: screening rows with child identity, anthropometrics, status.

### P1 — important but workaround or secondary surface exists

1. **`GET /referrals` date range (`from`/`to`)** — list cannot filter by referral date server-side; monitoring covers aggregates only.  
2. **Referral list enrichment** — `childName` / `centerName` on list DTO (UI can link by id / map centers from monitoring).  
3. **Analytics dashboard registrations/dropouts** — fields absent on dashboard DTO (workable via `/reports/*`).  
4. **Center child-day attendance roster** — dedicated endpoint would avoid join + pagination edge cases for large centers.  
5. **Alert dismiss/ack mutations** — Gukurikirana remains read-only.  
6. **Report PDF/Excel export endpoints.**

### P2 — nice-to-have / polish

1. Attendance `present` query param.  
2. Nutrition alerts offset pagination.  
3. STED on analytics dashboard DTO (available via `/monitoring/sted` / district report).  
4. Recent activity feed API.  
5. Late-arrivals metric.  
6. `/reports/sectors`.  
7. Center-scoped STED / growth operational grids.

---

## 6. Filter discipline (LIVE)

| Filter | Classification | Notes |
| --- | --- | --- |
| Attendance date | SERVER-SIDE | monitoring `from`/`to`; operational `startDate`/`endDate` |
| Attendance center | SERVER-SIDE | both APIs |
| Attendance submission status | CLIENT-SIDE SAFE | derived from aggregate rows |
| Attendance child status (present/absent/unrecorded) | CLIENT-SIDE SAFE | after scoped join |
| Referral status / sourceType / centerId / childId | SERVER-SIDE | findAll |
| Referral overdue | UNSUPPORTED as server filter | disable or page-local only |
| Referral sector | UNSUPPORTED | no sector on API (already disabled) |
| Growth center | SERVER-SIDE | monitoring |
| Growth yearMonth | SERVER-SIDE once wired to `from`/`to` | was miswired |
| Growth search / age / status on child rows | UNSUPPORTED without screening list | disable in LIVE |
| Dashboard period | SERVER-SIDE | analytics + reports date range |

---

## 7. Backend contract gap templates (do not implement in 5.2)

### BACKEND CONTRACT GAP — Nutrition screening list

```text
Endpoint required:
GET /api/v1/nutrition/screenings

Required query fields:
centerId?, districtId?, childId?, from?, to?, nutritionStatus?, page, pageSize

Required response fields:
items[{ id, childId, childName?, centerId, centerName?, screeningDate, weightKg, muacCm, heightCm?, nutritionStatus, requiresReferral }],
total, page, pageSize, totalPages

Why existing contract is insufficient:
Monitoring paginates centers, not screenings. Per-child history requires unbounded fan-out for District roster.

Affected District workflow:
GrowthMonitoringPage child table / history; Reports nutrition child drill-ins.

Recommended backend implementation:
Query ChildNutritionScreening joined to Child/Center with scope + pagination.
```

### BACKEND CONTRACT GAP — Referral date filter

```text
Endpoint required:
Extend GET /api/v1/referrals with from?&to? (referralDate)

Why insufficient:
Operational list cannot scope by date; only monitoring aggregates accept from/to.

Affected workflow:
ReferralMonitoringPage date-scoped operational list.
```

---

## 8. Implementation completed (Sprint 5.2)

Frontend-only work shipped:

1. **Attendance** — `useDistrictAttendanceList` / `useDistrictCenterDayAttendanceRoster`; LIVE center drill-down joins paginated `GET /children?centerId` with scoped `GET /attendance` (no LocalStore).
2. **Referrals** — `useDistrictReferralList` wires `GET /referrals` with status/source/pagination; monitoring aggregates retained; overdue is page-local client filter; sector remains unsupported in LIVE.
3. **Dashboard** — registrations/dropouts from `useEnrollmentReport` + `useDropoutsReport` (same date range as analytics dashboard).
4. **AlertsPanel** — LIVE uses `useFollowUpAlerts` (`GET /alerts/follow-up`).
5. **Growth** — `yearMonth` → monitoring `from`/`to`; LIVE nutrition alerts via `GET /nutrition/alerts`; child screening table remains honest Unavailable (backend gap).
6. **Center detail** — maps detail snapshot KPIs (`attendancePresentToday`, `attendanceAbsentToday`, `pendingReferralsCount`, `caregiversCount`, `phone`).
7. **Query keys** — `district.attendance.*`, `district.referrals.*`, `district.nutrition.alerts`, etc.
8. **Tests** — `src/features/district/operational-reads.contract.test.ts` + attendance contract update.

**Not changed:** backend, OpenAPI, caregiver LocalStore, MOCK mode, NCDA Admin, GIS, exports.

---

## SPRINT 5.2 STATUS

```text
Phase 0 audit: COMPLETE
Frontend implementation: PARTIAL

Backend changed: NO
OpenAPI changed: NO

District LIVE still uses caregiver useData(): NO (MOCK wrappers only)
District LIVE still uses LocalStore for primary data: NO
Mock leakage in LIVE: NO

Attendance operational reads: READY
Growth operational reads: GAP (aggregates + alerts READY; screening list GAP)
Nutrition operational reads: GAP (alerts READY; paginated screenings GAP)
Referral operational reads: READY (date filter GAP; childName enrichment P1)
Dashboard registrations/dropouts: READY
Reports: PARTIAL (previews READY; exports/sectors GAP)
Center drilldowns: PARTIAL (snapshot KPIs READY; charts/activity GAP)

Tests: 140/141 PASS (1 pre-existing timeout in src/sync/field-readiness.test.ts — unrelated)
District/sprint 5.2 contract tests: 13/13 PASS
Build: PASS
Lint: FAIL (pre-existing debt — 145 problems; 0 new errors on Sprint 5.2 touched files when eslint'd in isolation)

P0:
- Paginated district/center nutrition screening list (Growth child roster)

P1:
- GET /referrals from/to date filter
- Referral list childName/centerName enrichment
- Dedicated center child-day attendance roster (optional; join works)
- Alert dismiss/ack mutations
- Report PDF/Excel export endpoints

P2:
- Attendance present query param
- Nutrition alerts pagination
- STED on analytics dashboard DTO
- Recent activity feed
- Late arrivals
- /reports/sectors

Next recommended sprint:
Sprint 5.3 — Backend contract for nutrition screening list + referral date filters (and optionally center child-day attendance roster), then wire remaining Growth/Reports child drill-ins. Do not start NCDA Admin / GIS unless scheduled separately.
```
