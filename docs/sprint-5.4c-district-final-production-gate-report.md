# Sprint 5.4C — District Production API Deployment & Final Freeze Gate

**Date:** 2026-08-11  
**Frontend:** `D:\Esri\ECD`  
**Backend:** `D:\Esri\ECD Backend`  
**Continues from:** Sprint 5.4A / 5.4B  
**Account:** `ncda_admin` (≈39,445 centers)  
**API host class:** Render HTTPS (`ecd-backend-bda8.onrender.com`) — host classified; secrets not republished

---

## Executive verdict

```text
DISTRICT PRODUCTION VERIFIED WITH CONDITIONS
```

The Sprint 5.4B backend stability fix was **committed, pushed, and verified live** on the same production-scale `ncda_admin` scope that previously returned **502 / timeouts**. The Sprint 5.4A smoke matrix was re-run against the deployed API: **all previously failing monitoring / reports / alerts / screening / referral endpoints now return HTTP 200** with no gateway failures.

```text
DISTRICT ARCHITECTURE FREEZE: APPROVED
```

Freeze means District LIVE architecture (React Query → resources → Orval → REST) is the stable production baseline. It does **not** mean every District feature is complete.

---

## Pre-deploy verification (Sprint 5.4B diff)

| Check | Result |
| --- | --- |
| N+1 center aggregation removed | **PASS** — no `centers.map(async => count)` in monitoring/reports |
| Scoped aggregation preserved | **PASS** — `groupBy` / `$queryRaw` retain `centerIdWhere` / district filters |
| Nutrition alert cap | **PASS** — `take: 2000` on flagged + overdue paths |
| Follow-up DQ simplified | **PASS** — attendance `groupBy` instead of per-center `_count` |
| Authorization unchanged | **PASS** — `resolveScope` / `assertCenterAccess` / `scope.util` **not** in release commit |
| Unrelated release noise | **PASS** — release commit limited to monitoring/reports/alerts/nutrition/referrals + timing scripts |

Release commit:

```text
36a2f796941043e5daba0a9a15f5b614e41a79f0
fix(perf): replace NCDA monitoring N+1 with scoped aggregations
```

Also includes Sprint 5.3 District contracts already consumed by the frontend (`GET /nutrition/screenings`, referral `from`/`to`) that were previously unshipped on `origin/main`.

---

## Backend verification (pre-push)

| Command | Result |
| --- | --- |
| `npm run test:monitoring` | **PASS** (incl. O(1) fan-out regressions) |
| `npm run test:reports` | **PASS** |
| `npm run test:alerts` | **PASS** |
| `npm run test:analytics` | **PASS** |
| `npm run test:referrals` | **PASS** |
| `npm run test:nutrition` | **PASS** |
| `npm run build` (`nest build`) | **PASS** |
| Touched-path eslint | **PASS** |
| Repo-wide `npm run lint` | **FAIL** — 16 pre-existing unused-var / import errors outside this release (unchanged debt) |

---

## Deployment evidence

| Item | Evidence |
| --- | --- |
| Deploy method | `git push` to `origin/main` on `https://github.com/Orrie-Dan/ECD-Backend.git` (Render auto-deploy) |
| Push range | `203dcdb..36a2f79` |
| Deployed commit | `36a2f796941043e5daba0a9a15f5b614e41a79f0` |
| Deployment status | **PASS** (service serving traffic) |
| Pre-deploy OpenAPI | `docs-json` ~199,758 bytes; **no** `nutrition/screenings` |
| Post-deploy OpenAPI | `docs-json` ~203,869 bytes; **`nutrition/screenings` present**; referral `from` present |
| Health | API reachable over HTTPS; login 201; Nest serving `/api/v1/*` and `/docs-json` |
| Startup / Prisma | No client-visible startup failures during smoke; endpoints complete successfully |
| Secrets | Not exposed in this report |

Version verification method (no dedicated `/version` endpoint in repo):

```text
behavioral + OpenAPI contract marker
pre:  screenings path absent
post: screenings path present + OpenAPI payload grew
+ monitoring/attendance returns 200 under NCDA (previously 502)
```

---

## Before vs after

| Workflow | Sprint 5.4A | Sprint 5.4C | Result |
| --- | --- | --- | --- |
| Login | PASS | PASS (201, ~1.9s) | **IMPROVED/HELD** |
| Dashboard | PASS | PASS (200, ~0.8s); `centersInScope=39445`; no Gasabo in API payload | **HELD** |
| Centers | PASS | PASS (100 / 39445) | **HELD** |
| Attendance | **502/timeout** | **PASS** (200, ~2.9s, total 39445, page 20) | **FIXED** |
| Growth | **502/timeout** | **PASS** monitoring nutrition ~2.4s; screenings 200; alerts 200 | **FIXED** |
| Referrals | **502/timeout** | **PASS** monitoring ~2.1s; list+`from`/`to` 200 | **FIXED** |
| Gukurikirana | **502/timeout** | **PASS** follow-up 200 (~0.6s, empty) | **FIXED** |
| Reports | **502/timeout** | **PASS** enrollment/dropouts/district/centers (centers report ~3.5s) | **FIXED** |
| Center Detail | PARTIAL | PASS (200 for first page center) | **IMPROVED** |
| Child Detail | BLOCKED (no children) | BLOCKED (`children.total=0`) | **UNCHANGED DATA GAP** |
| Logout | PASS | PASS (session token remains valid server-side; FE clears locally — same model as 5.4A) | **HELD** |
| Feeding / STED mon | FAIL family | PASS (~1.9–2.3s) | **FIXED** |

**502 errors:** NO  
**Timeouts:** NO  

---

## Backend stability

| Topic | Observation |
| --- | --- |
| N+1 removed | Confirmed in code + production behavior (NCDA monitoring completes) |
| Aggregation | `groupBy` / single SQL join-group for nutrition-by-center; reports/centers aggregated |
| Production latency | Higher than local (~2–3.5s vs ~0.7–1.0s) but **reliably under proxy budget** |
| Errors | None on critical matrix |
| Resource health | No evidence of process death mid-smoke; `/auth/me` still 200 after heavy monitoring load (5.4A had intermittent me 502 after monitoring thrash) |
| Query volume | Endpoint timings inconsistent with 100k+ round-trips |

---

## Network / mock / LocalStore

| Check | Result |
| --- | --- |
| `VITE_API_MODE` | `live` |
| API base | Non-localhost HTTPS Render host |
| Requests target production | **YES** (smoke script hard-refuses localhost) |
| Mock leakage | **NO** — KPIs from live API (`centersInScope`, empty operational zeros) |
| District LocalStore dependency | **NO** — smoke used direct REST; District LIVE path remains React Query → Orval |
| Fixture requests | **NO** |

---

## Remaining conditions

1. **No `district_focal_person` production account** — District-focal-person-specific verification remains incomplete. Broad-scope NCDA LIVE stability is verified; authorization semantics unchanged.
2. **Centers `pageSize: 100` vs `total: 39445`** — known truncation; UI must continue to show loaded/total honestly (not redesigned here).
3. **Empty operational population** — `children=0`, attendance/nutrition/referral totals 0 on this host. Endpoints are stable; representative child-detail drill remains data-blocked.
4. **Accepted product gaps (unchanged):** exports unavailable; alert mutations unavailable; some dashboard secondary widgets honest-unavailable; JWT in `localStorage`.
5. **Repo-wide backend eslint debt** remains outside this release.

These are **conditions**, not P0 LIVE blockers for architecture freeze.

---

## Frontend verification (post-smoke)

| Command | Result |
| --- | --- |
| `npm run test` | **154/154 PASS** |
| `npm run build` | **PASS** (run with report) |
| Touched-path eslint | **PASS** / or pre-existing District paths |
| Frontend production code changes this sprint | **NO** (smoke harness + `.gitignore` only) |

Artifacts:

- `scripts/sprint-54c-live-smoke.mjs` — reproducible LIVE probe
- `.smoke-tmp-54c/` — local probe outputs (gitignored)

---

## Freeze decision

```text
DISTRICT ARCHITECTURE FREEZE APPROVED
```

Stable baseline:

```text
District Page → District Hook → React Query → Resource Wrapper → Orval → REST API
```

Do **not** start Sprint 5.5 / NCDA Admin / GIS / exports / alert mutations from this report unless separately scheduled.

**STOP after this gate report.**

---

## SPRINT 5.4C STATUS

```text
SPRINT 5.4C STATUS

Verdict:
DISTRICT PRODUCTION VERIFIED WITH CONDITIONS

Backend deployment:
PASS

Deployed backend version verified:
YES

LIVE configuration:
PASS

Real production API:
PASS

Dashboard:
PASS

Centers:
PASS

Attendance:
PASS

Growth:
PASS

Referrals:
PASS

Gukurikirana:
PASS

Reports:
PASS

Center Detail:
PASS

Child Detail:
PARTIAL

Logout:
PASS

502 errors:
NO

Timeouts:
NO

Mock leakage:
NO

District LocalStore dependency:
NO

Backend regression:
NO

Frontend regression:
NO

District-scoped production account:
NO

Known accepted limitations:
No district_focal_person account; centers pageSize 100 of 39445; empty children/ops data blocks child-detail drill; exports unavailable; alert mutations unavailable; some dashboard widgets honest-unavailable; JWT in localStorage; backend repo-wide eslint debt

Tests:
154/154 PASS (frontend); backend monitoring/reports/alerts/analytics/referrals/nutrition PASS

Build:
PASS

Lint:
PASS (touched paths); repo-wide backend lint has pre-existing failures

District architecture freeze:
APPROVED

Next step:
STOP. Do not start Sprint 5.5 automatically. Schedule NCDA Admin / GIS / exports / alert mutations only as explicit follow-on work. Optionally provision a district_focal_person test account for scoped verification.
```
