# Sprint 5.5J — District Caregiver Account Management Report

**Date:** 2026-08-12  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend` (no changes)  
**Continues from:** Sprint 5.5G (NCDA users governance), Sprint 5.5I (NCDA contracts)

---

## 1. Executive verdict

```text
COMPLETE
```

District Focal Persons now have a dedicated **Abakoresha** surface to manage **caregiver** accounts within their district scope, using the existing `Users` API. NCDA governance, caregiver offline/sync, and District monitoring/reporting were not modified.

---

## 2. Contract audit

| Capability | Existing contract | Frontend | Sufficient? |
|------------|-------------------|----------|-------------|
| List caregivers | `GET /users` — `role`, `centerId`, `status`, `search`, `page`, `pageSize`; DFP auto district scope | `useDistrictCaregiversList` | **Yes** |
| Create caregiver | `POST /users` — `username`, `fullName`, `phone?`, `role=caregiver`, `centerId` | `createDistrictCaregiver` | **Yes** |
| User detail | `GET /users/:id` — scoped via `requireVisibleUser` | `useDistrictCaregiverDetail` | **Yes** |
| Update profile/status | `PATCH /users/:id` — `fullName`, `phone`, `status` (no role/scope) | Detail edit form | **Yes** |
| Reset password | `POST /users/:id/reset-password` — DFP caregivers in district only | Reset button + one-time temp password | **Yes** |
| Center filter (list) | `centerId` query param | Server-side select + search on centers dropdown | **Yes** |
| Center options | `GET /centers` — DFP auto district scope, paginated | `listCentersPage` pageSize 100 | **Yes** |
| District scoping | Backend `buildListWhere` + `resolveScopeForRole` | No client bypass | **Yes** |

Classification: all requirements **FRONTEND IMPLEMENTABLE**. No backend changes required.

---

## 3. Frontend changes

### Routes

| Route | Page |
|-------|------|
| `/district/abakoresha` | `DistrictCaregiversPage` |
| `/district/abakoresha/:userId` | `DistrictCaregiverDetailPage` |

Protected by `allowedRole="districtOfficer"`.

### Navigation

- Sidebar: **Abakoresha** (`district.nav.caregivers`) after Ibigo

### Pages & components

- `src/pages/district/DistrictCaregiversPage.tsx` — list, filters, create form, pagination
- `src/pages/district/DistrictCaregiverDetailPage.tsx` — identity, PATCH status/profile, reset password
- `src/components/district/TempPasswordBanner.tsx` — one-time temp password display
- `src/pages/district/CenterDetailPage.tsx` — `CenterCaregiversSection` + **Add caregiver** link with `centerId` preselected

### Hooks (`features/district/users/queries.ts`)

- `useDistrictCaregiversList` — always `role: caregiver`
- `useDistrictCaregiverDetail`
- `useDistrictCaregiverCenterOptions` — district-scoped `GET /centers`
- `useDistrictCreateCaregiver`, `useDistrictUpdateCaregiver`, `useDistrictResetCaregiverPassword`

### Query keys

- `district.keys.users.list`, `detail`, `centerOptions`
- `queryStaleTimes.districtUsers` = 30s

### Resource layer

- `DISTRICT_CREATABLE_ROLES = ['caregiver']`
- `createDistrictCaregiver()` — separate from NCDA `createUser()` guard
- Reuses `listUsersPage`, `getUser`, `updateUser`, `resetUserPassword`

### Locales

- `district.nav.caregivers`, `district.caregivers.*`

### Tests

- `src/features/district/caregiver-governance.contract.test.ts` — **9/9 PASS**

---

## 4. Security

| Topic | Implementation |
|-------|----------------|
| District scoping | Backend authoritative; list forced to DFP district; create requires valid `centerId` in district |
| Role restrictions | UI: fixed `caregiver`; no DFP/NCDA role selectors |
| Sensitive data | No password hashes/tokens in UI or query cache |
| Temporary password | Local component state only; not in React Query, LocalStore, or localStorage |
| Route isolation | `/district/abakoresha` behind `districtOfficer`; NCDA routes unchanged |

---

## 5. Backend

| Item | Status |
|------|--------|
| Backend changed | **NO** |
| OpenAPI changed | **NO** |
| Prisma migration | **NO** |

Authorization reuses existing `UsersService.canCreateRole` / `canResetPassword` matrix from Sprint 5.5G.

---

## 6. Remaining gaps

### P0

None.

### P1

- Center dropdown capped at 100 centers per search page (existing API limit); very large districts may need center search refinement UX
- Mobile bottom nav does not include Abakoresha (sidebar + direct URL only)

### P2

- No dedicated MOCK caregiver admin dataset (LIVE shows `LiveUnavailableState` in MOCK mode, consistent with other District LIVE surfaces)

---

## SPRINT 5.5J STATUS

Verdict:
COMPLETE

Caregiver list:
READY

Caregiver search:
READY

Center filtering:
READY

Caregiver creation:
READY

Caregiver detail:
READY

Password reset:
READY

Activation/deactivation:
READY

Center Detail "Add caregiver":
READY

District authorization:
PASS

Route isolation:
PASS

Temporary password security:
PASS

Backend changed:
NO

OpenAPI changed:
NO

Prisma migration:
NO

Caregiver offline architecture changed:
NO

District LIVE uses LocalStore:
NO

District LIVE uses useData():
NO

Mock leakage in LIVE:
NO

National bulk hydration:
NO

Tests:
9/9 PASS (contract); full suite not re-run in this sprint close-out

Build:
PASS

Lint:
Not re-run (repo-wide pre-existing failures)

Remaining P0:
None

Remaining P1:
Center dropdown 100-item cap; Abakoresha not on mobile bottom nav

Remaining P2:
MOCK mode unavailable surface for caregiver admin

Recommended next sprint:
District operational follow-ups (per-center monitoring pagination) or export architecture — not automatic
