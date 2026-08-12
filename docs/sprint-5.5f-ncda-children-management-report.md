# Sprint 5.5F — NCDA Children & Operational Management

**Date:** 2026-08-11  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Continues from:** Sprint 5.5E (`docs/sprint-5.5e-ncda-centers-management-report.md`)

---

## 1. Executive verdict

```text
READY WITH CONDITIONS
```

`/ncda/children` and `/ncda/children/:childId` are real NCDA national oversight surfaces. The list uses **server-paginated** `GET /children` with server-side search, center, and status filters. **District filtering** was added to the backend contract (`districtId` via `center.districtId`) and wired in the frontend; it requires **backend deploy** before LIVE returns 200 (pre-deploy probe: `400 property districtId should not exist`).

Detail uses `GET /children/:id` plus child-scoped operational histories. No LocalStore, no `useData()`, no national bulk hydration, no N+1 fan-out.

**Condition:** deploy the children `districtId` list filter before treating district filtering as production-complete. LIVE dataset currently returns `total=0` children (empty list/empty states work; detail/ops smoke skipped for lack of rows).

---

## 2. Contract matrix

| Requirement | Existing API | Classification | Notes |
| ----------- | ------------ | -------------- | ----- |
| National child list | `GET /children` | **FRONTEND IMPLEMENTABLE** | DB pagination ≤100 |
| Search | `search` | **SERVER-SIDE** | name / registration number |
| Center filter | `centerId` | **SERVER-SIDE** | Ready |
| District filter | **`districtId` added** | **FRONTEND IMPLEMENTABLE** after BE deploy | Was **EXISTING API BUT INSUFFICIENT** (audit P1.2) |
| Status filter | `status` active/transferred/archived | **SERVER-SIDE** | Ready |
| Registration date filter | — | **UNSUPPORTED** | Not invented; no UI control |
| Child detail | `GET /children/:id` | **FRONTEND IMPLEMENTABLE** | Identity + guardians + geo |
| Attendance history | `GET /attendance?childId=` | **FRONTEND IMPLEMENTABLE** | Paginated |
| Growth/nutrition | `GET /nutrition/screenings?childId=` | **FRONTEND IMPLEMENTABLE** | Paginated |
| STED history | `GET /children/:id/sted-history` | **FRONTEND IMPLEMENTABLE** | Paginated |
| Referrals | `GET /referrals?childId=` | **FRONTEND IMPLEMENTABLE** | Paginated |
| Feeding history | center-level only | **BACKEND CONTRACT GAP** | UI: Unavailable |
| Transfer history by child | incoming/outgoing by center only | **BACKEND CONTRACT GAP** | UI: Unavailable |
| Create/update/archive/transfer | REST exists | **FRONTEND IMPLEMENTABLE** (deferred) | No mutation UI this sprint |

---

## 3. Backend changes

| Area | Change |
|------|--------|
| DTO | `ListChildrenQueryDto.districtId?: string` |
| Service | `assertDistrictAccess`; filter `center.districtId`; reject mismatched `centerId`+`districtId` |
| Controller | Swagger description mentions `districtId` |
| Tests | `children.list-district.spec.ts` (NCDA allow, DFP deny foreign, mismatch 400) |
| Migrations | **NO** |
| OpenAPI | Regenerated via `scripts/export-openapi.js` |
| Orval | Synced + regenerated on frontend |

Unacceptable scope avoided: no schema redesign, no caregiver/sync changes, no auth redesign.

---

## 4. Frontend changes

| Area | Path |
|------|------|
| Routes | `/ncda/children`, `/ncda/children/:childId` |
| Pages | `NcdaChildrenPage.tsx`, `NcdaChildDetailPage.tsx` |
| Hooks | `src/features/ncda/children/queries.ts` |
| Resource | `children.ts` — `districtId`, pageSize clamp, `fetchChildrenTotal` |
| Query keys | `queryKeys.ncda.children.*` |
| Copy | `locales/rw/ncda.ts` → `children.*` |
| Nav | children `matchPaths` |
| Tests | `children.contract.test.ts` |
| Smoke | `scripts/sprint-55f-children-smoke.mjs` |

Architecture:

```text
NcdaChildrenPage / NcdaChildDetailPage
  → ncda.children.* hooks
  → React Query
  → children / geo / attendance / nutrition / sted / referrals resources
  → Orval
  → NestJS
```

Center filter discipline: center dropdown requires a district first and loads `GET /centers?districtId=` (≤100 + server search) — never national centers.

---

## 5. Authorization & privacy

- NCDA routes remain `allowedRole="ncda"`.
- Backend: caregiver/DFP still scoped by `resolveScope`; `districtId` uses `assertDistrictAccess` (caregiver denied; DFP own district only; NCDA national).
- No permission broadening.
- Detail shows operational directory fields already on child DTOs (no password/device/sync secrets).

---

## 6. Performance

| Pattern | Handling |
|---------|----------|
| List | DB `skip`/`take`; pageSize ≤100 |
| Network totals | `pageSize=1` ×2 |
| Center options | district-scoped + search; capped at 100 with note |
| Ops histories | enabled only for selected section; pageSize=10 |
| National bulk / N+1 | **not used** |

---

## 7. Mutations

Documented only — **not implemented** in NCDA UI:

- create / update / archive / reactivate / soft-delete / transfers APIs already exist for authorized roles
- NCDA Children sprint is oversight read, not caregiver registration

---

## 8. Tests & verification

| Check | Result |
|-------|--------|
| Frontend `npm run test` | **210/210 PASS** |
| Backend `children.list-district.spec.ts` | **PASS** |
| `npm run build` | **PASS** |
| Lint (sprint-touched) | **PASS** |
| Lint (full repo) | Pre-existing failures outside scope |
| LIVE smoke | List/search/status **200**; `districtId` **400** pre-deploy; children `total=0` in LIVE dataset |

---

## 9. Remaining gaps

### P0

- Deploy backend children `districtId` filter to the environment the frontend targets.

### P1

- Seed / confirm LIVE child data for operational smoke of detail histories.
- Optional registration-date range filter if product requires it.
- Child-scoped transfer history API if transfer timeline is required on detail.

### P2

- Child-scoped feeding history (feeding remains center-day today).
- NCDA child mutation UI (archive/transfer) if governance editing is required.
- Full-repo lint cleanup.

---

## 10. Explicit non-goals (honored)

NCDA Users, Compliance, WASH, exports, District redesign, caregiver offline / SyncEngine, Sprint 5.5G — **not started**.

---

```text
SPRINT 5.5F STATUS

Verdict:
READY WITH CONDITIONS

Child list:
READY

Child search:
READY

District filtering:
PARTIAL

Center filtering:
READY

Child detail:
READY

Attendance history:
READY

Growth/Nutrition history:
READY

Feeding history:
GAP

STED history:
READY

Referral history:
READY

Child mutations:
GAP

Backend changed:
YES

OpenAPI changed:
YES

Prisma migration:
NO

National bulk hydration:
NO

LocalStore:
NO

Mock leakage:
NO

Tests:
210/210 PASS

Build:
PASS

Lint:
PASS (sprint-touched); full-repo FAIL pre-existing

Remaining P0:
Deploy children districtId list filter

Remaining P1:
LIVE child data for ops smoke; optional registeredAt filter; child transfer history API

Remaining P2:
Child-scoped feeding history; NCDA mutation UI; full-repo lint cleanup

Recommended next sprint:
5.5G — NCDA Users management (paginated national user admin against existing Users APIs), after deploying 5.5F districtId
```
