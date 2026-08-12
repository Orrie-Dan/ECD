# Sprint 5.3 — District Operational Contract Completion Report

**Date:** 2026-08-11  
**Scope:** Nutrition screening paginated operational read + referral date-range filtering  
**Backend:** `D:\Esri\ECD Backend`  
**Frontend:** `D:\Esri\ECD`

---

## Executive verdict

```text
COMPLETE
```

Both Sprint 5.2 P0/P1 contract gaps targeted by this sprint are closed with production-quality, scoped, paginated APIs and District LIVE wiring. No caregiver offline architecture changes. No Prisma migration (existing indexes suffice).

---

## Backend changes

| Area | Files |
| --- | --- |
| Nutrition list DTO | `src/modules/nutrition/dto/list-nutrition-screenings-query.dto.ts` **(new)** |
| Nutrition list response | `src/modules/nutrition/dto/nutrition-screening-list-response.dto.ts` **(new)** |
| Nutrition controller | `src/modules/nutrition/nutrition.controller.ts` — `GET nutrition/screenings` |
| Nutrition service | `src/modules/nutrition/nutrition.service.ts` — `listScreenings` |
| Referral query DTO | `src/modules/referrals/dto/list-referrals-query.dto.ts` — `from`/`to` |
| Referral service | `src/modules/referrals/referrals.service.ts` — `referralDate` range + validation |
| Tests | nutrition + referral service specs extended |

**Schema / migration:** none (screenings filter via `child.centerId`; `referralDate` already indexed).

---

## API contract

### Nutrition screenings

| Field | Value |
| --- | --- |
| Method / route | `GET /api/v1/nutrition/screenings` |
| Auth | Bearer JWT; roles: `caregiver`, `district_focal_person`, `ncda_admin` |
| Scope | `SyncAccessService.resolveScope` → filter `child.centerId` (NCDA = all; district = district centers; caregiver = own center). Optional `centerId` re-checked with `assertCenterAccess`. |
| Query | `centerId?`, `childId?`, `from?`, `to?` (inclusive UTC date-only on `screeningDate`), `nutritionStatus?`, `page` (default 1), `pageSize` (default 50, max 200) |
| Defaults | **No default date window** (omit both → all dates in scope) |
| Invalid range | `400` if `from > to` |
| Response | `{ items, total, page, pageSize, totalPages }` |
| Item fields | screening id + measurements + status + `childFullName`, `childDateOfBirth`, `childGender`, `centerId`, `centerName`, `recordedById`, `version`, `createdAt` |

### Referral date filter

| Field | Value |
| --- | --- |
| Method / route | `GET /api/v1/referrals` (extended) |
| New params | `from?`, `to?` |
| Authoritative field | **`referralDate`** (`@db.Date`) — not `createdAt` |
| Semantics | Inclusive UTC date-only (`YYYY-MM-DD` → `T00:00:00.000Z`); either bound alone allowed; **no default range** (backwards compatible) |
| Invalid range | `400` if `from > to` |
| Index | Existing `@@index([referralDate])` |

---

## Frontend changes

| Layer | Change |
| --- | --- |
| OpenAPI / Orval | Synced + regenerated (`nutritionControllerListScreenings`, referral `from`/`to`) |
| Resource | `fetchNutritionScreeningList`; referral list passes `from`/`to` |
| Mapper | `mapScreeningListItemToViewModel`, `mapPaginatedScreeningsToViewModel` |
| Models | `src/models/nutrition-screenings.ts`; `ReferralListFilters.from/to` |
| Hooks | `useDistrictNutritionScreenings` |
| Query keys | `district.nutrition.screenings` |
| Growth page | LIVE table from screening API; server filters center/month/status; search/age disabled in LIVE |
| Referral page | LIVE date inputs → server `from`/`to` |
| Filter bar | `liveMode` disables unsupported search/age |
| Tests | `sprint-5.3-contract.contract.test.ts`; 5.2 growth assertion updated |

---

## Filter discipline (Growth LIVE)

| Filter | Classification |
| --- | --- |
| Center | **SUPPORTED SERVER FILTER** |
| Month (`yearMonth` → `from`/`to`) | **SUPPORTED SERVER FILTER** |
| Nutrition status | **SUPPORTED SERVER FILTER** |
| Search | **UNSUPPORTED** (disabled in LIVE) |
| Age group | **UNSUPPORTED** (disabled in LIVE) |

---

## Contract gaps remaining

### P0

None for this sprint’s objectives.

### P1

1. Report PDF/Excel export endpoints  
2. Alert dismiss/ack mutations  
3. Referral list `childName` / `centerName` enrichment (still id/link + monitoring center map)  
4. Optional dedicated center child-day attendance roster (join works today)

### P2

1. Attendance `present` query param  
2. Nutrition alerts offset pagination  
3. STED on analytics dashboard DTO  
4. Recent activity feed / late arrivals  
5. `/reports/sectors`  
6. Standalone `screeningDate` index if district-wide date sorts become hot

---

## Regression

- Caregiver offline / LocalStore / SyncEngine / outbox: **unchanged**
- MOCK District paths: **unchanged**
- Attendance, Dashboard, Center Detail, Alerts: **not intentionally modified** beyond Growth/Referrals wiring

---

## SPRINT 5.3 STATUS

```text
SPRINT 5.3 STATUS

Verdict:
COMPLETE

Nutrition screening operational API:
READY

Nutrition District Growth table:
READY

Referral date filtering:
READY

Growth drill-ins:
PARTIAL (table READY; per-child history still via existing child endpoints)

Reports:
PARTIAL (unchanged; exports still GAP)

Backend changed:
YES

OpenAPI changed:
YES

Prisma migration:
NO

Caregiver offline architecture changed:
NO

District LIVE uses caregiver LocalStore for primary data:
NO

District LIVE uses useData() for primary data:
NO (MOCK wrappers only)

Mock leakage in LIVE:
NO

Tests:
Backend nutrition: 9/9 service + mapper/sync PASS
Backend referrals: 13/13 service + mapper/sync PASS
Frontend district contracts: 15/15 PASS
Build:
PASS

Lint:
FAIL (pre-existing repo debt; Sprint 5.3 touched files clean when eslint'd in isolation)

Remaining P0:
(none for Sprint 5.3 objectives)

Remaining P1:
- Report file export endpoints
- Alert dismiss/ack mutations
- Referral list childName/centerName enrichment
- Optional dedicated attendance child-day roster

Remaining P2:
- Attendance present query param
- Nutrition alerts pagination
- STED on analytics dashboard DTO
- Recent activity / late arrivals
- /reports/sectors
- Optional screeningDate index

Recommended next sprint:
Do not start NCDA Admin automatically. Prefer a focused Reports/export + alert mutations sprint, or NCDA Admin only if product prioritizes it separately from District ops.
```
