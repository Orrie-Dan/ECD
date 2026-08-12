# Caregiver Save/Sync Failure Forensic Audit

**Date:** 2026-08-12  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Code changed:** NO  
**Live production reproduction:** NOT EXECUTED (no caregiver login, no IndexedDB dump, no PostgreSQL/Redis inspection)

This audit traces the **actual** implementation. Every conclusion is tagged **PROVEN**, **LIKELY**, **UNCONFIRMED**, or **RULED OUT**.

---

## Executive Verdict

**MULTIPLE ROOT CAUSES IDENTIFIED**

The caregiver UI is not the primary failure. Local save is designed to succeed **before** server durability. The toast after child registration is explicit: data was saved on this device and will sync later (`childRegisteredLocal`).

The chain that must complete after that toast is:

```
IndexedDB entity + outbox
  → SyncEngine (no periodic timer)
  → POST /api/v1/sync/push  (persist + enqueue; does NOT apply)
  → BullMQ worker
  → Prisma domain write
  → GET /api/v1/sync/sessions/:id
  → outbox applied
  → GET /api/v1/sync/pull on another device
```

That chain has **several independent, proven break points**. Any one of them produces the reported symptom: the caregiver sees a local save, and the row is missing on the server and/or on another device.

Because the incident spans **all** caregiver domains (registration, attendance, feeding, growth, STED, referrals), the primary suspects are **pipeline-wide** (device identity, async worker/Redis, auth, sync trigger) rather than a single domain mapper. Domain-specific terminal failures (attendance unique key, child village block, missing `dependsOn`) are proven **amplifiers**.

We did **not** inspect production `sync_session` / `sync_operation` / domain tables, so we cannot name which of the proven paths is currently firing in the field. That is the first action of the fix sprint: run the SQL in [Database Evidence](#database-evidence).

---

## Failure Summary

Why can a caregiver save registration/attendance locally but fail to get it persisted to the server?

1. **Local save is not a server save.** `createChildLocalFirst` / `upsertAttendanceLocalFirst` write IndexedDB and enqueue an outbox row in one Dexie transaction, then return. The UI toasts success immediately. Sync is `void getSyncEngine().syncNow()` and is skipped when the network snapshot is offline.

2. **Push does not apply.** `POST /api/v1/sync/push` inserts `sync_operation` rows, creates a `sync_session` in `started`, enqueues a BullMQ job, and returns. PostgreSQL domain rows are written later by `SyncProcessor`. If Redis is down, the HTTP call can fail **after** the session already exists. If the worker never runs, domain rows never appear.

3. **The client only waits ~30 seconds.** Session poll is 40 × 750ms. On timeout, outbox rows return to `pending`, and the engine still stamps `lastSyncedAt` and goes `IDLE`. There is **no periodic sync timer**. Recovery on the server waits **5 minutes** and needs Redis.

4. **Device identity is browser-global.** Logout clears JWT tokens but **not** `ecd_device_id`. The next caregiver on the same tablet reuses the previous user's registry device. Push then 403s: `Device does not belong to the authenticated user`. Local saves continue.

5. **Some apply failures are terminal.** Unique-key collisions, FK misses (attendance before child exists), and auth rejects become `failed`. The client never re-pushes `failed` or `conflict` ops. There is no retry button — only conflict acknowledge.

6. **Cross-device pull can refuse the server row.** If device B already has a dirty local attendance for the same child+date with a different UUID, pull skips the server row. Device B keeps a local-only record that then fails unique constraint on push.

---

## Actual Architecture

Documented from the running code, not the intended ADR.

```
RegisterChildPage / AttendancePage
  → useData() DataProvider (AppContext.tsx)
  → useChildrenRepository.addChild / useAttendanceRepository.recordAttendance
  → createChildLocalFirst / upsertAttendanceLocalFirst
  → DexieLocalStore.runTransaction (entity + outbox)
  → IndexedDB ecd-offline-u-{userId}
  → getSyncEngine().syncNow()  (if networkState.isOnline)
       → recoverOrphanedSyncOperations
       → pullAll  GET /api/v1/sync/pull
       → pushOutbox  POST /api/v1/sync/push
       → pollSessionUntilSettled  GET /api/v1/sync/sessions/:id
  → SyncService.push  (Prisma insert + session; enqueue BullMQ)
  → SyncProcessor.process  (per-op $transaction + SyncApplyService.apply)
  → PostgreSQL domain table
  → other device pullAll → LocalStore → UI
```

### Frontend files (authoritative)

| Stage | File | Function | Lines |
|-------|------|----------|-------|
| Child UI | `src/pages/caretaker/RegisterChildPage.tsx` | `handleSubmit` | 69–77 |
| Attendance UI | `src/pages/caretaker/AttendancePage.tsx` | record via `useData()` | 148–158 |
| DataProvider | `src/contexts/AppContext.tsx` | `useChildrenRepository` / `useAttendanceRepository` | 321–405 |
| Child repo | `src/features/children/repository.ts` | `addChild` | 86–171 |
| Attendance repo | `src/features/attendance/repository.ts` | `recordAttendance` | 73–129 |
| Child local write | `src/features/children/local-children.ts` | `createChildLocalFirst` | 77–153 |
| Attendance local write | `src/features/attendance/local-attendance.ts` | `upsertAttendanceLocalFirst` | 85–143 |
| IndexedDB | `src/storage/dexie-local-store.ts` | `runTransaction`, `enqueueOperation` | 66–79, 137–176 |
| Outbox select | `src/sync/outbox.ts` | `selectPushBatch` | 56–80 |
| Engine | `src/sync/sync-engine.ts` | `syncNow`, `runCycle` | 100–262 |
| Push | `src/sync/push.ts` | `pushOutbox` | 62–175 |
| Session poll | `src/sync/session.ts` | `pollSessionUntilSettled`, `recoverOrphanedSyncOperations` | 19–138 |
| Pull | `src/sync/pull.ts` | `pullOnce`, `pullAll` | 19–313 |
| Runtime triggers | `src/offline/OfflineRuntimeProvider.tsx` | login + reconnect | 19–102 |
| Device | `src/features/device/ensure-device.ts` | `ensureDeviceRegistered` | 28–111 |
| Auth header | `src/api/interceptors.ts` | Bearer + `x-device-id` | 93–106 |
| Network | `src/network/network-state.ts` | `online`/`offline` only | 22–82 |

District/NCDA stay on React Query → Orval → REST. Caregiver UI does **not** use `src/features/children/mutations.ts` / `src/features/attendance/mutations.ts` (those are REST-only). **RULED OUT** as the caregiver save path.

### Backend files (authoritative)

| Stage | File | Function | Lines |
|-------|------|----------|-------|
| HTTP | `src/modules/sync/sync.controller.ts` | `push`, `pull`, `sessionStatus` | 31–70 |
| Push | `src/modules/sync/sync.service.ts` | `push` | 75–371 |
| Enqueue | `src/modules/sync/sync.service.ts` | `enqueueSession` | 754–769 |
| Recovery | `src/modules/sync/sync.service.ts` | `recoverStalePendingSessions`, `deadLetterSession` | 646–752 |
| Worker | `src/modules/sync/sync.processor.ts` | `process` | 41–250 |
| Apply/CAS | `src/modules/sync/sync-apply.service.ts` | `apply`, `applyCreate`, `casUpdate` | 59–873 |
| Authz | `src/modules/sync/sync-access.service.ts` | `authorizeSyncWrite`, `resolveScope` | 32–150 |
| Queue | `src/modules/sync/sync.module.ts` | BullMQ Redis host/port only | 14–26 |
| Constants | `src/modules/sync/sync.constants.ts` | stale 5 min, max 5 retries, 60s sweep | 24–34 |
| Device | `src/modules/devices/devices.service.ts` | `register` | 28–71 |
| Schema | `prisma/schema.prisma` | `SyncSession`, `SyncOperation`, `Device` | 190–476 |

**Push mode (PROVEN):** C — create session, enqueue, return before apply. Not synchronous apply. Not a mixture inside the HTTP handler.

---

## State Machine

### Frontend outbox (`OutboxStatus`)

Defined in `src/storage/types.ts` lines 4–11:

`pending | blocked | syncing | applied | conflict | failed`

| Current | Event | Next | Code | Recoverable? |
|---------|-------|------|------|--------------|
| (new) | local save, village resolved | `pending` | `local-children.ts:122–135`, `local-attendance.ts:125–135`, `enqueueOperation` default `dexie-local-store.ts:165` | yes |
| (new) | child create, no `homeVillageId` | `blocked` | `local-children.ts:122–135` | yes, if village resolve later succeeds |
| `blocked` | deps applied / village unblocked | `pending` | `outbox.ts:32–36`, `local-children.ts:396–416` | yes |
| `pending` | deps missing | `blocked` | `outbox.ts:37–41` | yes |
| `pending` | selected for push | `syncing` (attempts++) | `push.ts:79–84` | yes |
| `syncing` | push HTTP error | `pending` | `push.ts:165–172` | yes, same `clientOperationId` |
| `syncing` | push result `applied` | `applied` + entity clean | `push.ts:128–137` | n/a |
| `syncing` | push result `conflict`/`failed` | `conflict`/`failed` | `push.ts:138–150` | **no auto-retry** |
| `syncing` | session poll `applied`/`conflict`/`failed` | matching status | `session.ts:34–57` | conflict/failed: **no auto-retry** |
| `syncing` | session `completed` but op not in DTO | `pending` | `session.ts:60–72` | yes |
| `syncing` | session `failed` lingering | `failed` | `session.ts:66–70` | **no auto-retry** |
| `syncing` | poll timeout (~30s) | `pending` (`lastError: Session poll timed out`) | `session.ts:79–87` | yes, **if another cycle runs** |
| `syncing` no `sessionId`, age > 30s | orphan sweep | `pending` | `session.ts:123–131` | yes, **if a cycle runs** |
| `syncing`/`pending` with `sessionId`, age > 30s | orphan sweep | poll that session | `session.ts:118–137` | yes |
| `conflict` | user acknowledge | `applied` (local only) | `acknowledge-conflicts.ts` | discards local mutation |
| `failed` | anything automatic | **stays `failed`** | `outbox.ts:12–13` excludes failed from push | **NO** |
| `blocked` | village resolve throws | **stays `blocked`** | `local-children.ts:429–431` empty catch | until resolve works |

**Can an operation become permanently stuck in `syncing`?**  
**LIKELY no, if a later sync cycle runs.** Orphan sweep resets `syncing` without `sessionId` after 30s, and polls stamped sessions.  
**PROVEN it can remain `syncing` indefinitely if no cycle runs** — there is no data-sync `setInterval`. Triggers are login, reconnect (400ms), post-mutation if online, token refresh, manual “Huza ubu”, logout-sync. Browser close during `syncing` is recovered on next login **only if** the caregiver opens the app again.

**Can poll timeout + IDLE look like success?**  
**PROVEN.** After timeout, `runCycle` still writes `lastSyncedAt` and sets `IDLE` (`sync-engine.ts:237–244`). Pending count remains, but the timestamp says sync just finished.

### Backend `sync_operation`

Enum: `pending | applied | conflict | failed` (`schema.prisma` 190–197). **No** `syncing`/`blocked` on the server.

| Current | Event | Next | Code | Recoverable? |
|---------|-------|------|------|--------------|
| (new) | push auth allowed | `pending` | `sync.service.ts:199–220` | yes |
| (new) | push auth rejected | `failed` immediately | `sync.service.ts:189–220` | **no** (terminal) |
| `pending` | worker apply success | `applied` | `sync.processor.ts:161–169` | n/a |
| `pending` | apply returns conflict/failed | `conflict`/`failed` | same | **no requeue** (comment `sync.service.ts:643`) |
| `pending` | worker throw / Prisma abort | stays `pending` (tx rollback) | processor has no per-loop catch | yes via Bull 3 attempts, then recovery |
| `pending` | dead-letter after 5 recovery retries | `failed` (`max recovery retries exceeded`) | `sync.service.ts:716–726` | **NO** |

### Backend `sync_session`

Enum: `started | completed | failed` (`schema.prisma` 199–205).

| Current | Event | Next | Code | Recoverable? |
|---------|-------|------|------|--------------|
| (new) | push with ≥1 pending op | `started` | `sync.service.ts:300–314` | — |
| (new) | push all auth-rejected | `completed` | same | n/a |
| `started` | worker all ops terminal, ≥1 applied | `completed` | `sync.processor.ts:227–240` | n/a |
| `started` | worker all ops terminal, 0 applied | `failed` | same | n/a |
| `started` | worker still sees pending | **stays `started`** (return) | `sync.processor.ts:212–217` | recovery after 5 min |
| `started` | recovery sweep | stays `started`, `retryCount++`, re-enqueue | `sync.service.ts:685–693` | until retryCount ≥ 5 |
| `started` | retryCount ≥ 5 | `failed` | `deadLetterSession` 737–746 | **NO** |

**Can a session be created but never processed?**  
**PROVEN in code.** `enqueueSession` runs **after** the Prisma transaction (`sync.service.ts:340–341`). If Redis `queue.add` throws, the HTTP request fails, but `sync_session` + `sync_operation` already exist as `started`/`pending`. Recovery also requires Redis (`onModuleInit` repeatable job). If Redis is unavailable, the session is orphaned until Redis returns.

**Can processing fail without marking the session failed?**  
**PROVEN.** Uncaught worker throw: already-committed ops stay terminal; remaining stay `pending`; session stays `started`. Bull retries 3 times. After exhaustion, job is failed; session still `started` until the 5-minute sweep.

**Can a session remain `processing` indefinitely?**  
There is no `processing` status. `started` can remain indefinitely if: Redis down; or an in-flight Bull job is listed in `active|waiting|delayed|paused` so recovery skips it (`sync.service.ts:671–676`); or the worker returns early with `pendingLeft` and a new job is not enqueued until stale.

**Can the client stop polling before completion?**  
**PROVEN.** `SESSION_POLL_MAX_ATTEMPTS = 40`, `SESSION_POLL_INTERVAL_MS = 750` → ~30s (`sync-types.ts:31–32`). Server stale threshold is 5 minutes (`SYNC_STALE_THRESHOLD_MS`).

**Can the same session be polled later?**  
**PROVEN.** `getSessionStatus` is read-only. Orphan sweep polls stamped `sessionId`s. All-replay push returns original `sessionId` per op (`sync-push-idempotency.spec.ts` Scenario 1).

---

## Root Causes

### RC1 — Device registry identity is browser-global (account switch / shared tablet)

| | |
|---|---|
| **Classification** | J. AUTH / DEVICE FAILURE |
| **Severity** | **P0** |
| **Confidence** | **PROVEN** (code). **UNCONFIRMED** that this is the live incident (no production device rows). |
| **Affected workflow** | All caregiver writes (child, attendance, feeding, growth, STED, referral) |
| **Affected code** | `ensure-device.ts:41–78`, `token-storage.ts:36–51`, `ApiAuthProvider.tsx:67–75`, `devices.service.ts:35–38`, `sync.service.ts:84–86` |

**Why it fails**

- `ecd_device_id` and `ecd_device_uuid` live in **browser** `localStorage`, not in the per-user IndexedDB workspace.
- `clearSession` calls `tokenStorage.clearTokens()` only. It does **not** call `clearDeviceId()`.
- On next login, `ensureDeviceRegistered` sees `existingRegistryId`, and if the new user's Dexie workspace has no device row, it **mirrors the previous user's registry UUID** and returns `{ ok: true }` **without** `POST /devices/register`.
- `SyncService.push` then loads that device and throws `ForbiddenException('Device does not belong to the authenticated user')` when `device.userId !== jwt.sub`.
- Local IndexedDB writes still succeed. Sync engine maps non-401 errors to `SYNC_ERROR`. Outbox stays `pending`.

If the client instead calls register with the same `deviceUuid` owned by another user, the backend returns **409** `This device is already registered to another user` (`devices.service.ts:35–38`). That path also leaves the caregiver able to save locally and unable to push.

Pilot doc `docs/offline-pilot-readiness.md` already required “one primary user per tablet” and recorded **human tablet acceptance NOT EXECUTED**. The code does not enforce that control.

### RC2 — Push is async; apply depends on Redis/BullMQ; client gives up at 30s; no heartbeat

| | |
|---|---|
| **Classification** | E. SYNC PUSH + F. SYNC SESSION + G. WORKER / QUEUE + D. SYNC TRIGGER |
| **Severity** | **P0** if Redis/worker is unhealthy; **P1** if only slow |
| **Confidence** | **PROVEN** behavior. Production Redis health: **UNCONFIRMED**. |
| **Affected workflow** | All caregiver outbox ops |
| **Affected code** | `sync.service.ts:243–341`, `enqueueSession:754–769`, `sync.module.ts:14–26`, `session.ts:23–87`, `sync-engine.ts:99–108, 237–244`, `OfflineRuntimeProvider.tsx` (no timer), `sync.constants.ts:24–31` |

**Why it fails**

- HTTP push never calls `SyncApplyService`. Domain durability is a **later job**.
- Redis config is `REDIS_HOST` + `REDIS_PORT` only. **No** `REDIS_URL`, **no** password, **no** TLS anywhere in the backend. Render/Redis Cloud typically require a URL and auth. If production Redis does not match this config, **no session is ever applied**.
- `enqueueSession` is outside the DB transaction. Split brain: session exists, HTTP 500, client restores `pending`.
- Client poll window (30s) is far shorter than server recovery (5 min) and BullMQ default `lockDuration` (30s, **not set** on `@Processor`).
- After poll timeout the engine stamps `lastSyncedAt` and `IDLE` even though ops are `pending` again.
- **No periodic sync.** `markUnreachable` does **not** flip status to `OFFLINE` while `navigator.onLine` is true (`network-state.ts:62–68`), so a failed push while “online” does **not** fire the reconnect trigger.
- After 5 recovery requeues, remaining pending ops are **dead-lettered to `failed`** (`max recovery retries exceeded`). That is permanent data loss from the caregiver’s point of view.

Queue facts (PROVEN):

| Setting | `process-session` | `recover-stale` |
|---------|-------------------|-----------------|
| Queue | `sync-operations` | same |
| Attempts | 3 | default 1 |
| Backoff | exponential 2s | none |
| Concurrency | unset (BullMQ default 1) | — |
| Timeout / lockDuration | **unset** (lock 30s) | unset |
| removeOnComplete | 100 | true |
| removeOnFail | 200 | 50 |
| Repeat | no | every 60s |

One failed operation does **not** stop the rest of the session (apply catch → `failed`, loop continues). An **uncaught** throw **does** stop later ops in that job.

### RC3 — Attendance (and other child-scoped creates) can fail terminally; pull then hides the server row

| | |
|---|---|
| **Classification** | H. DATABASE TRANSACTION + C. OUTBOX STATE MACHINE + K. PULL / CROSS-DEVICE |
| **Severity** | **P0** for attendance/cross-device; **P1** for child-before-attendance ordering |
| **Confidence** | **PROVEN** |
| **Affected workflow** | Attendance; also nutrition/STED/referral if parent child is not on the server yet |
| **Affected code** | `local-attendance.ts` (no `dependsOn`), `sync-apply.service.ts:84–116, 1080–1127` vs feeding upsert `175–229`, `outbox.ts:12–13`, `pull.ts:103–116`, `apply-local.ts:119–128` |

**Why it fails**

1. Attendance outbox has **no** `dependsOn` the child create. Nutrition/STED referrals **do** use `dependsOn`. Attendance does not.
2. Child create without village is `blocked` (`local-children.ts:122`). Attendance for that child is independently `pending` and can be pushed first.
3. Push auth for attendance CREATE uses `payload.centerId` (`sync-access.service.ts:373–375`), so auth can **pass** even if the child row does not exist.
4. `attendanceRecord.create` then hits FK `childId` or unique `(childId, attendanceDate)` (`schema.prisma:606`). `applyCreate` catch converts that to **`failed`**, not conflict, not upsert (`sync-apply.service.ts:109–115`).
5. Feeding day/month **upsert by natural key**. Attendance **does not**. That inconsistency is the smoking gun that attendance unique collisions are unhandled.
6. Client never selects `failed` for push. Settings shows failed items with **no retry**.
7. Cross-device: Device B dirty local row UUID-2, server has UUID-1 for same child+date. `pullOnce` finds `byKey` dirty and **`continue`s** — it will not adopt the server row (`pull.ts:110–113`).

### RC4 — Child create can remain `blocked` (village) or fail FK (`homeVillageId`)

| | |
|---|---|
| **Classification** | C. OUTBOX STATE MACHINE (+ H if empty village is pushed) |
| **Severity** | **P1** (P0 if village resolve is systematically failing in the field) |
| **Confidence** | **PROVEN** path; field frequency **UNCONFIRMED** |
| **Affected workflow** | Child registration; anything that depends on that child |
| **Affected code** | `repository.ts:137–160`, `local-children.ts:122–135, 381–431`, `sync-apply.service.ts:1070`, `schema.prisma:500, 515` |

Offline (or failed) village resolve → `blocked` + `homeVillageId required before sync`. UI still toasts `childRegisteredLocal`. Unblock on reconnect swallows errors (`local-children.ts:429–431`). `Child.homeVillageId` is a required FK. An empty string pushed as `String(payload.homeVillageId)` fails create → terminal `failed`.

### RC5 — JWT expiry: local save continues, sync stops

| | |
|---|---|
| **Classification** | J. AUTH / DEVICE FAILURE |
| **Severity** | **P1** |
| **Confidence** | **PROVEN** |
| **Affected workflow** | All sync; not local save |
| **Affected code** | `auth.service.ts:265–266` (access 15m, refresh 7d), `interceptors.ts:61–82, 115+`, `sync-engine.ts:124–135, 247–253`, `ApiAuthProvider.tsx:145–150` |

401 → refresh. Failed refresh → `AUTH_REQUIRED`, IndexedDB preserved. Indicator can show sign-in required. Save toasts still succeed. After 7 days without a working refresh, the outbox can accumulate forever.

### RC6 — Observability cannot answer the production question

| | |
|---|---|
| **Classification** | L. OBSERVABILITY FAILURE |
| **Severity** | **P2** (blocks proving which P0 is live) |
| **Confidence** | **PROVEN** |
| **Affected code** | `sync.service.ts` push has **no success log**; processor logs `sessionId` only (`sync.processor.ts:55, 247`); apply CREATE logs entity type + Error (`sync-apply.service.ts:110`); rejected writes log user/entity/reason but not `clientOperationId` (`sync-access.service.ts:422–425`) |

A production engineer **cannot** answer “why didn’t this caregiver’s attendance reach the server?” from logs alone. Missing: structured `deviceId`, `clientOperationId`, `sessionId`, `entityId` on push accept, enqueue failure, apply result, and dead-letter.

---

## Representative trace: Register child

```
RegisterChildPage.handleSubmit
  → addChild (repository.ts:86)
      resolve village cache / online resolveHomeVillageId (128–152)
      createChildLocalFirst (154–160)
          id = createUuid(), clientOperationId = createUuid()  (local-children.ts:81–82)
          Dexie tx: putChild + enqueueOperation entityType 'child' operation 'create'
          status pending | blocked
      invalidate React Query
      if online: void syncNow()   (164–166)  — fire-and-forget
  → toast childRegisteredLocal (RegisterChildPage.tsx:76)
```

| Stage | Input | Output | Transaction | Error / retry |
|-------|-------|--------|-------------|---------------|
| UI | form | toast + navigate | none | mutation error toast only |
| Repo | form, centerId | ChildViewModel | none | village resolve catch → blocked |
| LocalStore | child + op | durable rows | Dexie rw `children`+`sync_operations`+`village_cache` | `LocalWriteError` if IDB fails — **does not toast success** |
| Outbox | payload from `buildChildCreateSyncPayload` | `clientOperationId` stable; version 0; entityId = child id | same tx | coalesce on later edits reuses id |
| Sync trigger | if `isOnline` | `syncNow` single-flight | n/a | offline: no push until reconnect/login/manual |

**Idempotency / device / entity / CAS on the outbox row (PROVEN if the tx commits):**

| Question | Answer |
|----------|--------|
| A. Domain record in IDB? | Yes — `putChild` in same tx |
| B. Outbox record? | Yes — `enqueueOperation` in same tx |
| C. Status correct? | `pending` or `blocked` |
| D. Payload complete? | names, centerId, DOB, gender, guardians, `homeVillageId`, `registrationNumber` (`child-sync-mapper.ts:98–118`) |
| E. Stable clientOperationId? | UUID, reused on coalesce (`dexie-local-store.ts:137–175`) |
| F. Device ID on the op? | **Not stored on the outbox row.** Taken at push from `tokenStorage.getDeviceId()` (`sync-engine.ts:156–163`) |
| G. Entity ID? | Client UUID = child id |
| H. Version/CAS? | create version 0; stuffed as `__clientVersion` at push (`sync.service.ts:173–178`) |

If IndexedDB itself fails, the UI does **not** claim success (`dexie-local-store.ts:75–77`). **RULED OUT** as the default explanation for “UI said saved.”

---

## Representative trace: Attendance

```
AttendancePage → recordAttendance (repository.ts:73)
  recordedById = user.id  (110–118)  — display name from UI is ignored
  upsertAttendanceLocalFirst
      natural key childId+date
      create vs update; coalesce unsynced create
      status always pending  (NO dependsOn child)
  if online: void syncNow()
```

`recordedBy`/`recordedById` in the push payload are the user UUID (`attendance-sync-mapper.ts:93–94`). FK to `UserAccount` is **RULED OUT** for the DataProvider path (the comment at `repository.ts:110` exists because the UI still passes a display name).

---

## Reproduction

**Live caregiver scenario (login → save → disconnect → reopen → inspect IDB/API/DB): NOT EXECUTED.**

No caregiver session was opened. No IndexedDB was inspected. No `sync_session` rows were queried. This audit must not invent a reproduction.

**Code-path reproductions that are already encoded in tests (PROVEN):**

| Path | Evidence |
|------|----------|
| Duplicate push does not duplicate ops or queue jobs | `ECD Backend/src/modules/sync/__tests__/sync-push-idempotency.spec.ts` Scenario 1–2 |
| Stale `started` session requeued; dead-letter after 5 retries | `sync-recovery.spec.ts` |
| Orphan `syncing` without sessionId → pending → re-push | `src/sync/sync-engine.test.ts` ~412 |
| Orphan `syncing` with sessionId → poll | same file ~466 |
| Referral/nutrition `dependsOn` parent | `nutrition-sync.test.ts`, `sted-sync.test.ts` — **attendance has no equivalent** |

**Recommended live reproduction (fix sprint, not this audit):**

1. Login caregiver A on tablet 1. Register child. Record attendance. Confirm `sync_operation.status=applied` and domain row.
2. Login caregiver B on the **same browser** (do not clear site data). Save anything. Expect 403 device mismatch (RC1).
3. Login A, disconnect, save, kill tab, reopen, reconnect. Confirm orphan sweep + session poll.
4. Two devices, same child, same date, both offline, then both sync. Expect unique fail + dirty pull skip (RC3).
5. Stop Redis, save online, inspect: `sync_session=started`, domain row absent, client pending after 30s.

---

## Database Evidence

**No production or local PostgreSQL dump was taken.** The following is the **expected** fingerprint for each failure, to be run in the next sprint.

```sql
-- Sessions that accepted work but never finished
SELECT id, device_id, status, total_operations, successful_operations,
       failed_operations, retry_count, started_at, completed_at, last_retry_at
FROM sync_session
WHERE status = 'started'
ORDER BY started_at ASC;

-- Ops accepted but never applied
SELECT so.id, so.device_id, so.session_id, so.client_operation_id,
       so.entity_type, so.entity_id, so.operation, so.status,
       so.conflict_reason, so.created_at, so.processed_at
FROM sync_operation so
WHERE so.status = 'pending'
ORDER BY so.created_at ASC;

-- Terminal apply failures (unique, FK, auth, dead-letter)
SELECT entity_type, conflict_reason, count(*)
FROM sync_operation
WHERE status IN ('failed', 'conflict')
GROUP BY 1, 2
ORDER BY 3 DESC;

-- Device ownership mismatches (shared tablet)
SELECT d.id, d.device_uuid, d.user_id, d.status, d.last_sync_at, u.username
FROM device d
JOIN user_account u ON u.id = d.user_id
ORDER BY d.last_sync_at DESC NULLS LAST;
```

| Fingerprint | Meaning |
|-------------|---------|
| Domain row absent, `sync_operation` absent | Never reached push (blocked, no device, AUTH_REQUIRED, never triggered) |
| Domain row absent, `sync_operation=pending`, `sync_session=started` | Worker/Redis/session orphan (RC2) |
| Domain row absent, `sync_operation=failed` | Apply/auth/dead-letter (RC3/RC4/RC2) |
| Domain row absent, `sync_operation=syncing` | **Impossible on server** (no such status) |
| Domain row exists, outbox still `pending`/`syncing` | Client missed completion (poll timeout / closed browser); recover by polling session |
| Domain row exists, Device B missing | Pull skip dirty / cursor / scope (RC3, K) |

---

## Recovery Analysis

| Scenario | Recovers? | Evidence |
|----------|-----------|----------|
| Browser restart | **LIKELY yes** if user logs in again | `OfflineRuntimeProvider` startup `syncNow`; orphan sweep 30s |
| Network loss during save | **PROVEN yes** for local durability; push later on `online` | Dexie tx; reconnect debounce 400ms |
| Network dies during push | **PROVEN** client restores `pending` | `push.ts:165–172` |
| Server unavailable | **PROVEN** pending retained; retry only on next trigger | no timer; `markUnreachable` won’t force OFFLINE |
| Worker crash | **LIKELY yes** after 5 min if Redis up; **NO** after 5 dead-letter retries | `recoverStalePendingSessions`, `deadLetterSession` |
| Orphaned session | **LIKELY** via sweep **if Redis works**; **NO** if Redis down | recovery job is BullMQ |
| Duplicate push | **PROVEN** idempotent `(deviceId, clientOperationId)` | unique index + replay; tests |
| JWT expiry | **PROVEN** outbox preserved; sync stops until re-login | `AUTH_REQUIRED`, no IDB wipe |
| Shared tablet account switch | **PROVEN no** until device id is re-registered to the new user | RC1 |
| `failed` unique/FK | **PROVEN no** | not selected for push; no retry UI |

Existing recovery mechanisms **exist** (`recoverOrphanedSyncOperations`, `recoverStalePendingSessions`) but:

- Client recovery is **unreachable** without a sync trigger (no heartbeat).
- Server recovery is **unreachable** without Redis.
- Dead-letter **intentionally destroys** remaining pending ops after 5 retries.
- `failed` / `conflict` are **not** connected to those mechanisms.

---

## Cross-Device Analysis

### Device A → Server

**Works when:** device belongs to the JWT user, Redis/worker apply the session, apply does not hit unique/FK/auth, child is not `blocked`.

**Fails when:** RC1–RC5.

### Server → Device B

Pull is **synchronous**, center-scoped (`SyncAccessService.resolveScope`: caregiver = own `centerId`). Cursor advances only after local persist (`pull.ts:276–282`).

**Works when:** Device B has no dirty local row for that entity id (and, for attendance, no dirty sibling on the same natural key).

**Fails when:**

- Dirty skip (`shouldSkipDirtyPull`) — Device B keeps local unsynced row, ignores server snapshot for that id.
- Attendance natural-key dirty sibling (`pull.ts:110–113`) — Device B refuses the server attendance row.
- Device B never runs a sync cycle (same trigger gaps).
- Caregiver B is a different center — out of scope by design.

**Do not diagnose “save failure” if PostgreSQL has the row and Device B does not.** That is pull/cross-device (K), not write (E/H).

District/NCDA seeing missing data is a **server write** problem (they are online-first REST/Prisma), not pull. If NCDA also lacks the row, Device A → Server failed.

---

## Failure Matrix

| Scenario | Local save | Outbox | Push | Server domain | Pull | Expected recovery today |
|----------|------------|--------|------|---------------|------|-------------------------|
| Online save, healthy Redis | PASS | `pending`→`syncing`→`applied` | session+job | applied | Device B if not dirty | works |
| Offline save | PASS | `pending`/`blocked` | none | absent | n/a | reconnect/login/manual |
| Reconnect | — | unblock village + `syncNow` | yes | if worker healthy | yes | 400ms debounce |
| Browser restart | durable IDB | `syncing` recovered after 30s | replay or poll | if session completed | yes | login trigger |
| Network dies during push | PASS | back to `pending` | HTTP error | maybe session exists | n/a | next trigger; idempotent |
| Server unavailable | PASS | `pending` | fail | absent | n/a | next trigger; no heartbeat |
| JWT expires (refresh dead) | PASS | stays pending | AUTH_REQUIRED | absent | n/a | re-login |
| Worker crash | PASS | poll timeout → pending | session `started` | absent until retry | n/a | 5 min sweep; dead-letter at 5 |
| Session orphaned (Redis down) | PASS | pending | 500 or started/no job | absent | n/a | **stuck until Redis** |
| Duplicate push | — | same id | replayed | one mutation | — | **PROVEN** |
| Two devices same attendance day | both PASS locally | both pending | second `failed` unique | first wins | B may skip dirty | **does not converge** |
| Shared tablet user B | PASS | pending | **403 device** | absent | n/a | **stuck** |
| Child blocked (village) | PASS | `blocked` | not selected | absent | n/a | until village resolve |
| Attendance before child on server | PASS | pending | accepted | `failed` FK | n/a | **terminal** |

---

## Fix Plan

Do **not** implement in this audit. Minimum correct changes, smallest first.

### P0

1. **Device identity per account (Frontend + Backend)**  
   - Clear or namespace `ecd_device_id` on logout.  
   - Never mirror another user’s registry id into a new workspace.  
   - On 409, register a **new** `deviceUuid` for the current user (or transfer device with an explicit admin/user action).  
   - Backend: consider allowing the same physical tablet to re-bind to a new user with an audit event, **or** keep 409 but make the client always mint a new uuid after logout.  
   - Tests: account switch on one origin; push must not 403.

2. **Production worker forensics (ops, not a code guess)**  
   - Run the SQL above.  
   - Confirm Redis is reachable with the **actual** Render env (URL/password/TLS).  
   - If Redis is misconfigured: fix env first — that alone can restore all domains.  
   - Backend: support `REDIS_URL` / password / TLS. Wrap `enqueueSession` so a queue failure is logged with `sessionId` and does not pretend the HTTP push “fully succeeded” without a job.

3. **Attendance natural-key apply + child `dependsOn` (Backend + Frontend)**  
   - Apply attendance CREATE like feeding: find `(childId, date)`, upsert/CAS, do not `failed` on P2002.  
   - Frontend: attendance/nutrition/STED outbox `dependsOn` the child’s create op when that child is still unsynced.  
   - Pull: if dirty sibling exists, conflict or CAS-merge — do not silently `continue`.  
   - Tests: two devices same day; attendance while child still `pending`/`blocked`.

4. **Do not dead-letter caregiver data without a retry path**  
   - Either stop converting pending → failed after 5 retries, or add an operator replay and a client retry for `failed` with transient reasons.  
   - Client: never stamp `lastSyncedAt` / `IDLE` after poll timeout; keep cycling or schedule a heartbeat (60s) while `pending|syncing` and online.

### P1

5. Village resolve: surface `blocked` in the register toast; retry resolve on a timer; do not swallow unblock errors.  
6. JWT: surface `AUTH_REQUIRED` as a blocking banner, not only a tiny indicator; queue sync on next login (already does).  
7. BullMQ: set `lockDuration` / stall interval for 500-op batches; session poll window ≥ worst-case apply time.  
8. Failed-ops retry in Settings (transient reasons only).

### P2

9. Structured logs: `deviceId`, `sessionId`, `clientOperationId`, `entityType`, `entityId`, `status` on push accept, enqueue, apply, dead-letter. No PII in payload dumps.  
10. Align `lastSyncedAt` with “outbox empty of pending/syncing.”

### Per-layer checklist

| Fix | Frontend | Backend | Database | OpenAPI | Tests |
|-----|----------|---------|----------|---------|-------|
| Device rebind | yes | maybe (409 policy) | device rows | no | yes |
| Redis URL/TLS | no | yes | no | no | yes (config) |
| enqueue vs HTTP | no | yes | no | maybe error DTO | yes |
| Attendance upsert | dependsOn | applyCreate | no schema change | no | yes |
| Heartbeat / lastSyncedAt | yes | no | no | no | yes |
| Dead-letter policy | retry UI | recovery | no | no | yes |
| Observability | console correlation | logger | no | no | contract tests |

**Out of scope until P0 is done:** NCDA/District UI, caregiver redesign, CAS semantics change for child DOB/gender, schema migrations unless forensics prove a constraint bug.

---

## Logging / Observability Audit

Can a production engineer answer “Why didn’t this caregiver’s attendance reach the server?” from logs alone?

**No. PROVEN.**

| Event | Logged today? | IDs |
|-------|---------------|-----|
| Push accepted | no | — |
| Enqueue failed | Nest exception only | maybe stack, not sessionId guaranteed |
| Worker start/finish | yes | `sessionId`, counts |
| Op failed | warn | Prisma `op.id`, reason; not `clientOperationId` |
| Auth reject | warn | userId, entityType, entityId, reason |
| Dead-letter | error | `sessionId` |
| Client poll timeout | no (only `lastError` in IDB) | — |

Minimum add (fix sprint): one JSON line per op terminal state with `deviceId`, `sessionId`, `clientOperationId`, `entityType`, `entityId`, `status`, `conflictReason`.

---

## Idempotency

Invariant **PROVEN for the push insert path** (not for domain unique keys):

Same `deviceId` + same `clientOperationId` + multiple pushes = one `sync_operation` row, `replayed: true`, original `sessionId`, no second job (`sync.service.ts:108–169, 252–285`, unique `@@unique([deviceId, clientOperationId)]`, tests).

If the **first apply succeeded** and the client retries, replay returns `applied` and the client marks local applied (`push.ts:128–137`). **No second domain insert** via that client id.

If the first apply **failed** on unique `(childId, date)` with a **different** `clientOperationId` (second device), idempotency does **not** help. That is RC3, not an idempotency bug.

REST `writeSyncOperation` inserts `applied` rows with **null** `clientOperationId` and does not participate in this key. Irrelevant to caregiver push.

---

## Authentication / Device ID

| Check | Result |
|-------|--------|
| JWT on sync | **PROVEN** — global JWT, `Authorization` interceptor |
| `x-device-id` header | **PROVEN** set from `tokenStorage` |
| Push body `deviceId` | **PROVEN** from same storage at cycle start |
| Header vs body compared? | **PROVEN no** — backend uses body `dto.deviceId` only |
| Device must belong to JWT user | **PROVEN** |
| Device id changes unexpectedly | **PROVEN** it **does not** change on logout (that is the bug); it **can** be wrong for the new user |
| Expired JWT + local save | **PROVEN** save works, sync `AUTH_REQUIRED` |

---

## Classification ranking

| ID | Class | Severity | Confidence |
|----|-------|----------|------------|
| RC1 | J Auth/device | P0 | PROVEN code / UNCONFIRMED live |
| RC2 | E+F+G+D Push/session/worker/trigger | P0/P1 | PROVEN code / UNCONFIRMED Redis |
| RC3 | H+C+K Apply + terminal outbox + pull | P0 | PROVEN |
| RC4 | C Village block | P1 | PROVEN path |
| RC5 | J JWT | P1 | PROVEN |
| RC6 | L Observability | P2 | PROVEN |

**A. LOCAL PERSISTENCE** — **RULED OUT** as the default cause (atomic Dexie tx; write errors do not toast success).  
**B. OUTBOX CREATION** — **PASS** for the happy path; **FAIL** only if village block is counted as “no pushable outbox.”  
**I. IDEMPOTENCY** — **PASS** for `(deviceId, clientOperationId)`; does not cover natural-key duplicates across devices.

---

## Final Status

SYNC SAVE FAILURE FORENSIC AUDIT

Local persistence:
PASS

Outbox creation:
PASS (blocked child creates are created but not pushable)

Outbox recovery:
FAIL (failed/conflict never retried; syncing recovered only if a later cycle runs; no heartbeat)

Sync trigger:
FAIL (no periodic timer; poll timeout marks IDLE; online+error does not reconnect)

Sync push:
PASS (contract/idempotency) / FAIL (HTTP can return before apply; enqueue-after-commit)

Sync session:
FAIL (can remain started; client abandons at 30s; dead-letter at 5 retries)

Worker:
FAIL if Redis/lock/stall; PASS for per-op apply isolation when the job runs

Database persistence:
UNKNOWN in production; FAIL for attendance unique/FK and empty homeVillageId when those paths fire

Idempotency:
PASS for clientOperationId replay; FAIL for cross-device natural keys

Authentication/device:
FAIL (browser-global device id reused across users; 403/409; JWT expiry stops sync only)

Cross-device pull:
FAIL when Device B has a dirty natural-key sibling; PASS otherwise if server write succeeded

Primary root cause:
Pipeline-wide: local save is acknowledged before server apply, and device identity + async Redis worker + 30s poll without heartbeat can prevent every caregiver domain from becoming durable server data (RC1 + RC2). Which of those is live is UNCONFIRMED without SQL/Redis forensics.

Secondary root causes:
RC3 attendance unique/FK + dirty pull skip; RC4 village-blocked child; RC5 JWT; RC6 observability; terminal failed outbox with no retry.

P0:
Device rebind on account switch; production Redis/worker/session SQL forensics; attendance natural-key apply + child dependsOn; stop silent lastSyncedAt on poll timeout; heartbeat while pending; do not dead-letter without replay.

P1:
Village unblock UX/retry; JWT blocking banner; BullMQ lockDuration; failed-op retry for transient errors.

P2:
Structured correlation logs; lastSyncedAt only when outbox is clear.

Production data-loss risk:
HIGH (CRITICAL if Redis is down or shared tablets are in use — both are consistent with “all record types” failing)

Code changed:
NO

Recommended next sprint:
1) Query production sync_session/sync_operation/device and Redis health to pick the live P0. 2) Fix device identity. 3) Fix worker/enqueue/heartbeat. 4) Fix attendance natural-key + dependsOn. 5) Add correlation logs. Do not start NCDA/District/UI/CAS work until that sprint lands.
