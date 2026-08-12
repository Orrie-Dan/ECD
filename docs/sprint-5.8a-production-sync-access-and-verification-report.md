# Sprint 5.8A — Production Sync Access & Verification Gate

**Date:** 2026-08-12  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Prior reports:**  
`docs/sprint-5.8-production-sync-verification-report.md`,  
`docs/sprint-5.7-production-sync-verification-report.md`,  
`docs/sprint-5.6-sync-reliability-report.md`,  
`docs/sync-save-failure-forensic-audit.md`

**Code changed during this sprint:** NO

---

## Executive Verdict

**PRODUCTION SYNC BLOCKED**

This sprint is an **access and verification gate**, not a code sprint.

All hard-stop conditions that prevent controlled production verification are still true from this workstation:

1. Production PostgreSQL access is unavailable  
2. Production Redis access is unavailable  
3. BullMQ worker cannot be observed  
4. No approved caregiver test account exists  
5. Production writes are not authorized  

Therefore:

- production sync is **not verified**
- the original field incident is **neither confirmed nor disproven**
- **another sync-code sprint is not justified** until access + controlled test evidence exist

No speculative sync architecture changes were made. Seed/demo credentials were not used against production. No production rows were written, deleted, or repaired.

---

## Phase 1 — Repository / Environment Audit (read-only)

### Frontend pipeline (as implemented)

```text
Caregiver UI
  → IndexedDB (Dexie LocalStore)
  → outbox (sync_operations)
  → SyncEngine.syncNow()
  → ensureDeviceRegistered / x-device-id
  → POST /api/v1/sync/push
  → sessionId (+ poll GET /api/v1/sync/sessions/{id})
  → heartbeat (OfflineRuntimeProvider)
  → local status applied only on server "applied"
```

Key behaviors already in local source (Sprints 5.6 / 5.7):

| Concern | Local source status |
|---------|---------------------|
| Device identity isolation | `clearBrowserDeviceIdentity` on logout; per-user restore |
| Timeout ≠ synced | `lastSyncedAt` only when unresolved outbox empty |
| Heartbeat | periodic `syncNow` while online |
| Failed-op recovery | retryable `failed` → `pending` |
| Attendance `dependsOn` child create | present |
| Attendance natural-key pull reconcile | present |
| Feeding dirty-sibling reconcile | present (`centerId+date` / `centerId+yearMonth`) |
| Village dependency blocking | stays blocked until village resolve |

### Backend pipeline (as implemented)

```text
POST /sync/push
  → assert device ownership
  → sync_session (started)
  → sync_operation rows
  → BullMQ queue "sync-operations" (job process-session)
  → SyncProcessor apply
  → PostgreSQL domain tables
  → session completed/failed
GET /sync/pull → keyset cursor → client IndexedDB
```

Worker constants in local source:

| Setting | Value |
|---------|-------|
| Queue | `sync-operations` |
| Jobs | `process-session`, `recover-stale` |
| Concurrency | 1 |
| lockDuration | 120s |
| stalledInterval | 30s |
| maxStalledCount | 2 |
| Stale recovery | 5 min / max 5 retries then parked 15 min |

Redis: `buildRedisConnection` supports `REDIS_URL` / password / TLS; local `.env` still uses host/port localhost only.

**No code was changed in this phase.**

---

## Phase 2 — Production Access Requirements

| Requirement | Why needed | Current status |
|-------------|------------|----------------|
| Production API | Confirm host up; auth gate; OpenAPI surface | **AVAILABLE** — Render host responds |
| Production Postgres read access | Aggregate `sync_session` / `sync_operation` / `device` / domain persistence | **MISSING** — only localhost `DATABASE_URL` in workspace |
| Production Redis read/ops access | Queue depth, waiting/active/failed/stalled jobs | **MISSING** — local Redis `ECONNREFUSED`; no prod `REDIS_URL` |
| Worker logs | Correlate deviceId → sessionId → apply → DB | **MISSING** — no Render CLI / log credentials |
| Approved caregiver test account | Controlled E2E without real caregiver data | **MISSING** |
| Second caregiver/device | Cross-device pull | **MISSING** |
| Production deployment/version | Correlate running artifact with 5.6/5.7 source | **UNKNOWN** — OpenAPI `info.version` is `1.0` only; no build SHA endpoint |

### Exact next actions required (access only)

1. Provide **read-only** production PostgreSQL access (or an approved aggregate query channel).  
2. Provide **read-only** production Redis / BullMQ visibility (or Render queue dashboard).  
3. Provide **Render (or host) log access** for `sync.*` events.  
4. Provide one **approved caregiver test account** + test center scope + explicit write authorization.  
5. Optionally provide a second approved caregiver/device for pull.  
6. Optionally expose a deployed build identifier (git SHA / release tag).

Do **not** guess credentials. Do **not** use seed admin credentials against production.

---

## Phase 3 — Production API Verification (safe, non-mutating)

| Probe | Result |
|-------|--------|
| `HEAD/GET /docs` | **200** |
| `GET /docs-json` | **200** (~205 KB), title `ECD Backend API`, OpenAPI `info.version` = `1.0` |
| `GET /api/v1/sync/pull` (unauthenticated) | **401** |
| Sync paths present in deployed OpenAPI | `/api/v1/devices/register`, `/my-devices`, `/sync/push`, `/sync/pull`, `/sync/sessions/{sessionId}` |
| Session DTO fields exposed | `status`, counts, `retryCount`, `lastRetryAt`, `startedAt`, `completedAt`, per-op `status` / `conflictReason` / `processedAt` |

### Deployed code vs Sprint 5.6 / 5.7

Sprint 5.6 / 5.7 reliability changes were largely **behavioral** (worker lock, recovery park, client heartbeat, feeding pull reconcile, village block). Prior reports documented **OpenAPI changed: NO**.

From the public OpenAPI alone:

- sync/device endpoints exist  
- session progress fields exist  
- **behavioral** fixes (timeout ≠ synced, dead-letter removal, dirty-sibling pull, village block) **cannot** be confirmed as deployed

```text
DEPLOYED CODE VERSION: UNKNOWN
```

No mutating login or sync push was attempted.

---

## Phases 4–11 — Not executed (hard stop)

| Phase | Status | Reason |
|-------|--------|--------|
| 4 Production DB forensics | **STOPPED** | No authorized prod Postgres |
| 5 Redis / BullMQ forensics | **STOPPED** | No authorized prod Redis |
| 6 Worker verification | **STOPPED** | Worker unobservable |
| 7 Online E2E | **STOPPED** | No approved test account / write auth |
| 8 Offline → online | **STOPPED** | Same |
| 9 Cross-device pull | **STOPPED** | No second device / account |
| 10 JWT expiry | **STOPPED** | No approved account / safe token scenario |
| 11 Device identity live | **STOPPED** | No approved dual caregiver identities |

Local Postgres aggregates (not production): `sync_session=0`, `sync_operation=0`, `device=0`. Local Redis down. Empty local DB is not production evidence.

---

## Evidence

| Area | Result | Evidence |
|------|--------|----------|
| Production API | **UP / AUTH GATED** | `/docs` 200; pull 401; OpenAPI sync paths present |
| Production Postgres | **UNAVAILABLE** | Workspace DB URL is local-only |
| Production Redis | **UNAVAILABLE** | No prod Redis; local ECONNREFUSED |
| BullMQ worker | **UNOBSERVABLE** | Cannot confirm deploy, same Redis, or job processing |
| Sync sessions | **UNKNOWN** | No prod DB |
| Sync operations | **UNKNOWN** | No prod DB |
| Device identity | **CODE READY / LIVE UNTESTED** | Local source + unit tests; no live dual-login |
| Online save | **NOT RUN** | Hard stop |
| Offline save | **NOT RUN** | Hard stop |
| Offline → online | **NOT RUN** | Hard stop |
| Cross-device pull | **NOT RUN** | Hard stop |
| JWT expiry | **CODE READY / LIVE UNTESTED** | Unit path exists; production not run |
| Attendance | **CODE READY / LIVE UNTESTED** | Natural-key + dependsOn in source |
| Feeding | **CODE READY / LIVE UNTESTED** | Dirty-sibling reconcile in source |
| Child registration | **CODE READY / LIVE UNTESTED** | Village block in source |

---

## Production Incident Status

**Still OPEN — not reproducible from this workstation.**

| Question | Answer |
|----------|--------|
| Is the original data-loss incident **confirmed** in production? | **NO** — insufficient access to confirm |
| Is it **disproven**? | **NO** — insufficient access to disprove |
| Can unit-test green mean production-safe? | **NO** |
| Is another sync **code** sprint justified now? | **NO** |

Decision rule for what comes next:

```text
production evidence → controlled test → failure reproduction → targeted fix
```

not:

```text
production unavailable → speculate → modify sync → hope
```

---

## Remaining P0

Only genuine blockers to verification:

1. **Authorized read-only production PostgreSQL** (or equivalent aggregate channel)  
2. **Authorized production Redis / BullMQ visibility**  
3. **Worker / application log access** correlating `deviceId` / `sessionId` / apply  
4. **Approved caregiver test account** + test center/data scope  
5. **Explicit authorization** for bounded production test writes  

Until these exist, the sync incident cannot be closed.

---

## Remaining P1

Operational improvements that do **not** justify a sync rewrite today:

1. Expose a deployed build identifier (git SHA / release) on the API or docs  
2. Second approved caregiver/device for pull  
3. Render dashboard runbook for queue depth without raw Redis credentials  
4. Pre-existing unrelated `sted.service.spec` harness failure (unchanged)

---

## Code Changes

- frontend changed: **NO**  
- backend changed: **NO**  
- OpenAPI changed: **NO**  
- Prisma migration: **NO**  

Caregiver offline architecture changed: **NO**

---

## Final answers (requested)

1. **Verdict:** `PRODUCTION SYNC BLOCKED`  
2. **Production evidence:** API up and auth-gated; OpenAPI sync contract present at version `1.0`; Postgres/Redis/worker/logs/test account **missing**  
3. **Exact blockers:** prod Postgres read, prod Redis/BullMQ observe, worker logs, approved caregiver test account, write authorization  
4. **Original data-loss incident:** **still open** — **neither confirmed nor disproven**  
5. **Is another code sprint justified?** **No** — access/verification first; code only after production-proven failure  

STOP. Do not start Sprint 5.9 or any NCDA/District feature sprint from this gate.
