# Sprint 5.7 — Production Sync Verification & Feeding Reconciliation

**Date:** 2026-08-12  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Prior reports:** `docs/sync-save-failure-forensic-audit.md`, `docs/sprint-5.6-sync-reliability-report.md`, `docs/sprint-5.6-sync-state-machine-audit.md`

---

## Executive verdict

**READY WITH CONDITIONS**

Sprint 5.6 reliability semantics remain in place. This sprint:

- confirmed the **production HTTP API is reachable**
- could **not** inspect production PostgreSQL or Redis/BullMQ
- closed the feeding dirty-sibling pull gap
- stopped village-blocked child creates from being auto-unblocked and pushed without `homeVillageId`
- surfaced village-blocked state distinctly from infrastructure / auth / dependency failure

The original caregiver data-loss incident is **not closed**. Production apply → PostgreSQL → worker evidence is still missing.

---

## Production environment

| Probe | Result |
|-------|--------|
| Production API (`VITE_API_BASE_URL` host) | **YES** — `/docs` HTTP 200, `OPTIONS /api/v1/auth/login` 204, `GET /api/v1/sync/pull` 401 (auth required, as expected) |
| Production PostgreSQL | **NO** — no production DB credentials or tunnel in this environment |
| Production Redis | **NO** — not reachable |
| Production worker | **UNKNOWN** — cannot observe BullMQ without Redis |
| Local PostgreSQL `localhost:5434` / `ecd` | **YES** — empty (0 sessions, ops, devices, domain rows) |
| Local Redis `127.0.0.1:6379` | **NO** — `ECONNREFUSED` |
| Local API `:3000` | **NO** — not running |

No credentials, JWTs, connection strings, or production row contents are recorded here.

---

## Production forensic evidence

### HTTP (production)

Observable without authentication:

- API process is up (Swagger `/docs` served)
- Sync pull rejects unauthenticated callers (401)
- No session/operation aggregates are available through unauthenticated HTTP

No approved test account was used. No production caregiver records were created.

### PostgreSQL (local only)

| Table | Count |
|-------|------:|
| `sync_session` | 0 |
| `sync_operation` | 0 |
| `device` | 0 |
| `child` | 0 |
| `attendance_record` | 0 |
| `center_feeding_day` | 0 |
| `center_feeding_month_summary` | 0 |
| `child_nutrition_screening` | 0 |
| `sted_assessment` | 0 |
| `referral` | 0 |

Session/operation status distributions: empty.  
Stale / failed / blocked / device-mismatch aggregates: **not observable in production**.

### Redis / BullMQ

Not inspected. No waiting/active/failed/stalled job counts. Queue was not modified.

---

## Root causes addressed this sprint

### P1 — Feeding dirty-sibling pull (closed in code)

Natural keys (from Prisma, not invented):

- feeding day: `(centerId, recordedDate)` ↔ local `(centerId, date)`
- feeding month: `(centerId, yearMonth)`

Pull previously skipped a dirty local sibling with a different UUID, hiding the server row. Attendance already reconciled this case in Sprint 5.6. Feeding now uses the same lastModifiedAt / CAS retarget rules.

Backend `applyFeedingDayCreate` already upserted by natural key. No schema change.

### P1 — Village-blocked child create (closed in code)

Child create without resolved `homeVillageId` was stored as `blocked` with `homeVillageId required before sync`, but `refreshBlockedOperations` treated empty `dependsOn` as ready and flipped the op to `pending`. That could push a child without village reference data.

Fix: village-reference errors stay blocked until `unblockChildCreatesNeedingVillage` actually resolves a village. Failed lookups keep a diagnosable lastError. UI distinguishes this from dependency wait, auth, and server-unavailable.

### P0 — Production Redis/Postgres confirmation (still open)

Unchanged. This workstation cannot see production persistence or workers.

---

## Changes made

### Frontend

- `reconcileDirtyNaturalKeySibling` shared helper; feeding day and month pull now reconcile dirty UUID siblings instead of skipping.
- Outbox will not auto-unblock village-reference blocked child creates; they are not selected for push.
- Village resolve failure updates lastError and remains blocked; success still promotes to pending and is replayable.
- Sync panel copy distinguishes missing village reference data from “waiting for another change.” Status is “needs attention” when the only unresolved work is blocked.

### Backend

- No production apply/worker/schema change.
- Added `sync-apply-feeding.spec.ts` proving different client UUIDs for the same `(centerId, date)` upsert the existing row.
- `package.json` `test:sync` includes that spec.

### Database

No Prisma migration.

### Worker

No lock/stall/retry changes this sprint (Sprint 5.6 values unchanged). Live soak not run.

### OpenAPI

No.

---

## Sync state machine

Unchanged from Sprint 5.6 except:

| Event | Before 5.7 | After 5.7 |
|-------|------------|-----------|
| Feeding pull, dirty sibling different UUID, same `(centerId, date)` | skip server row | reconcile (adopt server id; keep newer fields; retarget or apply local create) |
| Feeding pull, different date | no merge | no merge |
| Child create blocked: `homeVillageId required` | `refreshBlockedOperations` → pending | stays blocked until village resolve |
| Village lookup fails | silent keep-blocked | blocked + lastError retained |

`applied` / `lastSyncedAt` still require server acknowledgement. Timeout still does not stamp synced.

---

## Feeding reconciliation

Logical identity is `(centerId, date)` for days and `(centerId, yearMonth)` for month summaries.

| Case | Behavior |
|------|----------|
| Same logical record, server newer | Adopt server UUID; local create marked `applied`; sibling soft-deleted; server fields kept clean |
| Same logical record, local newer | Adopt server UUID + version; keep local fields dirty; retarget outbox create → update for CAS |
| Different dates / months | Not merged |
| Duplicate push UUID vs existing natural key | Backend upserts existing row; does not insert a second day |
| Offline create | IndexedDB + outbox unchanged; does not require API |

Does not overwrite blindly. Does not delete the outbox. Does not disable uniqueness.

---

## Village-blocked child creation

Backend validation is not bypassed. No fake village is assigned.

1. Caregiver save writes the child locally (`dirty`) and a `blocked` create op.
2. Message: saved on this device; needs village reference data before sync.
3. Heartbeat / reconnect calls `unblockChildCreatesNeedingVillage`.
4. If geo resolve succeeds → `homeVillageId` set, op `pending`, payload updated, push eligible.
5. If geo resolve fails → op stays blocked, lastError kept, child row remains.

Distinct from:

- infrastructure (`SERVER_UNAVAILABLE`)
- authentication (`AUTH_REQUIRED`)
- dependency wait (`Waiting for dependency operations`)
- permanent validation (`failed`)

---

## End-to-end tests

Live production caregiver writes were **not** executed (no approved test account; do not invent production children).

| Domain | Local save | Outbox | Push/apply (unit) | Pull / dirty-sibling | Live production |
|--------|------------|--------|-------------------|----------------------|-----------------|
| Child | PASS | PASS | existing + village-block | existing | NOT RUN |
| Attendance | PASS | PASS | existing 5.6 | existing 5.6 | NOT RUN |
| Feeding | PASS | PASS | apply natural-key PASS | dirty-sibling PASS | NOT RUN |
| Growth/Nutrition | existing PASS | existing | existing | UUID skip unchanged (no feeding-style natural key on pull) | NOT RUN |
| STED | existing PASS | existing | existing | append-only (no natural-key sibling) | NOT RUN |
| Referral | existing PASS | existing | existing | UUID skip unchanged | NOT RUN |

---

## Cross-device verification

**Code/tests:** Device B dirty feeding sibling vs Device A server row now reconciles (day and month). Attendance already did.

**Live two-device:** NOT RUN (no approved dual-device production session).

---

## Failure-mode verification

| Mode | Evidence | Live infra |
|------|----------|------------|
| Offline save | existing + feeding offline tests | NOT RUN against production |
| Redis/worker down | 5.6: timeout ≠ synced; local Redis still down | NOT RUN |
| JWT expiry | 5.6 unit tests still pass | NOT RUN |
| Device mismatch | 5.6 unit tests still pass | NOT RUN |
| Duplicate feeding natural key | backend apply + pull tests | NOT RUN |
| Village missing | new village-block tests | NOT RUN |

---

## Worker soak

**NOT RUN**

Redis is down locally. Production Redis is not accessible. No approved non-production worker environment was available. Queue state was not mutated.

Bounded client evidence only: 500 pending ops remain pending after failed push (`offline-ux.test.ts`, isolated run PASS). That is not a worker soak.

---

## Data integrity verification

No operation is deleted because of timeout, Redis, JWT, device mismatch, or village block.

Feeding pull no longer hides a server row behind a dirty local UUID sibling.

Village-blocked child creates remain durable and are not silently pushed without reference data.

---

## Remaining risks

1. **Production persistence is unverified.** API up ≠ apply succeeded.
2. **Worker/Redis health in the field is unknown.** Local Redis is still down.
3. **No live dual-device proof** on the deployed environment.
4. Nutrition/STED/referral pull still skip dirty UUID siblings (those domains are not feeding-day natural keys; STED is append-only). Not expanded this sprint.
5. Pre-existing `sted.service.spec.ts` “History ordering newest first” (`count is not a function`) — unrelated to 5.7.
6. Full `eslint .` still fails on generated Orval hooks and `ApiAuthProvider` (pre-existing). Touched 5.7 files lint clean.

---

## Production incident gate

- [x] Production API reachable
- [ ] Production Redis/worker behavior verified
- [ ] Production PostgreSQL persistence verified
- [ ] No unexplained stuck sync sessions (unknown — no DB)
- [ ] No unexplained pending/stale operations (unknown — no DB)
- [x] Device identity verified (code/tests; not live production login)
- [ ] Child / attendance / feeding / growth / STED / referral **live** sync verified
- [ ] Cross-device pull live verified
- [ ] Offline → online live verified
- [x] Feeding dirty-sibling reconciliation verified (tests)
- [x] Village-blocked child recovery verified (tests)
- [ ] Worker soak completed
- [x] No new data-loss path identified in code

Incident status: **OPEN** (conditions remaining).

---

SPRINT 5.7 STATUS

Verdict:
READY WITH CONDITIONS

Production API:
VERIFIED

Production PostgreSQL:
UNAVAILABLE

Production Redis:
UNAVAILABLE

Production worker:
UNAVAILABLE

Production sync pipeline:
PARTIAL

Child registration:
READY

Attendance:
READY

Feeding:
READY

Growth/Nutrition:
READY

STED:
READY

Referrals:
READY

Cross-device pull:
PARTIAL

Offline → online recovery:
PARTIAL

JWT expiry recovery:
READY

Device identity isolation:
READY

Feeding dirty-sibling reconciliation:
READY

Village-blocked child recovery:
READY

Worker soak:
NOT RUN

Backend changed:
YES

OpenAPI changed:
NO

Prisma migration:
NO

Caregiver offline architecture changed:
NO

Data-loss risk:
LOW

Tests:
256/256 frontend PASS; 41/41 backend sync PASS; feeding/children/attendance/nutrition/sted.sync/referral PASS (1 pre-existing sted.service.spec FAIL, unrelated)

Build:
PASS

Lint:
FAIL

Remaining P0:
Production PostgreSQL + Redis/BullMQ confirmation, and a controlled live caregiver sync on an approved test account.

Remaining P1:
Live dual-device pull; live offline→online; worker soak in an environment with Redis.

Remaining P2:
Nutrition/referral dirty-UUID pull parity if those domains show field collisions; pre-existing STED service spec harness; generated-client eslint noise.

Recommended next sprint:
Sprint 5.8 — production DB/Redis forensics with authorized access, approved test-account end-to-end, and bounded worker soak. Not started.
