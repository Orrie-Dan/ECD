# Sprint 5.4 — District Production Readiness & Hardening Report

**Date:** 2026-08-11  
**Frontend:** `D:\Esri\ECD`  
**Backend:** not modified  
**Continues from:** Sprint 5.3 (`docs/sprint-5.3-district-contract-completion-report.md`)

---

## 1. Executive verdict

```text
DISTRICT PRODUCTION READY WITH CONDITIONS
```

District LIVE architecture is stable enough to freeze for the next phase **if** the deployment and operational conditions below are satisfied. No remaining P0 blockers were left unresolved after Sprint 5.4 fixes.

District architecture for primary operational reads remains:

```text
District Page → District Hook → React Query → Resource Wrapper → Orval → REST API
```

---

## 2. Production readiness scorecard

| Domain | Status | Evidence | Severity | Action |
| --- | --- | --- | --- | --- |
| Data architecture | READY | District feature hooks use REST only; caregiver DataProvider LIVE hydrations gated to caretakers | — | Done in 5.4 |
| API contracts | READY | Nutrition/referrals/monitoring/children/centers wired via Orval resources; contract tests pass | — | Maintain |
| Authorization | READY WITH CONDITIONS | Backend remains authoritative; FE role fail-closed; JWT still in localStorage | P1 residual | Deploy + XSS hygiene |
| Performance | READY WITH CONDITIONS | Core lists paginated; centers/monitoring/GIS still `pageSize: 100` with truncation signal | P1 | Next hardening |
| Query/cache | READY | District children moved to `district.keys.*`; stable filter keys elsewhere | — | Done in 5.4 |
| Error handling | READY | Core pages have loading/error/empty; retries added where missing; app error boundary | — | Done in 5.4 |
| MOCK/LIVE isolation | READY | No LIVE `?? MOCK` fallbacks on primary KPIs; MOCK wrappers remain mode-gated | — | Maintain |
| Routing | READY | All District routes registered; referrals wired; monitoring in sidebar; deep links work | — | Done in 5.4 |
| Security | READY WITH CONDITIONS | No XSS sinks found; unknown roles fail closed; tokens in localStorage | P1 residual | Documented |
| Data consistency | READY WITH CONDITIONS | Metrics use distinct APIs; honest `—` / LiveUnavailable where definitions differ | P2 | Documented |
| Testing | READY | 154/154 frontend tests pass incl. 5.4 contract suite | — | Maintain |
| Build | READY | `npm run build` PASS (`tsc -b` + Vite) | — | Maintain |
| Lint/type safety | READY WITH CONDITIONS | Touched-file eslint PASS; repo-wide `npm run lint` has pre-existing debt | P2 | Separate cleanup |
| Production config | READY WITH CONDITIONS | `.env.example` documents prod requirements; runtime warns on LIVE+localhost in PROD | P1 | Ops must set env |
| Responsive UX | READY WITH CONDITIONS | Layout/drawer/bottom nav; tables use responsive cards; no redesign performed | P2 | Manual smoke |
| Accessibility | READY WITH CONDITIONS | Error boundary alert role; table scopes; focused fixes only | P2 | Baseline only |
| Observability | READY WITH CONDITIONS | Axios/API toasts + error bridge; no District telemetry product | P2 | Future |

---

## 3. P0 findings

### P0-1 — Caregiver DataProvider hydrated District LIVE sessions

| Field | Detail |
| --- | --- |
| Issue | `DataProvider` wrapped District routes and enabled centerless `useChildrenList` / `useAttendanceWindow` / `useReferralWindow` for any authenticated LIVE user, pulling large windows into LocalStore during District sessions. |
| Impact | Unbounded/risky network + LocalStore contamination; undermined “District LIVE does not use caregiver offline for primary data” for the session. |
| Evidence | `App.tsx` DataProvider wrap; `features/children|attendance|referrals/repository.ts` previously `enabled: env.isLive && !!user`. |
| Fix | Gate LIVE repository queries with `isCaretaker(user)`. Growth/STED/nutrition roster cascades stay idle when child list is empty. |
| Verification | Contract test + full suite PASS; District pages continue via district hooks. |

### P0-2 — Referral monitoring implemented but unrouted

| Field | Detail |
| --- | --- |
| Issue | `ReferralMonitoringPage` existed with LIVE support but had no App route; monitoring nav omitted attendance/growth/feeding/STED/referrals. |
| Impact | Core operational surface unreachable except by guessing URLs (and referrals not even that). |
| Evidence | `App.tsx` route inventory vs page file; `DistrictLayout` sidebar. |
| Fix | Added `/district/referrals` route; added monitoring entries to sidebar/drawer nav. |
| Verification | Contract test asserts route + nav strings; build PASS. |

---

## 4. P1 findings

### P1-1 — District children shared caregiver query keys *(fixed)*

Moved `useDistrictChildrenList` / `useDistrictChildDetail` onto `district.keys.children` / `district.keys.child`.

### P1-2 — Missing app error boundary *(fixed)*

Added `AppErrorBoundary` wrapping the app tree.

### P1-3 — Unknown API role defaulted to `districtOfficer` *(fixed)*

`normalizeRole` now throws `UnknownUserRoleError`; login clears session on unknown roles.

### P1-4 — Hardcoded `DISTRICT_NAME` (“Gasabo”) on LIVE chrome *(fixed partially)*

Dashboard filter summary and centers table no longer force mock district name in LIVE. Residual: `/auth/me` still lacks `districtName` (shows `—` until enriched from centers or backend).

### P1-5 — Error UIs without retry *(fixed for touched core pages)*

Retry added on Centers, Children, Child detail, Center detail, GIS map.

### P1-6 — Centers / monitoring / GIS `pageSize: 100` truncation *(condition)*

Silent incomplete lists remain a production risk for very large districts. Centers page now surfaces `loaded / total` when truncated. Full page-through is deferred (not a feature sprint).

### P1-7 — JWT + refresh in `localStorage` *(condition)*

XSS still implies session theft. Backend remains the authorization boundary. No auth redesign in 5.4.

### P1-8 — Production env defaults *(condition + hardening)*

Dev defaults remain `mock` + localhost (correct for demo). Production **must** set `VITE_API_MODE=live` and a non-localhost `VITE_API_BASE_URL`. PROD LIVE builds log an error if the API origin is localhost.

---

## 5. P2 findings (documented only)

1. Nutrition alerts still lack offset pagination.
2. Referral “overdue” filter is page-local only.
3. Unused `district.keys.monitoring|dashboard|reporting` factories.
4. Dashboard widgets (`AttendanceOverview`, trends, recent activity, center performance) remain LiveUnavailable.
5. Center detail LIVE trends/activity unavailable.
6. Report export / Settings save unavailable in LIVE (honest).
7. Alert dismiss/ack mutations absent.
8. Filter/drill state not URL-persisted.
9. GIS has no loading skeleton while centers fetch.
10. Repo-wide eslint debt outside District 5.4 touch set.
11. Chunk size warning on production bundle (~1.7 MB JS).
12. `/auth/me` does not return human-readable district name.
13. Observability limited to client toasts; no structured District ops telemetry.

---

## 6. Changes made

### Frontend

| File | Change |
| --- | --- |
| `src/features/children/repository.ts` | Gate LIVE list to caretakers; memoize children |
| `src/features/attendance/repository.ts` | Gate LIVE window to caretakers; lint fix |
| `src/features/referrals/repository.ts` | Gate LIVE window to caretakers |
| `src/features/district/children/queries.ts` | Use `district.keys.*` |
| `src/api/roles.ts` | Fail-closed unknown roles + `UnknownUserRoleError` |
| `src/api/index.ts` | Export `UnknownUserRoleError` |
| `src/features/auth/mutations.ts` | Handle unknown role on login |
| `src/config/env.ts` | Prod LIVE localhost URL safety helper + console error |
| `.env.example` | Production env guidance |
| `src/App.tsx` | Error boundary; `/district/referrals` route |
| `src/components/AppErrorBoundary.tsx` | **new** |
| `src/layouts/DistrictLayout.tsx` | Monitoring nav; drawer path sync without effect |
| `src/components/district/DashboardFilterSummary.tsx` | Auth/mock-aware district label |
| `src/components/district/schools/SchoolsTable.tsx` | Optional `districtLabel` |
| `src/components/district/gis/DistrictMapView.tsx` | Error retry |
| `src/pages/district/CentersPage.tsx` | Retry; truncation notice; LIVE location mapping |
| `src/pages/district/ChildrenPage.tsx` | Error retry |
| `src/pages/district/DistrictChildDetailPage.tsx` | Retry; MOCK cleanup |
| `src/pages/district/CenterDetailPage.tsx` | Error retry |
| `src/features/district/production-readiness.contract.test.ts` | **new** |

### Backend / OpenAPI / Prisma / caregiver offline

None intentionally changed. Caregiver offline architecture unchanged except DataProvider LIVE enablement gated by role (caregiver path preserved).

---

## 7. Architecture verification

```text
District LIVE uses LocalStore:
NO
(for primary page data; DataProvider no longer hydrates District LIVE sessions)

District LIVE uses useData() for primary data:
NO
(remaining useData() calls are MOCK-only wrappers)

District LIVE uses caregiver DataProvider:
NO
(provider still mounts for app structure, but LIVE caregiver hydrations are caretaker-gated)

MOCK leakage in LIVE:
NO
(primary KPIs; district name no longer forced to mock Gasabo)

Unbounded District LIVE queries:
NO
(for District feature hooks; centers/monitoring remain BOUNDED at 100 with truncation risk)

Server-side pagination where required:
YES
(children, screenings, referrals, attendance center-day)

Server-side filtering where required:
YES
(with documented unsupported LIVE filters disabled, not simulated)
```

---

## 8. Security verification

| Topic | Status |
| --- | --- |
| Authentication | JWT access + refresh; 401 refresh queue; session clear on failure |
| Authorization | UI `ProtectedRoute` is not the security boundary; backend `resolveScope` / role checks remain authoritative |
| Scope enforcement | Frontend must not treat query param manipulation as trusted; backend rejects out-of-scope center/child access |
| Sensitive logging | No District-path token/PII `console.log` found |
| Token exposure | Tokens in `localStorage` (XSS = session theft) — **condition** |
| XSS | No `dangerouslySetInnerHTML` in District trees |
| Role normalization | Unknown API roles fail closed |

---

## 9. Production configuration

| Item | Value / requirement |
| --- | --- |
| API base URL | `VITE_API_BASE_URL` (no trailing slash); paths already `/api/v1/...` |
| Mode | `VITE_API_MODE=live` for production |
| Dev defaults | `mock` + `http://localhost:3000` (demo only) |
| Production assumption | Static SPA + API origin configured at build/deploy time; no hardcoded prod host in source |
| Development-only deps | Localhost API allowed only for non-PROD or MOCK |
| Safety net | PROD + LIVE + localhost API → `console.error` |

---

## 10. Testing

| Suite | Result |
| --- | --- |
| `npm run test` | **154/154 PASS** (16 files) |
| District contract + readiness tests | Included in above |
| Caregiver sync/storage/offline (sampled via full suite) | PASS — no regressions observed |
| `npm run build` (`tsc -b` + Vite) | **PASS** |
| Touched-file eslint (`--max-warnings=0`) | **PASS** |
| Repo-wide `npm run lint` | Pre-existing failures outside 5.4 touch set — **not a new regression** |
| Dedicated type-check script | **NOT AVAILABLE** (covered by `tsc -b` in build) |
| Backend tests | **N/A** (no backend changes) |

### District production smoke-test checklist (manual)

1. Login as district focal person (LIVE)
2. Dashboard loads KPIs / honest unavailable widgets
3. Dashboard period filter changes
4. Children list → pagination → child detail
5. Centers list → center detail
6. Attendance monitoring + center-day drill
7. Growth monitoring (screenings + alerts)
8. Referrals monitoring (status + from/to)
9. Feeding + STED monitoring
10. Gukurikirana follow-up alerts
11. Reports preview
12. Force API error → retry works
13. Direct URL refresh on `/district/abana/:id`, `/district/referrals`, `/district/attendance`
14. Logout

Automated coverage validates contracts/isolation; end-to-end smoke against a real API remains **manual / PARTIAL** until ops executes the checklist.

---

## Page-by-page LIVE matrix (summary)

| Route | Primary API | L/S/E/Err/R | Pagination | Mock isolation | LocalStore primary |
| --- | --- | --- | --- | --- | --- |
| `/district` | analytics + monitoring + alerts | Y | N/A | Y | N |
| `/district/abana` | `GET /children` | Y + retry | Server | Y | N |
| `/district/abana/:id` | `GET /children/:id` | Y + retry | N/A | Y | N |
| `/district/ibigo` | `GET /centers` | Y + retry | Client page of ≤100 | Y | N |
| `/district/ibigo/:id` | `GET /centers/:id` | Y + retry | N/A | Y | N |
| `/district/attendance` | monitoring + center-day roster | Y | Server drill | Y | N |
| `/district/imikurire` | monitoring + screenings/alerts | Y | Server screenings | Y | N |
| `/district/imirire` | monitoring feeding | Y | Client search | Y | N |
| `/district/sted` | monitoring sted | Y | Client search | Y | N |
| `/district/referrals` | monitoring + referral list | Y | Server | Y | N |
| `/district/gukurikirana` | follow-up alerts | Y | limit 100 | Y | N |
| `/district/raporo` | monitoring + reports | Y | N/A | Y | N |
| `/district/ikarita` | centers directory | Y + retry | ≤100 | Y | N |
| `/district/igenamiterere` | none (read-only LIVE) | N/A | N/A | Y | N |

---

## Conditions before production deployment

1. Build/deploy with `VITE_API_MODE=live` and a real non-localhost `VITE_API_BASE_URL`.
2. Execute the manual smoke checklist against the target API/environment.
3. Confirm district center counts are typically ≤100 **or** accept truncated centers/GIS/monitoring tables until a follow-up pagination sprint.
4. Accept residual LIVE product gaps (exports, alert mutations, some dashboard/center widgets, GIS ArcGIS integration) as **honest unavailable**, not defects to fake.
5. Accept JWT-in-localStorage residual risk under existing XSS controls / CSP posture.
6. Do not treat frontend route guards as the security boundary.

If any condition cannot be met, do **not** promote to production.

---

## Decision gate

District architecture can be considered **stable enough to freeze** for the next phase **with the conditions above**.

Recommended next work (do **not** start automatically):

1. Ops/prod env + manual smoke sign-off  
2. Centers/monitoring pagination beyond 100 (if large districts)  
3. Auth `/me` district name enrichment  
4. Only then: NCDA Admin / GIS / exports / alert mutations as separate sprints

**STOP after Sprint 5.4.** Do not start Sprint 5.5 / NCDA / GIS feature work from this report alone.

---

## SPRINT 5.4 STATUS

```text
SPRINT 5.4 STATUS

Verdict:
DISTRICT PRODUCTION READY WITH CONDITIONS

Production readiness audit:
COMPLETE

P0 blockers:
0 remaining (2 fixed: DataProvider district hydration; referrals route/nav)

P1 risks:
Centers/monitoring/GIS pageSize:100 truncation; JWT in localStorage; /auth/me lacks districtName; prod env must be set correctly; manual API smoke still required

P2 improvements:
Exports, alert mutations, dashboard widget gaps, URL filter persistence, nutrition alert pagination, repo-wide lint debt, bundle splitting, observability

District LIVE uses caregiver LocalStore for primary data:
NO

District LIVE uses useData() for primary data:
NO

District LIVE uses caregiver DataProvider:
NO

Mock leakage in LIVE:
NO

Unbounded District LIVE queries:
NO

Server-side pagination:
READY

Server-side filtering:
READY

Authorization/scoping:
READY

Error/loading/empty states:
READY

React Query/cache architecture:
READY

Routing/deep links:
READY

Security:
READY WITH CONDITIONS

Production configuration:
READY WITH CONDITIONS

Responsive readiness:
READY WITH CONDITIONS

Accessibility baseline:
READY WITH CONDITIONS

Observability:
READY WITH CONDITIONS

Backend changed:
NO

OpenAPI changed:
NO

Prisma migration:
NO

Caregiver offline architecture changed:
NO

Backend tests:
N/A (no backend changes)

Frontend tests:
154/154 PASS

Build:
PASS

Lint:
PASS (touched files); repo-wide has pre-existing debt

Type-check:
PASS (via tsc -b in build)

Production smoke test:
PARTIAL (automated contracts PASS; live API checklist manual)

Recommended next sprint:
Production env + manual smoke sign-off; then optional pagination/auth enrichment hardening — not NCDA/GIS/feature expansion
```
