# Sprint 5.5A — NCDA Admin Role Separation & Authentication Boundary

**Date:** 2026-08-11  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend` (authorization unchanged)  
**Continues from:** `docs/sprint-5.5-ncda-admin-architecture-audit.md`

---

## 1. Executive summary

Sprint 5.5A establishes a **secure NCDA application identity and route boundary**. It does **not** implement NCDA Admin product features.

```text
BEFORE:  ncda_admin → districtOfficer → /district/*
AFTER:   ncda_admin → ncda → /ncda
```

District and caregiver portals remain on their existing UI role names (`districtOfficer`, `caretaker`) to avoid a broad District freeze refactor. Backend JWT/`UserRole` semantics are unchanged.

---

## 2. Role architecture

| Backend role (`UserRole`) | Application (UI) role | Home route | Backend scope (unchanged) |
|---------------------------|----------------------|------------|---------------------------|
| `caregiver` | `caretaker` | `/caretaker` | Own center |
| `district_focal_person` | `districtOfficer` | `/district` | District centers |
| `ncda_admin` | **`ncda`** | **`/ncda`** | `centerIds: 'all'` |
| unknown | — | fail closed | — |

Canonical resolution: `src/api/roles.ts` (`normalizeRole` / `denormalizeRole` / `hasRole` / `homePathForRole`).

```text
JWT /auth/me.role
    ↓
normalizeRole()
    ↓
User.role (UI)
    ↓
ProtectedRoute(allowedRole)
    ↓
homePathForRole / login navigate
```

`districtOfficer` is retained as a **legacy District presentation role**, not as an alias for NCDA.

---

## 3. Before / after

| Concern | Before | After |
|---------|--------|-------|
| `normalizeRole('ncda_admin')` | `districtOfficer` | **`ncda`** |
| `denormalizeRole` for NCDA | N/A (lost identity) | **`ncda_admin`** |
| Login destination | `/district` | **`/ncda`** |
| Portal | DistrictLayout + District pages | Minimal `NcdaEntryPage` boundary |
| District access for NCDA | Allowed (collapse) | **Denied** (`ProtectedRoute`) |
| NCDA access for District | N/A | **Denied** |

---

## 4. Security boundary

### Route protection (`ProtectedRoute`)

| Role | `/ncda` | `/district` | `/caretaker` |
|------|---------|-------------|--------------|
| `ncda` (`ncda_admin`) | ALLOW | DENY → redirect `/ncda` | DENY → `/ncda` |
| `districtOfficer` | DENY → `/district` | ALLOW | DENY → `/district` |
| `caretaker` | DENY → `/caretaker` | DENY → `/caretaker` | ALLOW |
| unauthenticated | → `/` | → `/` | → `/` |
| unknown API role | Cannot establish session (`UnknownUserRoleError`) | same | same |

Wrong-role redirects use `homePathForUser` (never default unknown → District).

### Backend

- No Nest guards, Prisma, OpenAPI, or `resolveScope` changes.
- Verified existing sync write-auth coverage: `ncda_admin unrestricted → pass for ecd_center` with `centerIds: 'all'`.
- Dedicated automated unit asserting `SyncAccessService.resolveScope(ncda_admin) === { centerIds: 'all', districtId: null }` is **not** isolated as its own named test; national scope remains implemented in `sync-access.service.ts` and exercised indirectly — documented as a **test coverage gap**, not a scope behavior gap.

Frontend route guards are **UX boundaries**. Authorization remains JWT + Nest `RolesGuard` + scope utilities.

---

## 5. Authentication flow

```text
Role selection → /login/ncda | /login/district | /login/caretaker
    ↓
LoginForm(expectedRole)
    ↓
MOCK: DEMO_CREDENTIALS role match
LIVE: loginRequest → normalizeRole(session.user.role) → hasRole(expectedRole)
    ↓ wrong_role / UnknownUserRoleError clears LIVE session
navigate(homePathForRole(result.role))
    ↓
/ncda | /district | /caretaker
```

- Added role card + `/login/ncda` (identity path only).
- MOCK credential `ncda` / `1234` exists for mock-mode parity only — LIVE role is never inferred from username.

Logout from NCDA entry clears AuthProvider session (+ LIVE `useLogout` query purge including `district` / `ncda` roots) and navigates to `/`. Subsequent `/ncda` hits require authentication again.

---

## 6. LocalStore isolation

| Check | Result |
|-------|--------|
| Caregiver repos still gate LIVE list hydration with `isCaretaker(user)` | **YES** |
| `NcdaEntryPage` imports LocalStore / SyncEngine / outbox | **NO** |
| NCDA UI role would enable caregiver `useChildrenList` LIVE | **NO** (`isCaretaker` false) |
| District freeze DataProvider behavior | Unchanged |

---

## 7. Query namespace

**Chosen canonical future namespace:** `ncda` (not `national`).

```text
queryKeys.ncda.all === ['ncda']
queryKeys.district.all === ['district']
```

Only the root key exists in Sprint 5.5A. Feature keys land with later NCDA data hooks. Do not introduce a parallel `national.*` tree.

---

## 8. Files touched (frontend)

| Area | Files |
|------|-------|
| Roles | `src/api/roles.ts`, `src/types/index.ts`, `src/api/index.ts` |
| Routes | `src/App.tsx`, `src/pages/ncda/NcdaEntryPage.tsx` |
| Login | `src/pages/LoginPage.tsx`, `LoginForm`, `RoleSelector`, `RoleSelectionCard`, `locales/rw/auth.ts` |
| Auth mock | `src/contexts/AppContext.tsx` (DEMO_USERS / credentials) |
| Query keys | `src/api/query-keys.ts` |
| Logout purge | `src/features/auth/mutations.ts` |
| Tests | `src/features/ncda/role-boundary.contract.test.ts`, production-readiness assertion update |
| Docs | `src/api/README.md`, this report |

**Not built:** NCDA dashboard, sidebar shell, users, centers, audit, compliance, WASH, reports, exports, devices, sync console.

---

## 9. Verification

| Check | Result |
|-------|--------|
| `vitest` role-boundary + production-readiness | **21/21 PASS** (13 + 8) |
| Frontend `npm run build` | **PASS** |
| ESLint on 5.5A-touched files (excl. pre-existing AppContext hook lint debt) | **PASS** |
| Backend `sync-write-auth.spec.ts` | **12/12 PASS** (includes NCDA unrestricted write) |
| Backend auth/Prisma/OpenAPI | **Unchanged** |

---

## 10. Success criteria

```text
[x] ncda_admin is represented as its own application role (ncda)
[x] ncda_admin no longer routes to /district
[x] /ncda is a protected NCDA boundary
[x] District and NCDA route access are mutually isolated
[x] Unknown roles fail closed
[x] Login destination is role-correct
[x] Logout works
[x] Backend national scope remains unchanged
[x] Caregiver LocalStore does not initialize for NCDA
[x] District behavior remains unchanged (freeze preserved)
[x] Tests pass
[x] Build passes
[x] Final report documents the boundary
```

---

## SPRINT 5.5A STATUS

```text
SPRINT 5.5A STATUS

Role audit:
COMPLETE

ncda_admin no longer collapses to District:
YES

Frontend application role:
ncda

District role:
districtOfficer (legacy UI name; maps from district_focal_person)

Unknown roles fail closed:
YES

NCDA route boundary:
READY

District route protection:
READY

NCDA route protection:
READY

Login routing:
READY

Logout:
READY

Backend authorization changed:
NO

Backend scope semantics changed:
NO

OpenAPI changed:
NO

Prisma changed:
NO

District architecture changed:
NO

Caregiver offline architecture changed:
NO

NCDA LocalStore dependency:
NO

Tests:
21/21 PASS (FE contract) + 12/12 PASS (BE sync-write-auth)

Build:
PASS

Lint:
PASS

Remaining P0:
P0.2 NCDA Admin shell (layout/nav) still deferred to 5.5B; P0.3 national-scale monitoring defaults still require later hardening when NCDA data pages land

Remaining P1:
User/admin/governance FE; children/referrals districtId filters; alerts pagination; audit entity geo filters; settings districtId UX; peer ncda_admin provisioning; org create APIs

Remaining P2:
Device/sync admin APIs; exports; district comparison; multi-district scope; GIS; self-modification guards; admin-units pagination; expanded roles only if product expands Prisma

Recommended next sprint:
5.5B — NCDA Admin shell (layout, sidebar, empty route tree) on top of /ncda — still no product domains until subsequent phases
```
