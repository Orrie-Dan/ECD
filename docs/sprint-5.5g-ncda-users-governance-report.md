# Sprint 5.5G — NCDA Users & Governance

**Date:** 2026-08-11  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Continues from:** Sprint 5.5F (`docs/sprint-5.5f-ncda-children-management-report.md`)

---

## 1. Executive verdict

```text
COMPLETE
```

`/ncda/users`, `/ncda/users/:userId`, and `/ncda/audit-logs` are real NCDA governance surfaces against existing NestJS contracts. Devices and Sync remain **Coming Soon** because fleet/admin APIs are absent (caller-only `my-devices` / own-session sync). No invented roles. No authorization weakening. Temporary passwords are shown once in local UI state and never cached in React Query.

**Backend changes:** none required.

---

## 2. Roles that actually exist

| Role | Prisma / OpenAPI | NCDA create? |
|------|------------------|--------------|
| `caregiver` | Yes | **Yes** |
| `district_focal_person` | Yes | **Yes** |
| `ncda_admin` | Yes | **No** (anti-escalation) |
| `super_admin` / DHI / CAU / District_Inspector | **No** | Not invented |

---

## 3. Contract matrix

| Capability | API | Classification |
|------------|-----|----------------|
| List users | `GET /users` page/search/role/status/districtId/centerId | **SUPPORTED** |
| User detail | `GET /users/:id` | **SUPPORTED** |
| Create user | `POST /users` (DFP + caregiver for NCDA) | **SUPPORTED** |
| Update profile/status | `PATCH /users/:id` fullName/phone/status | **SUPPORTED** |
| Activate/deactivate | PATCH `ACTIVE` / `SUSPENDED` | **SUPPORTED** |
| Reset password | `POST /users/:id/reset-password` | **SUPPORTED** |
| Change role on update | — | **CONTRACT GAP** (intentional) |
| Change scope on update | — | **CONTRACT GAP** (create-only) |
| Create peer `ncda_admin` | blocked by `canCreateRole` | **SUPPORTED** (deny) |
| Audit list | `GET /audit-logs` + filters | **SUPPORTED** |
| Audit mutate/delete | — | **N/A** (immutable) |
| Device fleet | — | **CONTRACT GAP** |
| Sync ops console | — | **CONTRACT GAP** |

Sensitive fields (`passwordHash`, tokens) are **not** on UserResponseDto / UI.

---

## 4. Security boundary

| Mutation | Who | What | Scope | Notes |
|----------|-----|------|-------|-------|
| Create | `ncda_admin`, DFP | DFP→caregiver only; NCDA→DFP\|caregiver | `resolveScopeForRole` + assert*Access | Temp password once |
| PATCH | DFP, NCDA | fullName, phone, status | `requireVisibleUser` | No role/scope |
| Reset password | NCDA any visible; DFP caregivers in district | password hash + reset token | `canResetPassword` | Temp password optional once |
| Audit read | DFP (actor district), NCDA national | read-only | DFP filter on `changedBy.districtId` | FE requires date window |

Frontend does **not** infer permissions from labels — creatable roles are hardcoded to match backend matrix; unknown roles remain fail-closed in FE role mapping (unchanged from 5.5A).

---

## 5. Frontend changes

| Area | Path |
|------|------|
| Routes | `/ncda/users`, `/ncda/users/:userId`, `/ncda/audit-logs` |
| Pages | `NcdaUsersPage`, `NcdaUserDetailPage`, `NcdaAuditLogsPage` |
| Resources | `api/resources/users.ts`, `api/resources/audit-logs.ts` |
| Hooks | `features/ncda/users/queries.ts`, `features/ncda/audit-logs/queries.ts` |
| Query keys | `ncda.users.*`, `ncda.auditLogs.*` |
| Devices/Sync | remain Coming Soon; copy states contract insufficiency |
| Tests | `users-governance.contract.test.ts` |
| Smoke | `scripts/sprint-55g-users-governance-smoke.mjs` |

Architecture:

```text
NcdaUsersPage / NcdaUserDetailPage / NcdaAuditLogsPage
  → ncda.users.* / ncda.auditLogs.* hooks
  → React Query (mutations invalidate after server success)
  → users / audit-logs / geo resources
  → Orval
  → NestJS
```

---

## 6. Performance

- Users & audit: DB pagination ≤100; FE clamp
- Audit: query disabled until `from`+`to` set (default last 7 days)
- Center options for filters/create: district-scoped ≤100 + search
- No national bulk user/audit hydration

---

## 7. Tests & verification

| Check | Result |
|-------|--------|
| Frontend `npm run test` | **217/217 PASS** |
| Backend `npm run test:users` | **PASS** (mapper + authorization + service) |
| Backend `npm run test:audit-logs` | **PASS** |
| `npm run build` | **PASS** |
| Lint (sprint-touched) | **PASS** |
| LIVE smoke | users list/search/status/detail **200**; audit week **200**; unauth **401**; missing **404** |

---

## 8. Remaining gaps

### P0

- None for Users + Audit read/write paths implemented.

### P1

- Optional last-login / last-activity field (today: `updatedAt` only).
- Audit actor display name (DTO exposes `changedById` only).
- Deploy awareness for any prior 5.5F `districtId` children filter (orthogonal).

### P2

- Device fleet admin API + Sync operations console when product requires them.
- Peer `ncda_admin` provisioning policy if product explicitly expands matrix.
- Role/scope change APIs if ever required (currently correctly forbidden).

---

## 9. Explicit non-goals (honored)

Auth redesign, invented roles, new RBAC, caregiver auth/sync semantics, Compliance, WASH, GIS, exports, Sprint 5.5H — **not started**.

---

```text
SPRINT 5.5G STATUS

Verdict:
COMPLETE

User list:
READY

User detail:
READY

User creation:
READY

User modification:
READY

User activation/deactivation:
READY

Role management:
PARTIAL

Scope management:
PARTIAL

Audit logs:
READY

Devices:
GAP

Sync operations:
GAP

Backend changed:
NO

OpenAPI changed:
NO

Prisma migration:
NO

Security boundary preserved:
YES

Sensitive fields exposed:
NO

National bulk loading:
NO

Mock leakage:
NO

Tests:
217/217 PASS

Build:
PASS

Lint:
PASS (sprint-touched)

Remaining P0:
None

Remaining P1:
Last-activity field; audit actor display name enrichment

Remaining P2:
Device fleet + sync ops console APIs; peer ncda_admin create policy if product expands

Recommended next sprint:
5.5H — NCDA Compliance / WASH governance (paginated assessments & indicators), or device/sync admin contracts if ops priority
```
