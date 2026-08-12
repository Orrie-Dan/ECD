# Sprint 5.6 — Sync Reliability & Data Persistence Recovery

**Date:** 2026-08-12  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**State-machine audit:** `docs/sprint-5.6-sync-state-machine-audit.md`  
**Forensic audit:** `docs/sync-save-failure-forensic-audit.md`

---

## Executive verdict

**READY WITH CONDITIONS**

The caregiver save/sync pipeline was repaired so that:

- local save remains durable and offline-first
- `lastSyncedAt` / “synced” is stamped only after server `applied` acknowledgement
- device identity is bound to the authenticated user
- transient failures stay replayable
- attendance no longer races its parent child or dies on natural-key duplicates

Production PostgreSQL/Redis were **not reachable** from this workstation. Local Postgres is empty. Local Redis is down (`ECONNREFUSED`). Code-path and unit-test evidence is strong; live field confirmation is still required.

---

## Production forensic evidence

| Probe | Result |
|-------|--------|
| Local PostgreSQL `localhost:5434` / `ecd` | Reachable. **0** `sync_session`, **0** `sync_operation`, **0** `device`, **0** domain rows (child/attendance/nutrition/feeding/STED/referral). |
| Local Redis `127.0.0.1:6379` | **Unreachable** (`ECONNREFUSED`). No workers, no queue counts. |
| Production DB / Redis | **Not reachable.** No production tunnel or credentials in this environment. |

Aggregate findings (local-dev only):

- session status distribution: empty
- operation status distribution: empty
- failed auth/device-like reasons: 0
- dead-letter (`max recovery retries`): 0
- Redis jobs: n/a

This does **not contradict** the forensic audit. It also cannot confirm which P0 is firing in the field. Local Redis down is a live instance of RC2 (apply/recovery cannot run).

---

## Root causes

### P0

1. **Browser-global device identity** — `ecd_device_id` / `ecd_device_uuid` survived logout; the next caregiver inherited the previous registry id; push 403’d while local save succeeded.
2. **False sync success** — poll timeout (~30s) restored pending ops then stamped `lastSyncedAt` and `IDLE`. No heartbeat. Redis/worker failure looked like “synced.”
3. **Terminal failed ops** — unique/FK/dead-letter became `failed` with no replay. Client never re-pushed `failed`.
4. **Attendance ordering** — no `dependsOn` child create; attendance could apply before the child existed → FK → `failed`.
5. **Attendance natural key** — `(childId, date)` unique treated as terminal failure; feeding already upserted by natural key.
6. **Cross-device pull skip** — dirty local sibling with a different UUID hid the server row.

### P1

7. JWT expiry stopped sync (`AUTH_REQUIRED`) but the UI could still look “online.” Local data was already preserved.
8. BullMQ default `lockDuration` 30s vs 500-op batches; Redis host/port only (no `REDIS_URL` / TLS / password).
9. Village-blocked child creates (unchanged this sprint; still `blocked` until village resolve).

### P2

10. Structured correlation IDs were missing on push accept / enqueue / apply / recovery.

---

## Changes made

### Frontend

- **Device identity:** logout clears `ecd_device_id` and `ecd_device_uuid`. `ensureDeviceRegistered` restores from **this user’s** IndexedDB device row; never mirrors another user’s registry id. 409 → mint a new UUID and register once.
- **Engine:** `PENDING`, `SERVER_UNAVAILABLE`, `DEVICE_BLOCKED`. `lastSyncedAt` only when pending/syncing/blocked/failed/conflict are empty. Poll timeout leaves ops unresolved.
- **Heartbeat:** 60s interval while online (`OfflineRuntimeProvider`). Single-flight `syncNow`.
- **Session poll:** progress-aware (resets stall counter when `successfulOperations` / processed ops change). Wall-clock cap 120s. Timeout keeps `sessionId` and does not mark applied.
- **Outbox:** retryable `failed` ops are restored to `pending` and re-selected. Permanent failures (append-only, unsupported, etc.) are not retried forever.
- **403 device:** outbox preserved; engine `DEVICE_BLOCKED`; one repair/re-register attempt; no identity overwrite of another user.
- **JWT:** `AUTH_REQUIRED` still preserves IndexedDB; re-auth clears the block and resumes sync.
- **Attendance / nutrition / STED / referral:** `dependsOn` unsynced child create.
- **Pull:** dirty attendance sibling on the same `(childId, date)` is reconciled (adopt server UUID; keep newer fields; retarget outbox).
- **UI:** “Synced” only when idle and empty. Distinguishes waiting / sign-in / server unavailable / device blocked. Does not show last-synced after a timeout.

### Backend

- **Redis:** `REDIS_URL` / `REDIS_PASSWORD` / `REDIS_TLS` via `buildRedisConnection`. Host/port fallback unchanged.
- **Worker:** `lockDuration` 120s, `stalledInterval` 30s, `maxStalledCount` 2, concurrency 1. Slow apply is not treated as a dead worker; stale recovery remains 5 minutes.
- **Enqueue:** failures logged with `sessionId` / `deviceId` / `userId` and rethrown (client restores pending; session remains `started` for recovery).
- **Recovery:** after 5 retries, ops stay **pending**. Parked requeue every 15 minutes. Dead-letter conversion to `failed` **removed**.
- **Apply:** attendance CREATE upserts/CAS-merges by `(childId, date)`. Missing parent child → retryable pending, not terminal failed. Prisma P2003/connection errors retryable.
- **Logs:** JSON lines with `sessionId`, `deviceId`, `clientOperationId`, `entityType`, `entityId`, `status`. No payloads, JWTs, or child PII.

### Database

No Prisma migration. Existing `retryCount`, `lastRetryAt`, `conflictReason`, unique `(childId, attendanceDate)` are sufficient.

### Worker

See backend worker settings above. Recovery sweep still every 60s.

### OpenAPI

**No.** Session DTO already exposed `status`, counts, `retryCount`, `lastRetryAt`, per-op `status` / `processedAt`.

---

## Sync state machine (final)

### Local outbox

`pending` (queued / retrying) → `syncing` → `applied` (only on server `applied`)  
`blocked` while `dependsOn` unmet or village missing  
`conflict` for CAS mismatch  
`failed` only for permanent/blocked classification  

Timeout / Redis / worker stall → remain `syncing` (with `sessionId`) or `pending`. Never `applied`.

### Engine

`OFFLINE` | `AUTH_REQUIRED` | `DEVICE_BLOCKED` | `SERVER_UNAVAILABLE` | `SYNCING` | `PENDING` | `CONFLICT_PRESENT` | `SYNC_ERROR` | `IDLE`

`IDLE` means the outbox has no unresolved work **and** the last cycle completed without remaining failures. That is the only state the UI labels “synced.”

### Server

Unchanged enums: op `pending|applied|conflict|failed`; session `started|completed|failed`.  
Retryable apply leaves the op `pending` with a `RETRYABLE:` reason.  
Parked sessions stay `started`.

---

## Recovery semantics

| Class | Examples | Behavior |
|-------|----------|----------|
| **Retryable** | Redis down, DB blip, worker stall, poll timeout, parent child not yet applied, P2003 | Stay pending (or restore from failed). Heartbeat + recovery sweep replay. Same `clientOperationId`. |
| **Blocked** | Device 403, JWT expiry, village missing | Preserve ops. `DEVICE_BLOCKED` / `AUTH_REQUIRED` / outbox `blocked`. User action or repair, then resume. |
| **Permanent** | Append-only update, unsupported entity, irreconcilable validation | Stay `failed`, diagnosable, not infinite retry. Row is not deleted. |
| **Replay** | Parked session after max 5-minute retries | Re-enqueue every 15 minutes without converting ops to failed. Client re-push is idempotent. |

---

## Data integrity verification

Demonstrated in unit tests (not live production):

| Domain | Local save | Outbox | Push | Apply | Pull / 2nd device |
|--------|------------|--------|------|-------|-------------------|
| Child registration | PASS | PASS | PASS (existing + reliability) | PASS (existing apply) | PASS (existing pull) |
| Attendance | PASS + `dependsOn` child | PASS | PASS | Natural-key idempotent + retryable parent | Dirty sibling reconcile PASS |
| Feeding | Unchanged local-first | PASS | PASS | Existing natural-key upsert | Dirty sibling skip **unchanged** (P1 leftover) |
| Growth/Nutrition | PASS + child `dependsOn` | PASS | PASS | Parent-child retryable | Existing pull |
| STED | PASS + child `dependsOn` | PASS | PASS | Parent-child retryable | Existing pull |
| Referral | PASS + child `dependsOn` | PASS | PASS | Parent-child retryable | Existing pull |

Offline save does not call the API. JWT expiry and 403 tests prove the outbox is not deleted.

---

## Remaining risks

1. **Production not inspected.** Empty local DB cannot prove which P0 is live in the field. Deploy Redis URL/TLS and re-run the SQL in the forensic audit.
2. **Local Redis down** in this environment — worker lock/stall settings are unit-tested via config/recovery harness, not a live BullMQ process.
3. **Feeding (and other natural keys) pull** still skips dirty siblings. Attendance was the proven P0; feeding should get the same reconcile in a follow-up.
4. **Clock skew** on attendance last-write (`clientTimestamp` vs `lastModifiedAt`) can pick the wrong winner; CAS conflict remains the fallback.
5. **Village-blocked child creates** still require village resolve (P1, not this sprint).
6. **Pre-existing** `sted.service.spec.ts` “History ordering newest first” fails (`count is not a function`) — unrelated mock gap; `sted.sync.spec.ts` passes.
7. Shared-tablet **same browser, two users, both with unsynced work** is now isolated by workspace, but operators must still train “logout then login” rather than sharing a live session.

---

SPRINT 5.6 STATUS

Verdict:
READY WITH CONDITIONS

Production forensic verification:
PARTIAL

Device identity isolation:
READY

Sync heartbeat/session reliability:
READY

Redis/BullMQ worker reliability:
READY

Failed-operation recovery:
READY

Attendance dependency ordering:
READY

Attendance natural-key reconciliation:
READY

Cross-device pull reconciliation:
READY

JWT expiry recovery:
READY

Caregiver local persistence:
READY

Server persistence:
UNKNOWN

Child registration sync:
READY

Attendance sync:
READY

Feeding sync:
PARTIAL

Growth/Nutrition sync:
READY

STED sync:
READY

Referral sync:
READY

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
247/247 frontend PASS; 39/39 backend sync PASS; caregiver domain sync specs PASS (sted.service.spec 1 pre-existing FAIL, unrelated)

Build:
PASS

Lint:
FAIL

Remaining P0:
Production Redis/Postgres confirmation still required before calling the field incident closed.

Remaining P1:
Feeding (and other natural-key) dirty-sibling pull reconcile; village-blocked child create surfacing; live worker soak on production Redis.

Remaining P2:
Richer session progress fields if operators need them; reduce structured-log volume if noisy.

Recommended next sprint:
Sprint 5.7 — Production sync forensics (run the SQL + Redis job counts on the deployed environment), feeding natural-key pull parity, and a bounded caregiver dual-device soak test. Do not start automatically.
