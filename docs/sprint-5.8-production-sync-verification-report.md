# Sprint 5.8 — Production Sync Forensics & Controlled End-to-End Verification

**Date:** 2026-08-12  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Prior reports:**  
`docs/sync-save-failure-forensic-audit.md`,  
`docs/sprint-5.6-sync-reliability-report.md`,  
`docs/sprint-5.6-sync-state-machine-audit.md`,  
`docs/sprint-5.7-production-sync-verification-report.md`

**Code changed during this sprint:** NO

---

## Executive verdict

**READY WITH CONDITIONS**

Sprint 5.8 hit hard-stop conditions before production pipeline truth could be established:

```text
PRODUCTION INFRASTRUCTURE UNAVAILABLE
```

for PostgreSQL, Redis/BullMQ, and Render application logs from this workstation.

Additionally:

```text
NO APPROVED CAREGIVER TEST ACCOUNT
```

was available for controlled live writes.

Therefore this sprint **cannot** declare:

```text
PRODUCTION VERIFIED
```

No speculative sync fix was implemented. No production data was modified. No credentials were printed or bypassed.

---

## Hard-stop triggers that fired

| Condition | Result |
|-----------|--------|
| Production database access unavailable | **YES — STOP** |
| Production Redis access unavailable | **YES — STOP** |
| No approved caregiver test account | **YES — STOP** |
| Production testing would risk real user data | **YES — no live writes attempted** |
| Production worker cannot be safely observed | **YES — STOP** |
| Credentials/access missing for prod DB/Redis/logs | **YES — STOP** |

Per sprint rules: do not simulate production and call it production verification. Do not invent evidence.

---

## Infrastructure evidence

### Production access audit

| Resource | Available? | Evidence |
|----------|------------|----------|
| Production HTTP API (`VITE_API_BASE_URL` → Render host) | **YES** | `/docs` → 200; `OPTIONS /api/v1/auth/login` → 204; `GET /api/v1/sync/pull` → 401 |
| Production PostgreSQL | **NO** | Backend `.env` `DATABASE_URL` targets **localhost only**. No production tunnel, no Render DB URL in this environment. |
| Production Redis | **NO** | Backend `.env` points at `127.0.0.1:6379`. Local Redis: `ECONNREFUSED`. No `REDIS_URL` for production. |
| Production BullMQ worker | **NO** | Cannot observe queues without Redis. |
| Production / Render application logs | **NO** | `render` CLI absent; no log API credentials in environment. |
| Application metrics | **NO** | Not configured in this workspace. |

Secrets were not dumped. Connection strings were classified only as present/local vs absent.

### Local infrastructure (not production)

| Probe | Result |
|-------|--------|
| PostgreSQL `localhost:5434` / `ecd` | Reachable; **empty** caregiver/sync tables |
| Redis `127.0.0.1:6379` | `ECONNREFUSED` |
| Local API `:3000` | Not running |

Local empty DB does **not** contradict field incident reports. It also cannot confirm which production failure path is live.

---

## Sync pipeline evidence

| Stage | Production evidence |
|-------|---------------------|
| Local persistence (IndexedDB) | **NOT TESTED live** — no approved caregiver session |
| Outbox | **NOT TESTED live** |
| Push (`POST /sync/push`) | **NOT TESTED live** — unauthenticated pull returns 401 only |
| Session | **UNAVAILABLE** — no production `sync_session` access |
| Queue (BullMQ) | **UNAVAILABLE** |
| Worker | **UNAVAILABLE** |
| Domain apply → PostgreSQL | **UNAVAILABLE** |
| Pull → other device | **NOT TESTED live** |

Code-level pipeline (from Sprints 5.6 / 5.7) remains the assumed architecture. This sprint did **not** re-prove it against production.

### Observability (code inspection only)

Backend structured events exist for correlation without payloads/PII:

- `sync.push.accepted` — sessionId, deviceId, userId, counts
- `sync.enqueue.failed` — sessionId, deviceId, userId
- `sync.apply` / `sync.apply.failed` / `sync.session.finished`
- `sync.recovery.*`

**Production logs were not readable** from this environment, so correlation could not be verified in the field. No logging rewrite was performed (default: no speculative changes).

---

## Production database forensics

**NOT EXECUTED** — production PostgreSQL unavailable.

### Local aggregates only (dev DB, empty)

| Table | Count |
|------:|------:|
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

`session_by_status`: `[]`  
`operation_by_status`: `[]`

No production stuck sessions, failed ops, device mismatches, or orphaned rows were observed — because production was not queried.

---

## Redis / BullMQ forensics

**NOT EXECUTED** — production Redis unavailable; local Redis down.

Queue was not modified. No jobs flushed. No lockDuration changes.

---

## Controlled test account

**None available.**

- No approved caregiver test username/password was provided in this sprint.
- Local seed admin credentials exist for **local** seeding only and were **not** used against production.
- Prior District/NCDA reports also note missing scoped test accounts for live verification.

Therefore Tests 1–6 (online, offline, dual-device, JWT, device identity, worker interruption) were **not run** against production.

---

## Controlled test results

| Test | Environment | Result | Evidence |
|------|-------------|----------------|----------|
| Online child | Production | **NOT RUN** | No approved test account; no prod DB to confirm `applied` |
| Online attendance | Production | **NOT RUN** | Same |
| Offline child | Production | **NOT RUN** | Same |
| Offline attendance | Production | **NOT RUN** | Same |
| Feeding | Production | **NOT RUN** | Same |
| Growth | Production | **NOT RUN** | Same |
| STED | Production | **NOT RUN** | Same |
| Referral | Production | **NOT RUN** | Same |
| Dual-device pull | Production | **NOT RUN** | Same |
| JWT expiry | Production | **NOT RUN** | Same |
| Device rebind | Production | **NOT RUN** | Same |
| Worker recovery | Production | **NOT TESTED — PRODUCTION SAFETY CONSTRAINT** | Redis/worker unobservable; intentional worker kill not authorized |
| Feeding reconciliation | Production | **NOT RUN** | Code/tests READY from 5.7; no live proof |
| Attendance reconciliation | Production | **NOT RUN** | Code/tests READY from 5.6; no live proof |
| Village dependency recovery | Production | **NOT RUN** | Code/tests READY from 5.7; no live proof |

### Unit / harness regression (not production)

| Suite | Result |
|-------|--------|
| Frontend: feeding / attendance / village-block / sync-reliability | **34/34 PASS** |
| Backend: `npm run test:sync` | **41/41 PASS** |

These confirm the **code** from Sprints 5.6–5.7 still passes. They do **not** prove production persistence.

---

## Data integrity findings

**No production anomalies observed** — because production data was not accessible.

No:

- duplicate production records documented
- orphaned production operations documented
- stuck production sessions documented
- missing domain rows documented
- cross-device inconsistencies documented in production

**UNKNOWN in production** remains the accurate statement for server-side integrity of the original incident.

Local empty DB: nothing to audit.

---

## Changes made

```text
Frontend: NO
Backend: NO
OpenAPI: NO
Prisma: NO
Sync architecture: NO
```

Default “no changes unless production-proven defect” was followed. Hard-stop prevented discovering a production-proven defect from infrastructure evidence.

---

## Remaining risks

### P0

1. **Production PostgreSQL still unverified** — cannot confirm `applied` ops or domain rows in the field.
2. **Production Redis/BullMQ still unverified** — cannot confirm worker consumption, stalls, or enqueue failures in the field.
3. **No controlled live caregiver sync** — original incident cannot be closed without an approved test account + authorized DB/Redis (or equivalent safe observability).

### P1

4. Live dual-device pull unproven in production.
5. Live offline → online recovery unproven in production.
6. Worker soak / interruption **NOT TESTED** (safety + access).

### P2

7. Production log access (Render) not wired into this workstation — correlation IDs exist in code but cannot be queried here.
8. Pre-existing `sted.service.spec.ts` harness failure (unrelated; not touched).

---

## Success criteria vs outcome

| Criterion | Met? |
|-----------|------|
| PostgreSQL reachable via authorized production tooling | **NO** |
| Redis/BullMQ verified or safely observed | **NO** |
| Worker execution verified | **NO** |
| Online caregiver save → applied | **NO** (not run) |
| Offline save → applied | **NO** (not run) |
| Server domain rows confirmed | **NO** |
| Cross-device pull confirmed | **NO** |
| JWT / device / attendance / feeding / village live | **NO** (code READY; production NOT RUN) |

Maximum allowed verdict under unavailable infrastructure: **READY WITH CONDITIONS**.

Incident status: **STILL OPEN** pending authorized production access + approved test account.

---

## Recommended next action (not started)

Provide **authorized** access only (do not bypass):

1. Production PostgreSQL read-only connection or approved aggregate query channel  
2. Production Redis / BullMQ metrics (or Render queue dashboard)  
3. Render log access for `sync.*` events  
4. One **approved caregiver test account** + dedicated test center/child policy  

Then re-run Sprint 5.8’s live matrix only — do not start NCDA/District feature work as a substitute.

---

SPRINT 5.8 STATUS

Verdict:
READY WITH CONDITIONS

Production API:
VERIFIED

Production PostgreSQL:
UNAVAILABLE

Production Redis:
UNAVAILABLE

Production BullMQ worker:
UNAVAILABLE

Online caregiver sync:
BLOCKED

Offline → online recovery:
BLOCKED

Cross-device pull:
BLOCKED

JWT expiry recovery:
PARTIAL

Device identity isolation:
PARTIAL

Attendance reconciliation:
PARTIAL

Feeding reconciliation:
PARTIAL

Village dependency recovery:
PARTIAL

Data integrity:
UNKNOWN

Production worker soak:
NOT TESTED

Backend changed:
NO

Frontend changed:
NO

OpenAPI changed:
NO

Prisma migration:
NO

Caregiver offline architecture changed:
NO

Tests:
34/34 frontend sync regression PASS; 41/41 backend sync PASS

Build:
PASS

Lint:
FAIL

Remaining P0:
Authorized production PostgreSQL + Redis/BullMQ confirmation; controlled live caregiver sync with an approved test account.

Remaining P1:
Live dual-device pull; live offline→online; safe worker observation/soak.

Remaining P2:
Production log access for sync correlation; pre-existing STED service-spec harness.

Recommended next sprint:
Sprint 5.8b / 5.9 — resume production forensics only after credentials/tooling and an approved caregiver test account are provided. Do not start NCDA feature sprints as a substitute. Not started.
