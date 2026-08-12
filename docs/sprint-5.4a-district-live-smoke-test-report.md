# Sprint 5.4A — District LIVE Smoke Test & Deployment Gate

**Date:** 2026-08-11  
**Frontend:** `D:\Esri\ECD`  
**API environment:** deployed HTTPS Nest API (Render-hosted)  
**Account used:** environment-provided seed admin (`ncda_admin` → UI `districtOfficer`)  
**Continues from:** `docs/sprint-5.4-district-production-readiness-report.md`

---

## Executive verdict

```text
DISTRICT LIVE BLOCKED
```

LIVE configuration is valid and several District surfaces work against the real API (login, dashboard, centers list). **Core monitoring / operational workflows do not** — the deployed API returns **502 / timeouts** for attendance, nutrition, referrals, follow-up alerts, screenings, and reports under the only available authorized account. District architecture freeze is **not approved** until that environment failure is resolved or re-verified with a stable, scoped District account.

No frontend production-code fix was applied (failure is API/host capacity + data scale, not a Sprint 5.4 regression).

---

## Environment

| Item | Result |
| --- | --- |
| `VITE_API_MODE` | `live` (from project `.env`; confirmed baked into production bundle as `apiMode: live`) |
| `VITE_API_BASE_URL` | Non-localhost HTTPS origin (Render) — **host classified, value not republished** |
| Environment type | Deployed / production-like shared API (not localhost) |
| Production vs non-production | Non-production hosted backend with large national center dataset |
| Process env overrides | None required beyond `.env` |
| Secrets in report | **None** (tokens/passwords not printed) |

### Production build verification

- `npm run build` with LIVE `.env`: **PASS**
- Bundle contains `apiMode: live` and the configured HTTPS API origin
- Bundle still contains the **fallback string** `http://localhost:3000` inside the URL helper (unused when `VITE_API_BASE_URL` is set) — not an active runtime dependency
- Bundle still contains mock-mode source (e.g. `Gasabo`) for MOCK branches — **not executed** in LIVE smoke

### Production configuration checklist

```text
[x] VITE_API_MODE=live
[x] VITE_API_BASE_URL is non-localhost
[x] production build succeeds
[x] no active localhost API dependency at runtime
[x] no development proxy dependency observed
[x] no mock fallback in LIVE primary workflows observed
[x] no hardcoded Gasabo district context on LIVE dashboard (shows "—")
```

---

## Smoke-test matrix

| Workflow | Result | Real API | Mock Leakage | Error Handling | Notes |
| --- | --- | --- | --- | --- | --- |
| Login | PASS | YES | NO | PASS | Invalid credentials rejected in UI; valid API login 201; role maps to District |
| Dashboard | PASS | YES | NO | PASS | LIVE KPIs from analytics; secondary widgets honest LiveUnavailable; district label "—" |
| Children | PARTIAL | YES | NO | PARTIAL | API `GET /children` 200 with `total=0` (empty dataset). UI interrupted when `/auth/me` later 502’d |
| Centers | PASS | YES | NO | PASS | Real centers; UI shows **`100 / 39445`** truncation caption |
| Center Detail | PARTIAL | YES | NO | PARTIAL | API `GET /centers/:id` 200 with stats fields. UI deep-link flaky under auth/API instability in this run |
| Attendance | FAIL | YES* | NO | N/A | `GET /monitoring/attendance` → **502 / timeout** (gateway HTML 502) |
| Growth | FAIL | YES* | NO | N/A | Monitoring nutrition + screenings + nutrition alerts → **502** |
| Referrals | FAIL | YES* | NO | N/A | Monitoring + `GET /referrals` (incl. `from`/`to`) → **502/503** |
| Gukurikirana | FAIL | YES* | NO | N/A | `GET /alerts/follow-up` → **502/503** |
| Reports | FAIL | YES* | NO | N/A | enrollment/dropouts/district reports → **502** |
| Child Detail | BLOCKED | — | — | — | No child records in API scope (`children.total=0`) |
| Logout | PASS | N/A | NO | PASS | Session cleared; `/district` redirects to role selection |

\*Request reached the real API host; the **response failed** (not mock).

---

## P0 blockers

### P0-1 — Deployed API cannot serve District monitoring/operational reads

| Field | Detail |
| --- | --- |
| Issue | Under the available LIVE account (`ncda_admin`), monitoring, referrals, nutrition screenings/alerts, follow-up alerts, and reports return **502 Bad Gateway** (Render HTML) or hang/timeout. |
| Expected | Core District pages load scoped aggregates/lists from `/api/v1/monitoring/*`, `/api/v1/referrals`, `/api/v1/nutrition/*`, `/api/v1/alerts/follow-up`, `/api/v1/reports/*`. |
| Actual | Auth + dashboard + centers succeed; monitoring family fails repeatedly even with narrowed `from`/`to` and smaller `pageSize`. |
| Root cause | Environment/backend capacity under **very large center cardinality** (`centers.total ≈ 39445` for this account). Not a frontend wiring defect. |
| Affected workflows | Attendance, Growth, Referrals, Gukurikirana, Reports (and session stability when `/auth/me` also 502’d mid-run) |
| Why this blocks production | District cannot be declared LIVE-verified if core monitoring routes do not return data. |
| Smallest safe fix | **Out of frontend scope** for 5.4A: stabilize/host-scale API; and/or provide a `district_focal_person` test account with realistic district scope; and/or reduce seed/data volume on this host. |
| Verification | Re-probe after backend remediation; then re-run this smoke matrix. |

---

## P1 findings

1. **Centers `pageSize: 100` vs `total: 39445`** — UI correctly captions `100 / 39445`, but summary cards treat the loaded page as “all good (100)”. For NCDA-scale data this is **misleading completeness**, not merely a cosmetic limit. Documented; **not redesigned** in 5.4A.
2. **Only privileged seed admin available** — no dedicated District focal test user in frontend env. Smoke could not validate district-scoped (smaller) monitoring behavior.
3. **API instability after monitoring load** — `/auth/me` temporarily 502’d, forcing UI back to unauthenticated state mid-session.
4. **JWT in localStorage** — residual from 5.4; unchanged.
5. **Center quick-preview in LIVE** remains honest unavailable (known gap).

---

## Known accepted limitations (still truthful)

| Limitation | LIVE behavior observed |
| --- | --- |
| Exports | Not exercised as success; remains unsupported |
| Alert mutations | Not available; no fake success observed |
| Dashboard secondary widgets | Honest LiveUnavailable copy (no mock data) |
| `pageSize: 100` | Confirmed first-page only; truncation caption present on Centers |
| `/auth/me` district name | Dashboard shows **Akarere: —** (not Gasabo) |

---

## Mock leakage / LocalStore check

| Check | Result |
| --- | --- |
| MOCK_DATA driving LIVE KPIs | **NO** |
| LocalStore for District primary data | **NO** |
| Caregiver DataProvider unbounded hydrate | Not observed in LIVE District session (5.4 gate remains) |
| Localhost API calls from LIVE app | **NO** (requests targeted configured HTTPS origin) |
| Classification of mock code in bundle | **EXPECTED MOCK INFRASTRUCTURE NOT EXECUTED** |

---

## pageSize: 100 condition

| Surface | Behavior |
| --- | --- |
| Centers | Requests `page=1&pageSize=100`; API returns 100 items, `total=39445`, `totalPages=395`. UI shows **`100 / 39445`**. |
| Monitoring / GIS | Same client pageSize pattern; monitoring could not be fully validated because API 502’d. |

**Classification:** known page-size limitation **elevated to P1** for this dataset (incomplete national view / misleading page-local summaries). **No redesign in 5.4A.**

---

## Changes made

```text
No production application code changes required.
```

Hygiene only:

- `.gitignore` — ignore `.smoke-tmp/` (local smoke artifacts)
- Temporary smoke session files under `dist/` / `.smoke-tmp/` were created and **deleted** after use

---

## Verification

| Command | Result |
| --- | --- |
| `npm run test` | **154/154 PASS** |
| `npm run build` (LIVE) | **PASS** |
| Touched-path eslint | **PASS** |
| Type-check | **PASS** via `tsc -b` in build (`NOT AVAILABLE` as separate script) |
| Repo-wide `npm run lint` | Pre-existing debt outside this gate (unchanged) |

---

## Architecture freeze decision

```text
DISTRICT ARCHITECTURE FREEZE NOT APPROVED
```

Remaining before freeze:

1. Stabilize LIVE API so monitoring/referrals/alerts/reports succeed for the intended District role/scope.
2. Re-run this smoke matrix to **PASS/PARTIAL with only accepted gaps**.
3. Prefer a non-NCDA `district_focal_person` account for District gate testing (or reduce national center cardinality on the smoke host).
4. Explicitly accept or remediate NCDA-scale `pageSize: 100` truncation semantics.

Frontend District architecture from Sprints 5.1–5.4 remains directionally sound; **this gate failed on real-API operability**, not on LocalStore/mock leakage.

---

## Recommended next step

Ops/backend: fix Render API 502/timeouts for monitoring family under production-like data; provision District focal test credentials; re-run Sprint 5.4A smoke only.  
Do **not** start NCDA Admin / GIS / exports / alert-mutation feature sprints from this report.

**STOP after this smoke-test report.**

---

## SPRINT 5.4A STATUS

```text
SPRINT 5.4A STATUS

Verdict:
DISTRICT LIVE BLOCKED

LIVE configuration:
PASS

Real API connectivity:
PASS

Login:
PASS

Dashboard:
PASS

Children:
PARTIAL

Centers:
PASS

Center Detail:
PARTIAL

Attendance:
FAIL

Growth:
FAIL

Referrals:
FAIL

Gukurikirana:
FAIL

Reports:
FAIL

Child Detail:
BLOCKED

Logout:
PASS

Mock leakage in LIVE:
NO

LocalStore dependency in District LIVE:
NO

Unexpected localhost dependency:
NO

P0 blockers:
Deployed API 502/timeouts on monitoring, referrals, nutrition screenings/alerts, follow-up alerts, and reports under available LIVE account (~39k centers)

P1 findings:
Centers pageSize 100 of 39445 misleading at NCDA scale; only seed admin credentials available; intermittent /auth/me 502 after monitoring load; JWT localStorage residual

Accepted limitations:
Exports unavailable; alert mutations unavailable; dashboard secondary widgets honest unavailable; auth me lacks districtName (shows —)

Production code changed:
NO

Backend changed:
NO

OpenAPI changed:
NO

Caregiver offline architecture changed:
NO

Tests:
154/154 PASS

Build:
PASS

Lint:
PASS (touched verification paths); repo-wide pre-existing debt unchanged

Type-check:
PASS

District architecture freeze:
NOT APPROVED

Recommended next step:
Stabilize LIVE API monitoring/report endpoints (and/or District-scoped test account), then re-run Sprint 5.4A smoke only — do not start feature sprints
```
