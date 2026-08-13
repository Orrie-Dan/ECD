# Sprint 5.9A — Caregiver Sync LIVE Regression & Offline E2E Gate

**Date:** 2026-08-12  
**Frontend:** `D:\Esri\ECD` (`VITE_API_MODE=live`)  
**Backend:** deployed Render API `https://ecd-backend-bda8.onrender.com`  
**Approved test account:** `test3` (display name `umurezi1`) — password **not recorded**  
**Code changed:** **NO**  
**Tag / correlation prefix:** `S59A-msq74in5`

This sprint is a **validation gate only**. No sync redesign. No production code changes.

---

## 1. Executive Verdict

**SYNC E2E VERIFIED WITH CONDITIONS**

The caregiver pipeline is **proven LIVE** for the critical path:

```text
auth → device register → local/outbox (where exercised) → sync push
  → worker apply → operation applied → session completed → REST visibility
```

for **child, attendance, nutrition (valid), STED, and referral (correct + alias + missing-recorder terminal fail)**.

It is **not** fully green:

| Gap | Severity |
|-----|----------|
| **Feeding** online sync sessions remain `started` / op `pending` (reproduced across dates) | **P0** |
| Offline-created child persists locally but stays **blocked** (`homeVillageId` / `District not found: Gasabo`) so it does **not** reach server `applied` | **P1** |
| Offline UI list did not show the dirty local child until reconnect (IDB had 3; UI showed 2/2 while offline) | **P1** |
| Second caregiver / true dual-device pull | **NOT TESTED** (no second approved account) |
| JWT expiry recovery | **NOT TESTED** |
| Offline UI creates for feeding / nutrition / STED / referral | **NOT TESTED** |

Production confidence: **MEDIUM–HIGH** for non-feeding domains; **LOW** for feeding until the stuck-session path is fixed.

---

## 2. Environment / Configuration

| Check | Result |
|-------|--------|
| `VITE_API_MODE` | `live` (`.env`) |
| `VITE_API_BASE_URL` | `https://ecd-backend-bda8.onrender.com` (non-localhost) |
| Mock mode | Disabled |
| Vite caregiver UI | `http://localhost:5173` running |
| LocalStore / sync engine | Enabled in app (user DB `ecd-offline-u-bb110719-…`) |
| `GET /docs` | **200** |
| `GET /api/v1/sync/pull` unauthenticated | **401** |
| `POST /api/v1/auth/login` (`test3`) | **201** |
| Role | `caregiver` |
| Center | APPEK Kamuhoza (`centerId` prefix `98b05988`) |
| `POST /api/v1/devices/register` | **201** |
| Worker (indirect) | **YES** for child/attendance/nutrition/STED/referral (~270–350 ms to `completed`/`applied`) |
| Postgres / Redis direct access | **Unavailable** from workstation (same as 5.7–5.8) |

Worker health is inferred only from session → `applied` transitions. Feeding sessions that never leave `started` prove the worker/apply path is **not** universally healthy.

---

## 3. Test Account / Device (no passwords)

| Field | Value |
|-------|--------|
| Username | `test3` |
| Display | `umurezi1` |
| User id prefix | `bb110719` |
| Harness device id prefix (online) | `53386c29` |
| Browser device id prefix (UI) | `5c58f950` |
| Children on server before online child write | **1** |
| Children on server after online child write | **2** |

---

## 4. Online E2E Results

Harness: `.smoke-tmp/sprint59a-live-e2e-gate.mjs` → `.smoke-tmp/sprint59a-results.json`

| Domain | Push | Session | Op | ms | REST / notes |
|--------|------|---------|-----|-----|--------------|
| Child | 201 | **completed** | **applied** | 305 | REST visible; total **2**; id `d544a510-…` |
| Attendance | 201 | **completed** | **applied** | 269 | session applied; entity `e433c143-…` |
| Feeding | 201 | **started** | **pending** | >90s | **FAIL** — still stuck on recheck; retries 2026-08-12/11/10 also stuck |
| Nutrition (valid) | 201 | **completed** | **applied** | 300 | REST screenings visible |
| Nutrition (no status) | 201 | **failed** | **failed** | 301 | Prisma required field — **terminal** |
| STED | 201 | **completed** | **applied** | 345 | — |
| Referral A (`recordedById`) | 201 | **completed** | **applied** | 287 | REST match; referrals total **3** |
| Referral B (`referredById` only) | 201 | **completed** | **applied** | 296 | Alias fix **deployed** |
| Referral C (missing recorder) | 201 | **failed** | **failed** | 300 | `referral requires recordedById (or recordedBy / referredById)` — **not** infinite retry |

### Feeding P0 detail

- Session `9439395f-…` (first): `started` / `pending`, `retryCount=0`, no `conflictReason` after >90s and later recheck.  
- Retries sessions `404ac4cc-…`, `4ebc552f-…`, `418aff69-…` (dates 12/11/10): all same stall (~46s poll windows).  
- Other domains continued to apply while feeding stayed stuck → layer likely **BullMQ/Worker or Feeding Apply Service** (session accepted, apply never completes), not a total API outage.

---

## 5. Offline E2E Results

**Method:** CDP `Network.setBlockedURLs` for production API host + `window` `offline` event. Full `Network.emulateNetworkConditions(offline=true)` broke SPA document navigation to localhost in this harness; soft in-app routing was used after initial load.

| Check | Result |
|-------|--------|
| Pre-offline sync healthy | **PASS** — “Byahujwe na seriveri”, device present, UI children **2** matching API |
| Offline indicator | **PASS** — “Nta murongo” |
| Offline child registration UI | **PASS** (local) — `S59A OfflineChild msq74in5` in IndexedDB `_localStatus=dirty` |
| Outbox for offline child | **PASS** — op **blocked**: `homeVillageId required before sync: District not found: Gasabo` |
| Server applied for offline child | **NOT YET** (correct while blocked) — API total remained **2** |
| Offline attendance update | **PASS** (local) — notes `S59A-msq74in5-att`, outbox **pending** while offline |
| Offline feeding / nutrition / STED / referral UI | **NOT TESTED** |
| Toast / copy does not claim server save while offline | **PASS** — offline banner; pending count shown |

---

## 6. Offline Refresh / Restart

| Check | Result |
|-------|--------|
| Reload while API blocked | App surfaced **Network Error** on role landing briefly (expected with blocked API) |
| Offline child still in IDB after reload | **PASS** — still dirty, village null |
| Child outbox still blocked | **PASS** |
| Attendance outbox after reload | Observed as **applied** after network restored on subsequent hydrate (see §7) |
| Close/reopen app binary | **NOT TESTED** (browser reload only) |

**No P0 data-loss** of the offline child row or blocked outbox on refresh.

---

## 7. Reconnect Results

After clearing URL blocks / restoring network:

| Check | Result |
|-------|--------|
| Session restored as `umurezi1` | **PASS** |
| UI children count | **3** (offline child now visible) |
| Attendance UI | Abaje **1** / Abataje **1** (offline absent change reflected) |
| Sync indicator | “Birakeneye kwitabwaho” / “Impinduka 1 zitegereje” (blocked child) |
| Attendance outbox | **applied**, row `clean` with notes `S59A-msq74in5-att` |
| Offline child outbox | Remains **blocked** (village) — no false server success |
| Time to recovery | Attendance reached applied on reconnect hydrate; blocked child correctly not marked synced |

---

## 8. Cross-Device Results

| Check | Result |
|-------|--------|
| Second approved caregiver account | **NOT AVAILABLE** → **BLOCKED** |
| Same-user second device register | **PASS** (new device id) |
| Pull first page sees new child | **FAIL/PARTIAL** — `hasMore: true`; recent child not on first page (historical cursor stream) |
| Dirty-sibling cross-device contract | **NOT TESTED** |

---

## 9. Referral Regression

| Case | Expected | Observed |
|------|----------|----------|
| A — FE `recordedById` | applied + REST | **PASS** — session `a2d0da06-…`, op applied ~287 ms, REST visible |
| B — legacy `referredById` | applied (alias) or terminal | **PASS** — applied ~296 ms (backend deploy of 5.9 alias confirmed LIVE) |
| C — missing recorder | terminal failed, no infinite retry | **PASS** — failed with explicit recorder message; `stalledAtStarted=false` |

---

## 10. Nutrition Validation

| Case | Result |
|------|--------|
| Valid + `nutritionStatus` | **PASS** — applied ~300 ms; REST visible |
| Missing `nutritionStatus` | **PASS** (expected fail) — session/op **failed**, not infinite retry |
| UI explanation for invalid enqueue | FE guard exists in code (Sprint 5.9); **LIVE UI toast walk** for invalid form **NOT re-tested** this gate |

---

## 11. Device Identity Regression

| Check | Result |
|-------|--------|
| Logout clears `ecd_device_id` / `ecd_device_uuid` / tokens | **PASS** — before `5c58f950-…` → after `null` |
| Logout warns about unsynced work | **PASS** — dialog offers sync / keep on device / discard |
| Caregiver A → B identity isolation LIVE | **BLOCKED** — no second approved caregiver |

---

## 12. JWT Expiry

**NOT TESTED** — no safe expiry simulation performed this sprint.

---

## 13. Failure Injection

| Test | Result |
|------|--------|
| API unreachable while app loaded (blocked host) | **PASS** — local writes + pending/blocked outbox; UI “Nta murongo” |
| Full browser offline (CDP offline=true) | **PARTIAL** — breaks localhost navigation in this harness |
| Network drop mid-push / mid-poll (timed) | **NOT TESTED** |
| False `lastSyncedAt` / applied without server | **No evidence** for child blocked path; attendance applied only after reconnect when API reachable again |

---

## 14. Domain Verification Matrix

| Domain     | Online Save | Local Offline Save | Survives Refresh | Outbox | Reconnect | Server Applied | REST Visible | Cross-Device |
| ---------- | ----------- | ------------------ | ---------------- | ------ | --------- | -------------- | ------------ | ------------ |
| Child      | PASS        | PASS               | PASS             | PASS (blocked village) | PARTIAL (local OK; not applied) | PASS (online child) / FAIL (offline child blocked) | PASS (online) | BLOCKED |
| Attendance | PASS        | PASS               | PASS             | PASS   | PASS      | PASS           | PARTIAL (session applied; REST list path awkward) | BLOCKED |
| Feeding    | FAIL        | NOT TESTED         | NOT TESTED       | NOT TESTED | NOT TESTED | FAIL        | FAIL         | BLOCKED |
| Nutrition  | PASS        | NOT TESTED         | NOT TESTED       | NOT TESTED | NOT TESTED | PASS (valid) / PASS terminal fail (invalid) | PASS | BLOCKED |
| STED       | PASS        | NOT TESTED         | NOT TESTED       | NOT TESTED | NOT TESTED | PASS           | PARTIAL (session) | BLOCKED |
| Referral   | PASS        | NOT TESTED         | NOT TESTED       | NOT TESTED | NOT TESTED | PASS (A/B) / PASS fail (C) | PASS (A) | BLOCKED |

---

## 15. Evidence / Correlation IDs

### Online (harness tag `S59A-msq74in5`)

| Item | ID |
|------|-----|
| Child entity | `d544a510-b622-4339-b280-b3f275161e12` |
| Child session | `a4c954f5-5020-418a-81ca-59f212ad321a` |
| Child clientOperationId | `a62408a7-e5de-4934-85dd-9c66d54f87b5` |
| Attendance entity | `e433c143-a333-4786-80cd-44d112d9cb65` |
| Attendance session | `3c07a261-5bb2-45d4-936c-d8b124f19f9b` |
| Feeding stuck session | `9439395f-fdc9-4b4c-a878-7e897acc7386` |
| Nutrition valid entity | `28c517f1-1d42-405c-885f-fa5477b661ba` |
| STED entity | `148dac24-6053-49a3-aeb1-475a13bf2ee8` |
| Referral A entity | `00bb5129-cf4f-4e5d-b03b-8b771cf9e762` |
| Referral B session | `c084a56a-489a-46e0-8976-19028b473e9a` |
| Referral C conflict | `referral requires recordedById (or recordedBy / referredById)` |

### Offline / UI

| Item | ID / observation |
|------|------------------|
| Offline child | `84e2081e-0945-4733-bb8e-b7fae613f719` |
| Offline child outbox | blocked — `District not found: Gasabo` |
| Attendance clientOperationId | `1deba19b-3037-424f-9cad-4f84c16d296f` → applied after reconnect |
| Browser device (before logout) | `5c58f950-425e-448e-8977-61ffcae35dbc` |

---

## 16. Failures and Severity

### P0 — Feeding sync never leaves `started`

- **Reproduction:** push `center_feeding_day` create for multiple dates via LIVE harness.  
- **Observed:** session `started`, op `pending`, empty conflict, no completion within 45–90s; original session still stuck on recheck.  
- **Expected:** `applied` or terminal `failed` with reason.  
- **Likely layer:** BullMQ/Worker / Apply Service (feeding)  
- **Action:** inspect production worker logs + Redis job for feeding sessions; do **not** redesign client sync in response without that evidence.

### P1 — Offline child village resolution blocks sync

- **Reproduction:** register child offline via UI with static geo selection.  
- **Observed:** local dirty row + blocked outbox `District not found: Gasabo`; never reaches server (API total stays 2).  
- **Expected:** either resolve village offline from cache, or clear UX that registration cannot sync until online village resolve.  
- **Likely layer:** Frontend village resolve / reference data  

### P1 — Offline UI list omitted dirty local child

- **Observed:** IDB children=3 including OfflineChild; UI “2 / 2 abana” while still offline. After reconnect UI showed 3.  
- **Likely layer:** React Query / UI convergence  

### P2 — Pull pagination latency for recent rows

- First pull page did not include newly applied child; `hasMore: true` with old cursors (known from 5.8A).

---

## 17. Production Confidence

**MEDIUM–HIGH** for caregiver online sync of child / attendance / nutrition / STED / referral.  
**LOW** for feeding until stuck sessions are explained.  
**MEDIUM** for offline durability (local save + refresh survival proven; full multi-domain offline matrix incomplete).

---

## 18. Remaining Conditions

1. Feeding apply/worker stall on production must be diagnosed with Redis/worker logs.  
2. Offline village resolution (or explicit blocked UX) before claiming offline child → server E2E.  
3. Second approved caregiver for true cross-device pull.  
4. JWT expiry recovery still unverified.  
5. Offline UI coverage for feeding / nutrition / STED / referral still open.

---

## 19. Recommended Next Action

**Smallest next step (not a redesign):** production worker/Redis forensics on feeding sessions `9439395f-…` / `404ac4cc-…` only — confirm whether jobs are missing, stalled, or hung inside feeding apply. Optionally fix offline village resolve cache/lookup so blocked offline children can unblock after reconnect without manual intervention.

Do **not** start Sprint 5.10 sync architecture work from this gate alone.

---

```text
SPRINT 5.9A STATUS

Verdict:
SYNC E2E VERIFIED WITH CONDITIONS

Online sync:
PARTIAL

Offline local persistence:
PARTIAL

Offline refresh/reopen:
PASS

Offline → online recovery:
PARTIAL

Server applied verification:
PARTIAL

Cross-device pull:
BLOCKED

Referral regression:
PASS

Nutrition validation:
PASS

Device identity:
PARTIAL

JWT recovery:
NOT TESTED

Data-loss risk:
MEDIUM

Code changed:
NO

Remaining P0:
[Feeding LIVE sync sessions stuck at started/pending with no conflictReason]

Remaining P1:
[Offline child village resolve blocks sync (District not found: Gasabo); offline UI list omitted dirty local child until reconnect]

Remaining P2:
[Pull pagination may delay visibility of recent rows on first page; JWT recovery untested; second caregiver cross-device untested]

Recommended next step:
[Inspect production BullMQ/worker/logs for stuck center_feeding_day sessions; then address offline village resolve — no sync redesign]

STOP.
```
