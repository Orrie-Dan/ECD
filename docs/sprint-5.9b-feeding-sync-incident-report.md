# Sprint 5.9B — Production Feeding Sync Incident Forensics & Targeted Fix

**Date:** 2026-08-12  
**Frontend:** `D:\Esri\ECD` (`VITE_API_MODE=live`)  
**Backend:** `D:\Esri\ECD Backend` → deployed Render `https://ecd-backend-bda8.onrender.com`  
**Approved test account:** `test3` (display name `umurezi1`) — password **not recorded**  
**Code changed:** **YES** (targeted feeding apply + FE enqueue guard)  
**Correlation tags:** `S59B-msq7wqk8` (forensics), `S59Bfix-msq86n54` (post-fix LIVE)

---

## 1. Executive Verdict

**FEEDING SYNC FIXED WITH CONDITIONS**

The production feeding P0 (`session=started` / `operation=pending`) is **identified, fixed, deployed, and LIVE-verified**.

Correct and previously-broken payload shapes now complete:

```text
push → session started → worker apply → operation applied → session completed → REST visible
```

Missing-recorder payloads now **terminal `failed`** (no infinite pending).

Conditions: historical pre-fix stuck sessions were not bulk-repaired; full offline browser reconnect walk was not re-executed (local offline unit coverage + LIVE FE-shaped push proven); Postgres/Redis were not directly inspectable.

---

## 2. Incident Reproduction

| Field | Value |
|-------|--------|
| Date | 2026-08-12 |
| Account | `test3` / user `bb110719…` |
| Center | APPEK Kamuhoza (`98b05988…`) |
| Device | `fe68d890…` (forensics) |

### Pre-fix forensics (`S59B-msq7wqk8`)

| Case | Payload | Session | Op | Elapsed | Notes |
|------|---------|---------|-----|---------|-------|
| Attendance control | known-good | **completed** | **applied** | 321 ms | Worker healthy |
| **A** date-only (5.9A shape) | `date` + `recordedById`, no `recordedDate` | **started** | **pending** | >45 s | **P0 reproduced** |
| **B** `recordedDate` | canonical | **completed** | **applied** | 307 ms | Healthy path works |
| **C** FE shape | `recordedDate`+`date`+recorder | **completed** | **applied** | 298 ms | UI mapper path OK |
| **D** no recorder | `recordedDate` only | **started** | **pending** | >45 s | Second stall mode |
| **E** multi-date FE | FE shape | **completed** | **applied** | 327 ms | Not date-specific |

Example stuck op (Case A):

```text
sessionId: 17e097bf-24fa-4f8b-9062-aa110a755e28
operationId: 335e8884-98cd-4f0a-a4d9-ccef6655d185
clientOperationId: 79b44b1e-6d71-415c-8c62-94aa5b897f1f
retryCount: 0
conflictReason: null
lifecycle: push 201 → started/pending → never completed
```

Evidence file: `.smoke-tmp/sprint59b-feeding-forensics.json`

---

## 3. Root Cause

**Exact first failing layer: F. Feeding apply service** (with a create-dispatch try/catch defect that prevented terminal classification).

### First divergence vs attendance

| Layer | Attendance | Feeding (before) |
|-------|------------|------------------|
| Date field | `attendanceDate ?? date` | **`recordedDate` only** — no `date` alias |
| Missing date | terminal failed return | `new Date(String(undefined))` → Invalid Date → Prisma throw |
| Missing recorder | N/A / guarded elsewhere | `String(recordedById ?? recordedBy)` → `"undefined"` → **P2003** |
| Create dispatch | returns status objects; rarely throws | throws from Prisma/validation |
| `applyCreate` catch | `await createRecord(...)` is caught | **`return this.applyFeedingDayCreate(...)` without `await`** |

### What actually happened on LIVE

1. Sprint 5.9A / Case A sent `date` without `recordedDate` (harness/contract mismatch vs attendance).
2. `applyFeedingDayCreate` did `new Date(String(undefined))` → Invalid Date, then Prisma threw.
3. Separately, missing recorder coerced to `"undefined"` → FK **P2003**.
4. Because `applyCreate` used **bare `return this.applyFeedingDayCreate(...)`** (no `await`), the rejecting promise **escaped the try/catch**.
5. The processor transaction aborted without writing `conflictReason` / terminal status.
6. BullMQ retried; operation stayed **`pending`**, session stayed **`started`**, `retryCount` often still `0` during the observation window, `conflictReason` stayed **null**.

This is **not** a BullMQ outage: attendance/nutrition/FE-shaped feeding applied in ~300 ms on the same worker while bad feeding ops stayed stuck.

Classification: **F (Feeding apply)** primary; retry classification defect secondary (uncaught reject never reached `isRetryableApplyError` / terminal failed path).

---

## 4. Before / After

```text
BEFORE (date-only or missing recorder)
feeding push 201 → session started → op pending → stuck (>45–90s)
conflictReason null · retryCount 0

AFTER (deployed 8c02de4)
date-only (5.9A shape) → applied · session completed · ~291 ms
FE shape → applied · session completed · ~312 ms
missing recorder → failed · session failed · explicit message · ~272 ms
REST GET /centers/:id/feeding → visible dates 2026-07-28/27/25
```

---

## 5. Fix

### Backend (`ECD Backend` commit `8c02de4` on `main`, deployed)

| File | Change |
|------|--------|
| `src/modules/sync/sync-apply.service.ts` | `return await` specialized creates so errors hit catch; feeding day validates date/recorder before Prisma; verify recorder user exists |
| `src/modules/feeding/mappers/feeding.mapper.ts` | `resolveFeedingRecordedDateFromPayload` (`recordedDate ?? date`); `resolveFeedingRecordedByIdFromPayload` (no `"undefined"` sentinel) |
| `src/modules/sync/__tests__/sync-apply-feeding.spec.ts` | date alias, missing date terminal, missing recorder terminal |
| `src/modules/feeding/__tests__/feeding.mapper.spec.ts` | resolver unit coverage |

### Frontend (`ECD`)

| File | Change |
|------|--------|
| `src/sync/feeding-sync-mapper.ts` | refuse enqueue if `date` or `recordedById` empty (guard; FE already sent both when valid) |

**Not changed:** BullMQ, Redis, IndexedDB, sync architecture, unrelated domains.

---

## 6. LIVE Evidence (post-fix `S59Bfix-msq86n54`)

| Case | Session | Op | ms | Evidence |
|------|---------|-----|-----|----------|
| Deploy probe (`date` only) | completed | applied | 270 | fix live |
| A date-only | completed | applied | 291 | session `b3b93599-…` |
| B FE shape | completed | applied | 312 | session `d081cf1d-…` |
| C no recorder | **failed** | **failed** | 272 | `center_feeding_day requires recordedById (or recordedBy)` |
| D multi-date | completed | applied | 275 | session `fabf3e40-…` |
| Attendance regression | completed | applied | 305 | PASS |
| Nutrition regression | completed | applied | 304 | PASS |
| REST feeding list | 200 | — | — | 3 target dates visible |

Evidence file: `.smoke-tmp/sprint59b-postfix-verify.json`

Referral LIVE push also **applied** (~306 ms) in a follow-up regression probe.

---

## 7. Offline Regression

| Check | Result |
|-------|--------|
| Local save (unit: feeding-sync) | **PASS** — 12/12 vitest |
| Outbox payload includes `recordedDate` + `recordedById` | **PASS** (mapper + guard) |
| Refresh persistence | **PASS** (existing unit coverage) |
| Reconnect → server applied | **PASS** via LIVE FE-shaped push (same payload offline reconnect sends) |
| Full browser offline UI walk | **NOT RE-EXECUTED** this sprint |

---

## 8. Regression Matrix

| Domain | Online | Offline | Applied | REST Visible |
|--------|--------|---------|---------|--------------|
| Child | PASS (5.9A LIVE; this sprint harness used incomplete child payload → expected fail) | NOT TESTED | PASS (prior) | PASS (prior) |
| Attendance | **PASS** | NOT TESTED | **PASS** | NOT TESTED |
| Feeding | **PASS** | PARTIAL (unit + contract) | **PASS** | **PASS** |
| Nutrition | **PASS** | NOT TESTED | **PASS** | NOT TESTED |
| STED | PASS (5.9A); this sprint ageBand harness typo → expected fail | NOT TESTED | PASS (prior) | NOT TESTED |
| Referral | **PASS** | NOT TESTED | **PASS** | NOT TESTED |

---

## 9. Production Confidence

**HIGH** for feeding online apply / session completion / REST visibility after deploy.

**MEDIUM** overall caregiver sync (offline UI reconnect not browser-revalidated this sprint; historical stuck sessions may linger until recovery windows).

Why HIGH for the P0: differential forensics, exact code defect, unit proof of await/catch + aliases, deploy probe, and multi-date LIVE applied + terminal fail for bad recorder.

---

## 10. Remaining Conditions

### P0

None for feeding started/pending on current deploy (for correct or date-aliased payloads; missing recorder is terminal failed).

### P1

- Historical pre-fix stuck feeding sessions may remain `started`/`pending` until recovery/park — not auto-healed by this fix.
- Offline child village block (`District not found: Gasabo`) from 5.9A — unchanged, out of scope.
- Full offline browser feeding reconnect walk not re-run.

### P2

- Direct Postgres/Redis forensics still unavailable from workstation.
- Cross-device pull / JWT expiry still not in scope.
- Child/STED harness payload completeness in ad-hoc scripts (not product bugs).

---

## Tests Run

| Suite | Result |
|-------|--------|
| Backend `sync-apply-feeding.spec.ts` | **PASS** (6 assertions) |
| Backend `feeding.mapper.spec.ts` | **PASS** (10) |
| Backend `feeding.sync.spec.ts` | **PASS** (3) |
| Backend `sync-apply-attendance.spec.ts` | **PASS** |
| Frontend feeding/attendance/nutrition/referral/sted sync vitest | **60 passed** |
| LIVE feeding forensics + post-fix verify | **PASS** |

Pre-existing repo lint debt: not treated as sprint failure.

---

```text
SPRINT 5.9B STATUS

Verdict:
FEEDING SYNC FIXED WITH CONDITIONS

Root cause:
applyFeedingDayCreate only read payload.recordedDate (no date alias) and coerced missing recordedById to "undefined"; Prisma/validation rejections escaped applyCreate's try/catch because specialized creates were returned without await, so the processor left ops pending with null conflictReason and sessions started.

First failing layer:
F. Feeding apply service (uncaught reject from create dispatch + missing date/recorder contract)

Feeding online:
PASS

Feeding offline:
PARTIAL

Server applied:
PASS

Session completion:
PASS

REST visibility:
PASS

Worker verification:
PASS

Regression:
PASS

Code changed:
YES

Production confidence:
HIGH

Remaining P0:
none (feeding started/pending on current deploy)

Remaining P1:
historical stuck pre-fix feeding sessions; offline child village block (5.9A); full offline browser feeding reconnect walk not re-run

Remaining P2:
no direct Postgres/Redis access; cross-device pull / JWT expiry still out of scope

Recommended next step:
Optionally park/recover historical stuck feeding sessions; run a short caregiver UI offline feeding reconnect walk; do not start Sprint 5.9C automatically.

STOP.
```
