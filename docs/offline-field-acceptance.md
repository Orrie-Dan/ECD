# Offline Field Acceptance Tests (Sprint 4.9)

Executable on a real tablet/laptop by a developer, QA, field officer, or trained caretaker.

Use a **LIVE** build (staging preferred). For each row record **PASS / FAIL / BLOCKED / NOT TESTED** plus Observed / Notes.

**Related:** `docs/offline-pilot-readiness.md`, `docs/offline-operations.md`  
**Automated companion:** `src/sync/field-readiness.test.ts` (scenarios A–H)

---

## Status legend

| Result | Meaning |
|--------|---------|
| **PASS** | Observed matches Expected |
| **FAIL** | Observed does not match; record issue |
| **BLOCKED** | Could not run (environment / account / device) |
| **NOT TESTED** | Skipped this run |

---

## Roles

| Role | Responsibility |
|------|----------------|
| Field officer | Runs Day 0 + offline session + reconnect |
| QA / developer | Failure, isolation, recovery, conflict tests |
| ECD caretaker | Confirms UX language is understandable |

---

## Preconditions

- [ ] Device charged; browser supports IndexedDB + service workers
- [ ] Device PIN / lock screen enabled
- [ ] Caretaker account A with assigned center
- [ ] Second account B for isolation tests
- [ ] Staging/API reachable for Day 0 and reconnect
- [ ] Printed or digital copy of this checklist
- [ ] Build/version recorded in sign-off

---

## Day 0 — Online bootstrap (install + first sync)

| # | Scenario | Expected | Observed | Result | Notes |
|---|----------|----------|----------|--------|-------|
| D0.1 | Install PWA (Add to Home Screen) | App icon; opens standalone | | | |
| D0.2 | Online login (user A) | Authenticates; workspace activates | | | |
| D0.3 | Device registration | Succeeds (or already registered); no wipe | | | |
| D0.4 | Initial sync | Syncing → idle; children appear | | | |
| D0.5 | Last sync timestamp | Shell shows last synced time (not “never”) | | | |
| D0.6 | Spot-check children | Known center children visible | | | |
| D0.7 | Offline indicator online | Shell shows **Uri ku murongo** (or idle online) | | | |

---

## Offline session (Scenario A)

| # | Scenario | Expected | Observed | Result | Notes |
|---|----------|----------|----------|--------|-------|
| O.1 | Turn off Wi-Fi/mobile data | Shell **Nta murongo**; app usable | | | |
| O.2 | View children | List from local snapshot; no API | | | |
| O.3 | Register child | **Byabitswe kuri iki gikoresho**; pending +1 | | | |
| O.4 | Record attendance | Multi-child mark/update; saved on device | | | |
| O.5 | Record growth/nutrition | Screening saved; severe/moderate may add pending referral | | | |
| O.6 | Record feeding | Day (+ month summary if used) saved locally | | | |
| O.7 | Complete STED | Assessment saved; referred creates dependent referral | | | |
| O.8 | Create / update referral | Saved locally; notes/status when supported | | | |
| O.9 | Navigate between screens | No crash; data still visible | | | |
| O.10 | Edit child guardian phone only | Saves on device | | | |
| O.11 | Edit child DOB/gender/village | Fields **locked** with internet message; cannot submit those changes | | | |
| O.12 | Close application | Force-close browser/PWA while offline with pending | | | |
| O.13 | Reopen offline | Shell loads; children + pending restored | | | |
| O.14 | Continue working | New records save; pending increases | | | |
| O.15 | Restart again (2–3×) — Scenario B | No duplicate pending; no data loss | | | |

---

## Reconnect

| # | Scenario | Expected | Observed | Result | Notes |
|---|----------|----------|----------|--------|-------|
| R.1 | Restore network | Reconnecting → syncing | | | |
| R.2 | Pending count | Decreases toward 0 (or conflicts shown) | | | |
| R.3 | Last sync | Timestamp updates | | | |
| R.4 | Server verify | Spot-check new child / attendance / screening on server or second online device | | | |
| R.5 | No duplicates | Same child/attendance not doubled after sync | | | |

---

## Failure & recovery (QA) — Scenarios C / D

| # | Scenario | Expected | Observed | Result | Notes |
|---|----------|----------|----------|--------|-------|
| F.1 | Disconnect during sync | No false success; pending retained | | | |
| F.2 | Restart during sync | Pending restored; retry safe (same IDs) | | | |
| F.3 | Session / token expiry | **Ongera winjire**; local data intact | | | |
| F.4 | Re-login same user | Workspace restores; sync resumes | | | |
| F.5 | Wrong account after auth | Must not show other user’s data | | | |

---

## Account isolation (Scenario E)

| # | Scenario | Expected | Observed | Result | Notes |
|---|----------|----------|----------|--------|-------|
| I.1 | A offline work → logout **Keep** | A data retained on device | | | |
| I.2 | Login B | B cannot see A children/pending | | | |
| I.3 | Logout B → login A | A pending restored; sync can resume | | | |
| I.4 | A logout **Discard** | A local DB wiped; B unaffected | | | |

---

## Conflict & attention (Scenario G)

| # | Scenario | Expected | Observed | Result | Notes |
|---|----------|----------|----------|--------|-------|
| C.1 | Conflict present (if reproducible) | Settings shows **Birakeneye kwitabwaho** + child/domain label | | | |
| C.2 | Server-wins message | Explains server version is active; continue work | | | |
| C.3 | Acknowledge server | **Nemera amakuru ya seriveri** clears attention without wiping workspace | | | |
| C.4 | Logout with conflict | Blocked until sync/keep/discard/acknowledge chosen | | | |

---

## Device handoff / recovery

| # | Scenario | Expected | Observed | Result | Notes |
|---|----------|----------|----------|--------|-------|
| V.1 | Discard previous user data on handoff | Next user cannot access previous user’s data | | | |
| V.2 | Clear site data | Local snapshot gone; requires online re-sync | | | |
| V.3 | Reinstall / reopen PWA | Shell installs; no API data in SW cache | | | |
| V.4 | District offline (if tested) | **Ibi bisaba umurongo…** — not fake zeros | | | |

---

## Automated ↔ human crosswalk (A–H)

| Scenario | Automated | Human checklist |
|----------|-----------|-----------------|
| A Normal offline day | field-readiness Phase 1–3 | O.1–O.14 |
| B Multiple restarts | Phase 3 (5×) | O.15 |
| C Network failure | Phase 6 | F.1–F.2 |
| D Auth expiry | Phase 4 + 6 | F.3–F.4 |
| E Account switching | Phase 5 | I.1–I.4 |
| F Referral dependency | Phase 8 | O.5 / O.7 / O.8 |
| G Conflict | Phase 9 | C.1–C.4 |
| H Storage failure | Phase 13 | Train: never “saved” on storage error |

---

## Operational controls (field lead sign-off)

- [ ] One primary caretaker per tablet during pilot
- [ ] Device PIN required; no shared browser profiles
- [ ] Discard local data when handing device to another caretaker
- [ ] Lost/stolen tablet → disable account immediately
- [ ] Do not use public/shared computers
- [ ] Do not leave authenticated tablets unattended
- [ ] Tech support contact known for conflicts / sync errors
- [ ] IndexedDB PII encryption treated as **POST-PILOT / P2** (not solved)

---

## Sign-off

| Field | Value |
|-------|-------|
| Tablet ID | |
| Center | |
| Caretaker | |
| Date | |
| Tester | |
| Build/version | |
| Result | PASS / FAIL / BLOCKED / NOT TESTED |
| Issues | |
| Approved by | |

| Role | Name | Date | Verdict |
|------|------|------|---------|
| Field tester | | | PASS / FAIL / BLOCKED / NOT TESTED |
| QA | | | PASS / FAIL / BLOCKED / NOT TESTED |
| Tech lead | | | PASS / FAIL / CONDITIONAL / NOT TESTED |

**Human tablet testing status:** **NOT EXECUTED** until this form is signed on physical devices.
