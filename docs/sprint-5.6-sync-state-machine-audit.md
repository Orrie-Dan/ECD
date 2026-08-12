# Sprint 5.6 — Sync State Machine Audit

**Date:** 2026-08-12  
**Code changed during this phase:** NO  
**Companion forensic report:** `docs/sync-save-failure-forensic-audit.md`

This document records the **actual** client and server state machines before Sprint 5.6 modifications. Answers are from running code plus local-dev database/Redis inspection. Production was not reachable from this workstation.

---

## 1. Local forensic evidence (this workstation)

| Probe | Result |
|-------|--------|
| PostgreSQL (`localhost:5434` / `ecd`) | **Reachable.** All caregiver and sync tables empty: 0 `sync_session`, 0 `sync_operation`, 0 `device`, 0 child/attendance/nutrition/feeding/STED/referral rows. |
| Redis (`127.0.0.1:6379`) | **Unreachable** (`ECONNREFUSED`). No BullMQ workers, no queue counts. |
| Production PostgreSQL / Redis | **Not reachable from this environment.** No production credentials or tunnel. |

Interpretation:

- Local evidence does **not contradict** the forensic audit. It also cannot confirm which P0 is firing in the field.
- Empty local `sync_operation` means there are no local 403 / stuck / dead-lettered rows to count.
- Local Redis down is a live instance of RC2: HTTP push can persist a session while apply/recovery cannot run.

Production forensic verification for this sprint is therefore **PARTIAL**.

---

## 2. Vocabulary (as implemented today)

Do not invent a second state system. Map the sprint terms onto existing enums.

### Frontend outbox (`OutboxStatus`) — `src/storage/types.ts`

| Sprint term | Actual status | Meaning |
|-------------|---------------|---------|
| LOCAL_ONLY / QUEUED | `pending` | Durable IndexedDB outbox row, eligible for push when deps are applied |
| BLOCKED | `blocked` | Waiting on `dependsOn` or village resolve |
| SYNCING | `syncing` | Selected for the current push; `attempts++` |
| SYNCED | `applied` | Server DTO said `applied` and local entity marked `clean` |
| RETRYING | `pending` + `lastError` | Poll timeout / push HTTP error restored pending |
| FAILED | `failed` | Terminal locally; **not selected for push** |
| conflict | `conflict` | CAS/version; acknowledge only |

There is no local `queued` distinct from `pending`.

### Frontend engine (`SyncEngineStatus`) — `src/sync/sync-types.ts`

`IDLE | SYNCING | SYNC_ERROR | CONFLICT_PRESENT | AUTH_REQUIRED | OFFLINE`

| Sprint term | Actual status | Gap |
|-------------|---------------|-----|
| OFFLINE | `OFFLINE` | Only when `networkState` is OFFLINE |
| SYNCING | `SYNCING` | While `runCycle` is in flight |
| SERVER_UNAVAILABLE | collapsed into `SYNC_ERROR` | `markUnreachable` does **not** flip OFFLINE if `navigator.onLine` |
| Sync requires sign-in | `AUTH_REQUIRED` | JWT refresh failed |
| SYNCED | **incorrectly implied by `IDLE` + `lastSyncedAt`** | Engine stamps `lastSyncedAt` and `IDLE` even when pending remains |
| QUEUED / RETRYING | collapsed into `IDLE` when online + pending | `deriveStatus` returns IDLE if pending and ONLINE |

### Server operation (`SyncOperationStatus`)

`pending | applied | conflict | failed`  
No `syncing` / `blocked` on the server.

### Server session (`SyncSessionStatus`)

`started | completed | failed`  
No `processing` / `stalled` / `parked`. Stale work stays `started`.

Session DTO already exposes enough progress fields (no schema change required for heartbeat):

- `status`, `totalOperations`, `successfulOperations`, `failedOperations`
- `retryCount`, `lastRetryAt`, `startedAt`, `completedAt`
- `operations[].status`, `conflictReason`, `processedAt`

---

## 3. Transition tables

### 3.1 Local outbox

| From | Event | To | Recoverable? |
|------|-------|----|--------------|
| (new) | Dexie tx entity + `enqueueOperation` | `pending` (or `blocked` if village missing / unmet `dependsOn`) | yes |
| `blocked` | deps applied / village resolved | `pending` | yes |
| `pending` | deps missing | `blocked` | yes |
| `pending` | `selectPushBatch` | `syncing` (`attempts++`) | yes |
| `syncing` | push HTTP error | `pending` (same `clientOperationId`) | yes |
| `syncing` | push/session result `applied` | `applied` + entity `clean` | n/a |
| `syncing` | push/session result `conflict`/`failed` | `conflict`/`failed` | **no auto-retry** |
| `syncing` | session `completed`, op missing from DTO | `pending` | yes |
| `syncing` | session `failed`, op still lingering | **`failed`** | **no auto-retry** |
| `syncing` | poll timeout (~30s wall clock) | `pending` + `lastError: Session poll timed out` | yes **if another cycle runs** |
| `syncing` no `sessionId`, age > 30s | orphan sweep | `pending` | yes **if a cycle runs** |
| `failed` | anything automatic | stays `failed` | **NO** |
| `conflict` | user acknowledge | `applied` (local only; discards mutation) | n/a |

**Proven gap:** `failed` and `conflict` are excluded from `selectPushBatch` (`outbox.ts`). Transient infrastructure failures that the server dead-letters as `failed` never replay.

### 3.2 Server operation

| From | Event | To | Recoverable? |
|------|-------|----|--------------|
| (new) | push auth allowed | `pending` | yes |
| (new) | push auth rejected | `failed` immediately | no |
| `pending` | apply success | `applied` | n/a |
| `pending` | apply conflict/failed (unique, FK, validation) | `conflict`/`failed` | **no requeue** |
| `pending` | worker throw / tx abort | stays `pending` | Bull 3 attempts, then 5 min sweep |
| `pending` | dead-letter after 5 recovery retries | `failed` (`max recovery retries exceeded`) | **NO** |

### 3.3 Server session

| From | Event | To | Recoverable? |
|------|-------|----|--------------|
| (new) | push with ≥1 pending op | `started` | — |
| (new) | all ops auth-rejected | `completed` | n/a |
| `started` | all ops terminal, ≥1 applied | `completed` | n/a |
| `started` | all ops terminal, 0 applied | `failed` | n/a |
| `started` | pending left | stays `started` | recovery after 5 min |
| `started` | recovery sweep | `retryCount++`, re-enqueue | until retryCount ≥ 5 |
| `started` | retryCount ≥ 5 | `failed`; remaining pending → `failed` | **NO** |

Enqueue happens **after** the Prisma transaction. Redis `queue.add` failure leaves `started`/`pending` rows with no job.

### 3.4 Engine cycle (`SyncEngine.runCycle`)

```
offline → OFFLINE (no pull/push)
AUTH_REQUIRED / no tokens → AUTH_REQUIRED (IndexedDB preserved)
no owner / no device → SYNC_ERROR
else:
  SYNCING
  recoverOrphanedSyncOperations
  pullAll
  pushOutbox
  pollSessionUntilSettled (40 × 750ms ≈ 30s, no progress reset)
  optional extra pull if conflicts
  ALWAYS: setMeta(lastSyncedAt), status=IDLE     ← false "synced"
catch 401 → AUTH_REQUIRED
catch other → SYNC_ERROR + markUnreachable
```

Triggers today (no periodic timer): login, reconnect debounce 400ms, post-mutation `void syncNow()` if online, token refresh, manual “Huza ubu”, logout-sync.

---

## 4. Required answers

### 1. What does "saved" mean locally?

A Dexie transaction committed the domain row **and** an outbox operation in the same `runTransaction`. The UI toasts `childRegisteredLocal` / `savedOnDevice` immediately. This does **not** mean the server has the row.

If IndexedDB itself fails, the UI does not claim success (`LocalWriteError`).

### 2. What does "queued" mean?

Outbox `pending` (or `blocked` waiting on deps). There is no separate queued status. `selectPushBatch` only sends `pending` ops whose `dependsOn` are all `applied`.

### 3. What proves server persistence?

**Not** HTTP 200 from `POST /sync/push`. Push inserts `sync_operation` + `sync_session` and enqueues BullMQ. Domain rows are written later by `SyncProcessor` → `SyncApplyService.apply` inside a Prisma transaction.

Server persistence of the **domain** row is proven only when `sync_operation.status = applied` (and the corresponding PostgreSQL row exists).

### 4. What proves the operation was applied?

1. Session DTO (or push replay DTO) reports `status: applied` for that `clientOperationId`, **or**
2. Push returns `applied` immediately (dedupe of an already-applied op).

The client then sets outbox `applied` and `markEntityApplied` (entity `_localStatus: clean`).

`lastSyncedAt` is **not** proof. Today it is stamped after poll timeout.

### 5. What causes an operation to retry?

- Push HTTP error → `pending`, same `clientOperationId`
- Poll timeout → `pending`
- Orphan sweep (`syncing` without `sessionId`, age > 30s) → `pending`
- Session `completed` but op not in DTO → `pending`
- Server: BullMQ 3 attempts; recovery sweep re-enqueues `started` sessions with pending ops (max 5)

Retry requires a **sync trigger**. There is no heartbeat.

### 6. What causes an operation to become terminally failed?

- Apply unique/FK/validation → server `failed`; client copies `failed`
- Push-time auth reject → server `failed`
- Session DTO `failed` while local op still `syncing` → client `failed`
- Recovery dead-letter: `max recovery retries exceeded`
- Client never re-selects `failed` for push

### 7. What causes a session to become complete?

Worker sees **no remaining pending** ops for that `sessionId`, then sets `completed` if ≥1 applied, else `failed`. If any op is still `pending`, session stays `started`.

### 8. What happens when Redis is unavailable?

- `enqueueSession` throws after the DB commit → HTTP 500; client restores `pending`; session already `started`
- Recovery job is itself a BullMQ repeatable job → **cannot run**
- Domain apply never happens
- Client poll times out (~30s), stamps `lastSyncedAt`, goes `IDLE`
- Local data remains durable

### 9. What happens when JWT expires?

Access token 15m, refresh 7d. 401 → refresh. Failed refresh → `AUTH_REQUIRED`, tokens cleared, IndexedDB **preserved**. `syncNow` refuses to push. Local saves continue. After re-login, `OfflineRuntimeProvider` calls `syncNow`.

Gap: engine may still have been retrying until refresh fails; after `AUTH_REQUIRED` it stops. Indicator can show sign-in required. No endless expired-token apply on the server (JWT middleware rejects).

### 10. What happens when the device belongs to another user?

`SyncService.push` / `pull` throw `403 Device does not belong to the authenticated user`. Client maps this to `SYNC_ERROR`. Outbox stays `pending`. Local saves continue. **No device re-register.** Next cycle retries the same `ecd_device_id` and 403s again.

### 11. What happens after logout / login as another caregiver?

`clearSession` calls `tokenStorage.clearTokens()` only. It does **not** call `clearDeviceId()` or clear `ecd_device_uuid`.

`ensureDeviceRegistered`: if `existingRegistryId` is in localStorage and the new user's Dexie workspace has no device row, it **mirrors the previous user's registry UUID** and returns `{ ok: true }` **without** `POST /devices/register`.

Push then 403s. Same-user re-login would have worked (device still theirs); the bug is **cross-user reuse**, not same-user continuation.

### 12. What happens when two devices create the same natural-key record?

Attendance unique: `(childId, attendanceDate)`.

- Device A applies first → row UUID-1
- Device B create UUID-2 → `attendanceRecord.create` hits P2002 → apply catch → **`failed`** (not upsert; feeding **does** upsert by natural key)
- Device B pull: dirty local sibling UUID-2 → `shouldSkipDirtyPull` → **server UUID-1 skipped**
- Divergence: server has UUID-1, Device B keeps unsynced UUID-2

Attendance outbox has **no** `dependsOn` the child create. Nutrition/STED referrals depend on their parent assessment, not on child create. Attendance can race ahead of child apply → FK fail → terminal `failed`.

---

## 5. Device identity

| Store | Key | Scope | Cleared on logout? |
|-------|-----|-------|--------------------|
| localStorage | `ecd_device_id` | **browser-global** | **NO** |
| localStorage | `ecd_device_uuid` | **browser-global** | **NO** |
| IndexedDB workspace `ecd-offline-u-{userId}` | `device` row + meta | per user | preserved (correct for same-user resume) |

Backend contract (must not weaken):

- `device.deviceUuid` globally unique
- `device.userId` is the owner
- Register with another user's UUID → **409**
- Push/pull with another user's `deviceId` → **403**

Correct client repair: stop mirroring; clear browser-global registry id on logout; restore from **this user's** IndexedDB on same-user login; mint a new UUID on 409 / foreign workspace.

---

## 6. Heartbeat / session progress (existing fields)

The session DTO is sufficient. The client does not use it as a progress heartbeat:

- Poll is a fixed 40 attempts × 750ms
- No reset of the attempt counter when `successfulOperations` / `processedAt` change
- Timeout restores `pending` then the engine stamps `lastSyncedAt`

Server stale threshold is 5 minutes (`SYNC_STALE_THRESHOLD_MS`). Client gives up at ~30 seconds.

BullMQ `@Processor(SYNC_QUEUE)` sets **no** `lockDuration` (default 30s), **no** `stalledInterval`, **no** `concurrency`. A 500-op batch can be marked stalled while still working.

Redis config: `REDIS_HOST` + `REDIS_PORT` only. No `REDIS_URL` / password / TLS.

---

## 7. Failure classification (today vs required)

| Class | Today | Required |
|-------|-------|----------|
| Retryable (Redis, DB blip, worker stall, FK parent not yet applied) | often `failed` or dead-lettered | stay pending / replayable |
| Blocked (device mismatch, JWT, village) | mixed: 403→SYNC_ERROR+pending; village→`blocked`; JWT→AUTH_REQUIRED | explicit blocked; preserve ops |
| Permanent (immutable domain, irreconcilable contract) | `failed` | `failed`, diagnosable, not infinite retry |

Dead-letter (`deadLetterSession`) converts remaining `pending` → `failed`. That is silent data-loss from the caregiver's point of view: the row still exists but will never apply.

---

## 8. Pull / CAS

`shouldSkipDirtyPull`: if local `_localStatus` is `dirty` or `pending_delete` and the entity is not already in conflict, skip the server snapshot.

Attendance additionally matches `childId + date`. A dirty sibling with a different UUID causes `continue` — the server row is never adopted.

CAS for attendance **updates** uses `id + version`. Creates do not CAS; they insert by client UUID. Natural-key identity is not considered at apply time (unlike feeding day/month).

---

## 9. What "synced" must mean after Sprint 5.6

An operation is synced only when the server has acknowledged **`applied`** (or an equivalent idempotent success: replay of an already-applied `clientOperationId`, or natural-key idempotent apply that returns `applied` with the canonical entity id).

Timeout, Redis outage, JWT expiry, 403, worker stall, and retry-limit parking must **never** stamp `lastSyncedAt` or present `IDLE` as success while `pending|syncing|blocked|failed` remain.

---

## 10. Implementation constraints (from this audit)

- Prefer existing session fields; **no Prisma migration** unless a new column is proven necessary. Current schema already has `retryCount`, `lastRetryAt`, operation `conflictReason`.
- Do not weaken `assert device ownership`.
- Do not delete outbox rows on timeout / 403 / JWT expiry.
- Attendance ordering must use `dependsOn`, not sleeps.
- Attendance unique collisions must resolve same logical record (childId+date), not blind P2002→success.
- Backend changes limited to sync reliability paths proven above.
