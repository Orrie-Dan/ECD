# Sprint 5.8A — Caregiver Online/Offline End-to-End Sync Validation

**Date:** 2026-08-12  
**Frontend:** `D:\Esri\ECD` (`VITE_API_MODE=live`)  
**Backend:** deployed Render API  
**Approved test account:** `test3` (caregiver) — password **not recorded** in this report  
**Code changed:** NO

---

## 1. Executive Verdict

**SYNC E2E PARTIALLY VERIFIED**

With the approved caregiver account, controlled tests against the **deployed LIVE API** proved that the async sync pipeline can:

```text
push → sync_session → worker → applied → domain row visible via REST
```

for **child, attendance, feeding, growth/nutrition (correct payload), and STED**.

It did **not** fully verify:

- caregiver **offline UI** durable save → reconnect (browser offline matrix incomplete)
- **cross-device pull** with a second browser profile
- **referral** apply (session remained `started` / op `pending` for minutes; recovery retry observed)
- consistent **UI local workspace** after login (dashboard sometimes showed 0 children while API listed 1)

Production confidence is therefore **MEDIUM**, not HIGH.

---

## 2. Environment

| Component | Status |
|-----------|--------|
| Frontend | Vite `http://localhost:5173` LIVE against Render |
| `VITE_API_MODE` | `live` |
| `VITE_API_BASE_URL` | deployed Render origin |
| Backend API | Up (`/docs` 200) |
| Auth | `POST /auth/login` as caregiver `test3` → **201** |
| Center | APPEK Kamuhoza (`centerId` present; `villageId` present) |
| Device register | `POST /devices/register` → **201** |
| Database / Redis | Not directly readable from workstation; inferred via session poll + REST |
| Worker | **Observed indirectly** — many sessions reached `completed`/`applied` within seconds; some sessions stalled |
| Browser | Cursor browser automation + API harness |

State definitions used:

| State | Meaning |
|-------|---------|
| Local persistence | IndexedDB / UI local row |
| Pending sync | outbox / session op not terminal |
| Server synchronized | session op status **`applied`** and/or REST list shows row |

---

## 3. Online Results

### API-controlled sync (primary production evidence)

| Domain | Push accepted | Session | Op status | Server evidence | Classification |
|--------|---------------|---------|-----------|-----------------|----------------|
| Child registration | yes | `completed` | **applied** | `GET /children` total=1, name `E2E TestChild` | **SERVER SYNCHRONIZED** |
| Attendance | yes | `completed` (initial) | **applied** | session applied | **SERVER SYNCHRONIZED** |
| Feeding day | yes | `completed` | **applied** | session applied | **SERVER SYNCHRONIZED** |
| Growth/Nutrition | yes (with `nutritionStatus`) | `completed` | **applied** | session applied | **SERVER SYNCHRONIZED** |
| Growth/Nutrition (missing `nutritionStatus`) | yes | `failed` | **failed** | Prisma: `nutritionStatus` required | **FAIL (payload)** |
| STED | yes | `completed` | **applied** | session applied (repeated) | **SERVER SYNCHRONIZED** |
| Referral (`sourceType: manual`) | yes | `failed` | **failed** | `referral requires sourceType of nutrition or sted` | **FAIL (contract)** |
| Referral (`sourceType: sted` + sourceId) | yes | stayed `started` | stayed **pending** (>2 min; `retryCount` became 1) | `GET /referrals` total=0 | **PENDING / STUCK** |

Approximate apply latency when healthy: **~1–5 seconds** from push to session `completed`.

### Browser UI (online)

| Check | Result |
|-------|--------|
| Login as caregiver | **PASS** — reached `/caretaker` |
| Center shown | APPEK Kamuhoza |
| Sync indicator after login (first load) | **PARTIAL** — showed **“Guhuza bisaba kwinjira”** (`AUTH_REQUIRED`) while tokens existed but **no** `ecd_device_id` / device UUID |
| Device register from page context | **PASS** (manual fetch 201) |
| Sync indicator after device present | **PASS/PARTIAL** — “Byahujwe na seriveri” but “Ntabwo byarahujwe” (never lastSyncedAt) |
| Children visible in UI | **PARTIAL** — after reload dashboard showed **0** children while API still had **1** |

---

## 4. Offline Results

**NOT FULLY TESTED in UI**

Reasons:

- After login/reload the local caregiver list showed **0 children**, so attendance/offline flows depending on local child rows could not be exercised honestly.
- IndexedDB inspection earlier saw a legacy `ecd-offline` DB with some pulled rows and **device count 0**; user-scoped `ecd-offline-u-{userId}` was not observed in that check.
- No complete offline create → refresh → reopen cycle was completed in the browser under network-offline emulation.

Automated unit coverage for offline local save still exists from prior sprints; that is **not** counted as this E2E PASS.

---

## 5. Offline → Online Results

**NOT TESTED (UI)** — blocked by incomplete offline UI run.

API reconnect path is implied by successful online push when network is available; that is not a substitute for offline IndexedDB → heartbeat → applied.

---

## 6. Cross-Device Results

**NOT TESTED**

Only one browser profile / caregiver identity was used. Pull pagination showed `hasMore: true` with a large older cursor stream (many pages still on `2026-08-05`), so even Device B pull may be **slow** before new records appear — operational limitation, not proven FAIL.

---

## 7. Failure-Recovery Results

| Test | Result | Evidence |
|------|--------|----------|
| A Network drop during save | **NOT TESTED** | — |
| B Network drop during sync | **NOT TESTED** | — |
| C JWT expiry | **NOT TESTED** | — |
| D Worker unavailable (intentional) | **NOT TESTED** (would not kill production worker) | — |
| Worker lag / stuck session (observed) | **PARTIAL FAIL observed** | Referral session `5ef74eab-…` remained `started` with op `pending`; later `retryCount=1` still not applied; referrals list empty |
| Attendance natural-key second UUID | **INCONCLUSIVE in window** | Follow-up attendance sessions remained `started`/`pending` during 60s polls; earlier attendance session later showed `completed`/`applied` |
| Nutrition missing required field | **FAIL confirmed** | Terminal failed op with clear Prisma reason |
| Referral wrong sourceType | **FAIL confirmed** | Terminal failed op |

---

## 8. Domain Matrix

Live E2E against deployed API + caregiver UI where noted.

| Domain | Online | Offline Local Save | Survives Refresh | Outbox | Offline→Online | Server Applied | Cross-Device | Limitations |
|---|---|---|---|---|---|---|---|---|
| Child registration | **PASS** (API+session+REST) | NOT TESTED | NOT TESTED | NOT TESTED (UI) | NOT TESTED | **PASS** | NOT TESTED | UI list sometimes empty after reload |
| Attendance | **PASS** (API applied) | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | **PASS** | NOT TESTED | Later natural-key replay sessions lagged/stuck in window |
| Feeding | **PASS** (API applied) | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | **PASS** | NOT TESTED | REST list path used for verify differed; apply proven via session |
| Growth/Nutrition | **PARTIAL** | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | **PASS** when `nutritionStatus` set | NOT TESTED | Missing `nutritionStatus` → permanent failed |
| STED | **PASS** | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | **PASS** | NOT TESTED | — |
| Referrals | **FAIL / PARTIAL** | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | **FAIL** (not applied) | NOT TESTED | `manual` rejected; `sted` source stayed pending |

---

## 9. Known Limitations

### Architectural

- Sync is async; UI “saved” / “synced” labels must not be trusted without `applied`.
- Offline work requires prior online auth + device registration.
- Referral create requires `sourceType` `nutrition` or `sted` (not free-form manual) on this deployment.

### Infrastructure

- Worker is usually fast but **not always**: referral (and some attendance retries) remained pending for minutes with recovery retry.
- Pull may traverse a large historical keyset before recent caregiver rows appear (`hasMore` true for many pages).
- Production Postgres/Redis still not directly inspectable from this workstation.

### Browser / device

- First UI session hit **AUTH_REQUIRED** with tokens present but **no device identity** in localStorage.
- Device must be registered before push; UI can look authenticated while sync is blocked.
- Local workspace / pull hydration into caregiver UI was inconsistent (API child exists; UI count 0).

### Authentication

- Display name for `test3` surfaced as `umurezi1` in UI storage mapping — cosmetic only.

---

## 10. Production Confidence

**MEDIUM**

Why not HIGH:

- Offline UI, refresh durability, JWT, and dual-device pull were not completed.
- Referral apply stuck in production.
- UI sync/device/workspace path showed real friction after login.

Why not LOW:

- Multiple domains reached definitive **`applied`** on the deployed worker and appeared on the server for child.

---

## 11. Bugs Found

### Bug 1 — Nutrition sync fails without `nutritionStatus`

- **Reproduction:** push `child_nutrition_screening` create without `nutritionStatus`
- **Expected:** applied or retryable validation
- **Actual:** session `failed`; Prisma argument `nutritionStatus` missing
- **Severity:** P1 (data cannot sync if client omits field)
- **Evidence:** session op `conflictReason` Prisma error
- **Likely layer:** client payload / apply mapping mismatch vs deployed schema

### Bug 2 — Referral with valid `sted` source stays pending

- **Reproduction:** create STED (applied), then referral `sourceType=sted` + `sourceId`
- **Expected:** session completes, op `applied`, referral list non-zero
- **Actual:** session remains `started`, op `pending` for >2 minutes; `retryCount` increments; referrals total 0
- **Severity:** P0 for referrals domain
- **Evidence:** session id `5ef74eab-…`; REST referrals empty
- **Likely layer:** worker apply for referral / queue stall / dependency check

### Bug 3 — UI sync AUTH_REQUIRED without device after login

- **Reproduction:** login caregiver in LIVE UI before device keys exist
- **Expected:** auto device register then sync eligible
- **Actual:** indicator “Guhuza bisaba kwinjira”; no `ecd_device_id`
- **Severity:** P1 (blocks UI sync until device present)
- **Evidence:** localStorage tokens present; device keys absent; sync copy AUTH_REQUIRED
- **Likely layer:** OfflineRuntimeProvider / ensureDeviceRegistered timing

### Bug 4 — UI children count 0 while server has child

- **Reproduction:** after login/reload, dashboard/abana shows 0; API `/children` returns 1
- **Expected:** local list reflects center children after pull/bootstrap
- **Actual:** empty UI counts
- **Severity:** P1 (caregiver cannot operate on existing child in UI)
- **Evidence:** API total=1 vs UI 0
- **Likely layer:** local workspace activation / pull bootstrap

---

## 12. Recommended Next Action

**A targeted implementation sprint is justified**, but only for evidenced defects — not a sync rewrite:

1. **P0:** Diagnose stuck referral apply (session `started`/op `pending`) on production worker.  
2. **P1:** Ensure LIVE UI always registers device after login; clear AUTH_REQUIRED when tokens+device OK.  
3. **P1:** Fix caregiver local bootstrap so server children appear in UI after login/pull.  
4. **P1:** Confirm nutrition client payloads always include `nutritionStatus` (frontend mapper already has it — verify live path).  
5. Re-run **offline UI + dual-device** matrix after the above.

Do **not** start NCDA/District feature work as a substitute.

---

## Production vs local summary

| Layer | Result |
|-------|--------|
| Verified against deployed API (auth + sync push/session/applied + REST) | **YES** for child/attendance/feeding/nutrition/STED |
| Verified end-to-end including Redis inspection | **NO** (indirect via sessions only) |
| Verified offline IndexedDB → reconnect → applied in UI | **NO** |
| Verified cross-device pull | **NO** |

---

## Final verification matrix (summary)

| Domain | Online applied | Offline UI | Cross-device |
|--------|----------------|------------|-------------|
| Child | PASS | NOT TESTED | NOT TESTED |
| Attendance | PASS | NOT TESTED | NOT TESTED |
| Feeding | PASS | NOT TESTED | NOT TESTED |
| Growth/Nutrition | PASS (payload-conditioned) | NOT TESTED | NOT TESTED |
| STED | PASS | NOT TESTED | NOT TESTED |
| Referrals | FAIL (stuck pending) | NOT TESTED | NOT TESTED |

**Verdict: `SYNC E2E PARTIALLY VERIFIED`**
