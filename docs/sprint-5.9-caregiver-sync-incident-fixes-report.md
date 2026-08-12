# Sprint 5.9 — Caregiver Sync Incident Fixes

**Date:** 2026-08-12  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Approved test account:** `test3` (password not recorded)  
**Prior baseline:** Sprint 5.8A `SYNC E2E PARTIALLY VERIFIED`

---

## Verdict

**READY WITH CONDITIONS**

P0 referral root cause is identified and proven LIVE. A correct FE-shaped referral (`recordedById` present) reaches `applied` / session `completed` on production today. Backend hardening (alias + terminal fail for missing recorder) is implemented locally and covered by tests, but **is not yet deployed** to Render — so production still infinite-retries the bad harness payload shape until deploy.

P1 nutrition, device bootstrap UX, and children cache invalidation are fixed in code with local regression coverage. Nutrition contract re-confirmed LIVE. Device/children UI paths are **LOCAL VERIFIED** (not full LIVE UI re-walk).

---

## Incident Matrix

| Issue | Root Cause | Fix | Local Test | LIVE Test | Status |
|---|---|---|---|---|---|
| Referral STED stall | 5.8A harness sent `referredById` only; apply used `String(payload.recordedById ?? payload.recordedBy)` → `"undefined"` → FK/validation failure treated as retryable → session stays `started`, op `pending`, `retryCount` climbs. **Not** a missing STED FK (sourceId is not a Prisma FK). Client `dependsOn` is correct for UI path. | Backend: `resolveReferralRecordedByIdFromPayload` accepts `recordedById` / `recordedBy` / `referredById`; missing/sentinel → terminal throw; verify user exists before create. FE: refuse empty `recordedById` in `buildReferralSyncPayload`. | PASS (mapper/sync specs + referral-sync) | **LIVE VERIFIED** correct payload applied ~301ms; bad `referredById`-only still stalls on **undeployed** prod | Fixed in code; prod apply of bad shape pending deploy |
| Nutrition missing status | Prisma/OpenAPI require `nutritionStatus`; sync apply has no default; omit → terminal `failed` | Keep requirement. FE: throw before enqueue if status empty; local create already classifies. | PASS | **LIVE VERIFIED** valid→applied; missing→failed | Fixed |
| Device bootstrap | Login left stale `authRequired`; indicator mapped only `AUTH_REQUIRED` → “Guhuza bisaba kwinjira” while tokens existed / device missing | Clear `authRequired` on `setSession`; `DEVICE_PENDING` status for missing owner/device; distinct Kinyarwanda copy | PASS | **NOT VERIFIED** (no full LIVE UI logout/login walk this sprint) | Fixed in code |
| Children UI/API mismatch | Local-first list + React Query cache; sync pull writes IDB without invalidating `children` queries → UI can stay at 0 while API has 1 | Invalidate `children.keys.all` after successful pull | PASS | API count **LIVE** = 1; UI convergence **LOCAL VERIFIED** only | Fixed in code |

---

## Root Cause Detail (P0)

### Trace

Frontend STED+referral (atomic) → IndexedDB + outbox (`dependsOn: [stedOpId]`) → `/sync/push` → session → BullMQ → `SyncApplyService` referral create → Prisma → session aggregation → applied → REST `/referrals`.

### Why 5.8A stalled

Evidence from the 5.8A agent transcript push payload:

```text
payload: { ..., sourceType: 'sted', sourceId: stedId, ..., referredById: userId }
```

Apply path (pre-fix):

```text
recordedById: String(payload.recordedById ?? payload.recordedBy)
```

Missing both → `"undefined"` → permanent data error, but `P2003` (and similar) classified **retryable** → processor leaves op `pending`, session `started`, recovery bumps `retryCount`.

### Comparison with STED

| | STED | Referral (broken harness) |
|--|--|--|
| Recorder field | `assessedById ?? assessedBy ?? recordedById` | `recordedById ?? recordedBy` only |
| Alias for harness typo | yes | no (pre-fix) |
| Source FK | N/A | `sourceId` is **not** a FK |

Client `dependsOn` for STED→referral is correct and does **not** need a blind new dependency. Server does not model STED dependency; that is intentional given no FK.

### Repro this sprint

1. Correct payload (`recordedById` = caregiver id) → **applied in ~301–334ms**, session `completed`, REST match true.  
2. `referredById` only (5.8A shape) → session `started`, op `pending`, `conflictReason` null during window (worker leave/retry path) — matches P0 symptoms.

---

## Sync Integrity

| Stage | Status |
|---|---|
| Local persistence | Intact — no IndexedDB rewrite |
| Outbox durability | Intact — no outbox redesign |
| Push | Intact — protocol unchanged |
| Worker | Intact — BullMQ/Redis untouched |
| Server persistence | Referral create hardened for recorder resolution |
| Applied acknowledgement | Correct FE payload: **LIVE VERIFIED** `applied` |
| Pull | Intact; children RQ invalidation added after pull |

---

## Changes

### Backend (`ECD Backend`)

- `src/modules/referrals/mappers/referral.mapper.ts` — `resolveReferralRecordedByIdFromPayload`
- `src/modules/sync/sync-apply.service.ts` — use resolver + user existence check before `referral.create`
- Tests: `referral.mapper.spec.ts`, `referral.sync.spec.ts`

### Frontend (`ECD`)

- `src/sync/referral-sync-mapper.ts` — require `recordedById` before enqueue
- `src/sync/nutrition-sync-mapper.ts` + `local-screenings.ts` — require `nutritionStatus`
- `src/api/auth/ApiAuthProvider.tsx` — clear `authRequired` on login/`setSession`
- `src/sync/sync-types.ts` + `sync-engine.ts` — `DEVICE_PENDING`
- `src/components/offline/SyncStatusIndicator.tsx` + `locales/rw/common.ts` — distinct device bootstrap copy
- `src/offline/OfflineRuntimeProvider.tsx` — clear auth-required at bootstrap start
- `src/sync/sync-engine.ts` — invalidate children queries after pull
- Tests: referral/nutrition/sted/offline-ux/children-cache

---

## Tests

| Suite | Result |
|---|---|
| Backend referral mapper/sync | **7 + 9 passed** |
| Frontend sync + offline + device + children | **119 passed** (vitest `src/sync`, offline-ux, device, children) |
| Sprint-focused additions | referral recordedById, nutritionStatus guard, DEVICE_PENDING, children invalidate |
| Build | Not separately run (vitest transform OK) |
| Lint | **Pre-existing failures** elsewhere (e.g. DistrictCaregiversPage setState-in-effect); **not introduced by this sprint** — 147 problems repo-wide |

No sprint regressions observed in the sync suite.

---

## Production Verification

### LIVE VERIFIED (deployed API, `test3`)

| Check | Observation |
|---|---|
| Auth + device register | 201 |
| Children API total | **1** |
| STED create sync | `completed` / applied ~316ms |
| Referral `sourceType=sted` + `recordedById` | `completed` / **applied ~301ms**; REST match; total referrals ≥ 1 |
| Nutrition with `nutritionStatus` | `completed` / applied ~313ms |
| Nutrition without `nutritionStatus` | session/op **failed** (Prisma required field) — intentional |

### LOCAL VERIFIED

- Referral recorder alias + missing-field terminal behavior (backend unit)
- Nutrition enqueue guard
- `DEVICE_PENDING` vs `AUTH_REQUIRED`
- Children query invalidation contract after LocalStore write

### NOT VERIFIED

- Backend recorder fix on **deployed** Render (code not shipped this sprint)
- Full LIVE UI logout/login walk for device bootstrap copy
- Full LIVE UI children list after reload (API side confirmed only)
- Offline / cross-device matrix (out of scope; not reopened)

---

## Remaining Limitations

1. **Deploy required** for backend alias + terminal fail; until then production still stalls on payloads that omit `recordedById`/`recordedBy`.  
2. Infinite retry of true transient `P2003` (e.g. parent ordering) remains by design — do not confuse with recorder sentinel `"undefined"`.  
3. Device/children UX fixes ship with the frontend deploy; not proven in a caregiver browser session this sprint.  
4. Stuck sessions from earlier bad pushes may remain until recovery/parked retry; they are not auto-repaired by this sprint.  
5. Lint debt outside touched sync paths remains.

---

## Acceptance Mapping

| Criterion | Result |
|---|---|
| P0 root cause identified | **Yes** |
| Regression test added | **Yes** |
| Referral with STED source succeeds (correct payload) | **LIVE VERIFIED** |
| Operation `applied` / session `completed` | **LIVE VERIFIED** |
| P1 nutrition contract + guard | **Yes** (LIVE + local) |
| P1 device auth ≠ device init | **Code + local test**; LIVE UI pending |
| P1 children discrepancy | **Root cause + fix + local test**; LIVE UI pending |

---

## STOP

Sprint work stops here with report delivered. No sync architecture rewrite. No BullMQ/Redis/IndexedDB replacement. No NCDA/District scope.

**Next operator action:** deploy backend referral apply fix, then re-push a `referredById`-only control (should become terminal `failed` or apply via alias) and optionally re-check caregiver UI login bootstrap + children list.
