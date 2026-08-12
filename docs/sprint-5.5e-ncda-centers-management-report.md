# Sprint 5.5E — NCDA Centers Management

**Date:** 2026-08-11  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Continues from:** Sprint 5.5D deployment gate (`docs/sprint-5.5e-ncda-centers-management-report.md` precondition — overwritten by this implementation report; gate remains CLOSED)

---

## 1. Executive verdict

```text
COMPLETE
```

`/ncda/centers` and `/ncda/centers/:centerId` are real NCDA national governance surfaces. The list uses **server-paginated** `GET /centers` with **server-side** search, district filter, and `status` filter. Detail uses `GET /centers/:id` for identity + today snapshots, `GET /analytics/dashboard?centerId=` for period aggregates, and **center-scoped** operational pages (`children`, `attendance`, `nutrition/screenings`, `feeding`, `referrals`). No national bulk hydration, no N+1 list pattern, no LocalStore / mock fallback in LIVE.

**Backend changes:** none required — existing Centers / Analytics / operational contracts were sufficient.

---

## 2. Contract matrix

| Requirement | Existing API | Classification | Notes |
| ----------- | ------------ | -------------- | ----- |
| Center list | `GET /centers` | **FRONTEND IMPLEMENTABLE** | DB `skip`/`take`; `total`/`totalPages` |
| Pagination | `page`, `pageSize` ≤100 | **FRONTEND IMPLEMENTABLE** | FE clamps ≤100 |
| Search | `search` (name/code/phone) | **SERVER-SIDE** | Debounced input |
| District filter | `districtId` | **SERVER-SIDE** | District options via `GET /districts?pageSize=100` (≤30 districts) |
| Status filter | `status` (`active`/`inactive`) | **SERVER-SIDE** | Enum `EcdCenterStatus` — not inventing `isActive` |
| Custom sort | — | **UNSUPPORTED** | BE fixed `orderBy name asc`; no UI sort control |
| Center detail identity | `GET /centers/:id` | **FRONTEND IMPLEMENTABLE** | name, code, district, village, province, status, phone, capacity, lat/lng |
| Today snapshots | same detail DTO | **FRONTEND IMPLEMENTABLE** | caregivers, present/absent today, pending referrals |
| Period KPIs | `GET /analytics/dashboard?centerId=` | **FRONTEND IMPLEMENTABLE** | Aggregate only |
| Children drilldown | `GET /children?centerId=` | **FRONTEND IMPLEMENTABLE** | Paginated |
| Attendance drilldown | `GET /attendance?centerId=` | **FRONTEND IMPLEMENTABLE** | Paginated |
| Nutrition drilldown | `GET /nutrition/screenings?centerId=` | **FRONTEND IMPLEMENTABLE** | Paginated |
| Feeding drilldown | `GET /centers/:id/feeding` | **FRONTEND IMPLEMENTABLE** | Paginated |
| Referrals drilldown | `GET /referrals?centerId=` | **FRONTEND IMPLEMENTABLE** | Paginated |
| STED list by center | no center list endpoint | **BACKEND CONTRACT GAP** (P2) | UI: Unavailable |
| Compliance / WASH | APIs exist; sprint non-goal | **OUT OF SCOPE** | UI: Unavailable |
| Create center | — | **BACKEND CONTRACT GAP** (P1) | Not invented |
| Update / activate | `PATCH /centers/:id` (CAS `version`) | **FRONTEND IMPLEMENTABLE** (deferred) | Documented; no fake toggle UI |
| Archive center | soft-delete not exposed for NCDA ops | **BACKEND CONTRACT GAP** (P2) | — |

---

## 3. APIs inspected

| Area | Evidence |
|------|----------|
| Prisma `EcdCenter` | `status` enum; `districtId` indexed; soft `deletedAt` |
| `CentersController` | `GET /`, `GET /:id`, `PATCH /:id` — roles include `ncda_admin` |
| `ListCentersQueryDto` | `districtId`, `status`, `search`, `page`, `pageSize` |
| `CenterDetailResponseDto` | identity + caregivers + today attendance + pending referrals |
| `CentersService.findAll` | transactional `findMany` + `count` with `skip`/`take` — **safe at national scale** |
| Children / Attendance / Nutrition / Referrals / Feeding | `centerId` filters + pagination |
| Analytics dashboard | optional `centerId` scope |
| STED controller | child history + get-by-id only — **no center list** |
| OpenAPI / Orval | already reflected; no regen required this sprint |

---

## 4. APIs used (LIVE)

```text
GET /centers?page=&pageSize=&search=&districtId=&status=
GET /centers/:id
GET /centers?page=1&pageSize=1[&status=active]          → network totals
GET /districts?page=1&pageSize=100                      → district filter options
GET /analytics/dashboard?centerId=&from=&to=
GET /children?centerId=&page=&pageSize=
GET /attendance?centerId=&page=&pageSize=
GET /nutrition/screenings?centerId=&page=&pageSize=
GET /centers/:id/feeding?page=&pageSize=
GET /referrals?centerId=&page=&pageSize=
```

Intentionally **not** used for NCDA Centers:

```text
loadCenters('all') / monitoring national center tables
GET /reports/centers (in-memory national page)
fetchAllAttendance / fetchAllReferrals
district.centers.* query keys as primary NCDA namespace
```

---

## 5. Backend changes

```text
NONE
```

No Prisma migration. No OpenAPI delta. No NestJS controller/service edits.

---

## 6. Frontend changes

| Area | Path |
|------|------|
| Routes | `/ncda/centers`, `/ncda/centers/:centerId` under `ProtectedRoute allowedRole="ncda"` |
| Pages | `NcdaCentersPage.tsx`, `NcdaCenterDetailPage.tsx` |
| Hooks | `src/features/ncda/centers/queries.ts` |
| Resource | `src/api/resources/centers.ts` — `listCentersPage`, `getCenterDetail`, page clamp |
| Query keys | `queryKeys.ncda.centers.{list,detail,summary,children,attendance,nutrition,feeding,referrals,network}` |
| Copy | `locales/rw/ncda.ts` → `centers.*` |
| Nav | centers `matchPaths` for detail highlight |
| District detail | center name links → `/ncda/centers/:id` |
| Tests | `centers.contract.test.ts` |
| Smoke | `scripts/sprint-55e-centers-smoke.mjs` |

Architecture:

```text
NcdaCentersPage / NcdaCenterDetailPage
  → ncda.centers.* hooks
  → React Query
  → centers / geo / monitoring / children / attendance / nutrition / feeding / referrals resources
  → Orval
  → NestJS
```

---

## 7. Authorization

- NCDA routes remain `allowedRole="ncda"`; fail-closed role boundary unchanged.
- Backend centers list: caregiver → own center; DFP → forced district; `ncda_admin` → national with optional `districtId`.
- Caregiver / `district_focal_person` cannot enter NCDA shell via FE role mapping.
- No permission broadening.

---

## 8. Performance / national-scale safety

| Pattern | Handling |
|---------|----------|
| List | DB pagination; LIVE smoke `total=39445`, `items=10` |
| Network totals | `pageSize=1` twice (all + active) |
| District filter options | one `GET /districts` page (≤100) — not centers |
| Detail ops | each section enabled only when selected; `pageSize=10` |
| N+1 | **not introduced** |
| National bulk | **not used** |
| Sorting | server default name asc only |

---

## 9. Mutations

| Mutation | Backend | FE in 5.5E |
|----------|---------|------------|
| Create center | **GAP** | Not implemented |
| Update center | `PATCH /centers/:id` + CAS | Documented only |
| Activate/deactivate | via `status` on PATCH | No fake toggle |
| Archive | no dedicated NCDA archive API | Documented gap |

---

## 10. Tests & verification

| Check | Result |
|-------|--------|
| `npm run test` | **201/201 PASS** (21 files) |
| `npm run build` | **PASS** (`tsc -b` + vite) |
| Lint (sprint-touched) | **PASS** |
| Lint (full repo) | **FAIL** — pre-existing (generated Orval, etc.); unchanged by this sprint |
| LIVE smoke (`sprint-55e-centers-smoke.mjs`) | **PASS** — list/search/status/district/detail/ops + missing 404 |

Smoke excerpt:

```text
login 201
centers page1 200 total=39445 items=10
centers search 200 total=28102 items=5
centers active 200 total=39445 items=1
centers by district 200 total=373 items=10
center detail 200
dashboard / children / attendance / nutrition / feeding / referrals — 200
center missing 404
```

---

## 11. Remaining gaps

### P0

- None for Centers Management browse/read path.

### P1

- Create center REST if product requires in-app org onboarding.
- Optional NCDA center update UI (PATCH + CAS) if governance editing is required.

### P2

- Center-scoped STED assessment list API (today: Unavailable).
- Dedicated archive/soft-delete admin endpoint if required.
- Province name enrichment already on detail; list could optionally include province without N+1 if BE adds it.
- Full-repo lint cleanup (pre-existing).

---

## 12. Explicit non-goals (honored)

NCDA Children portal, Users, Compliance UI, WASH UI, GIS, exports, reporting rewrite, caregiver offline / SyncEngine, auth redesign, Sprint 5.5F — **not started**.

---

## 13. Success criteria checklist

```text
[x] NCDA Centers page is a real national operational surface
[x] Center list is server-paginated (safe at ~39k)
[x] Search / district / status are server-side
[x] Center detail establishes identity from real contract
[x] Operational sections only where contracts exist
[x] Unsupported sections marked Unavailable
[x] No national bulk hydration / N+1
[x] ncda.centers.* query namespace (not district.centers primary)
[x] NCDA LIVE does not use LocalStore / mock fallback
[x] MOCK mode remains intact (LiveUnavailableState on NCDA centers)
[x] Authorization remains national + fail-closed
[x] Tests / build pass; lint clean on touched files
[x] Report documents mutations gaps honestly
```

---

```text
SPRINT 5.5E STATUS

Verdict:
COMPLETE

Center list:
READY

Center search:
READY

District filtering:
READY

Status filtering:
READY

Center detail:
READY

Center operational drilldowns:
PARTIAL

Center mutations:
GAP

Backend changed:
NO

OpenAPI changed:
NO

Prisma migration:
NO

National bulk hydration:
NO

N+1 queries introduced:
NO

LocalStore used by NCDA LIVE:
NO

Mock leakage:
NO

Tests:
201/201 PASS

Build:
PASS

Lint:
PASS (sprint-touched); full-repo FAIL pre-existing

Remaining P0:
None

Remaining P1:
Create center REST if product requires; optional PATCH UI with CAS for status/profile edits

Remaining P2:
Center-scoped STED list API; archive API; full-repo lint cleanup

Recommended next sprint:
5.5F — NCDA Users management (list/create/reset against existing Users APIs), keeping national-scale pagination discipline
```
