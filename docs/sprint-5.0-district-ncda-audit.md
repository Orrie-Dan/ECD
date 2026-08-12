# Sprint 5.0 — District & NCDA Admin Portal Audit

**Date:** 2026-08-11
**Sprint:** 5.0 — Audit + Architecture
**Author:** Principal Frontend Engineer / Product Architect

---

## 1. Executive Verdict

The ECD platform has a **partially functional District portal** and **no NCDA Admin portal**. The caregiver offline-first architecture (Sprint 4.0–4.9) is mature and should not be reopened.

### District Portal: PARTIALLY FUNCTIONAL

The District portal has 12 routes, a dedicated layout with sidebar navigation, and pages for dashboard, children, centers, monitoring (attendance/growth/feeding/STED/referrals), GIS, reporting, follow-up alerts, and settings. However:

- **Dashboard and all monitoring pages operate in a DUAL-MODE architecture** — MOCK mode shows realistic fake data from `src/lib/mock-data.ts`; LIVE mode calls `GET /api/v1/monitoring/*` and `GET /api/v1/reports/*` APIs.
- **LIVE mode works for core KPIs** (dashboard, attendance monitoring, nutrition monitoring) but shows `null`/"—" for registration/dropout counts (no backend endpoint).
- **Follow-up/alerts page is 100% MOCK-only** — shows `LiveUnavailableState` in LIVE mode.
- **Settings page is MOCK-only** — saves are mocked with `setTimeout`; LIVE mode shows "unavailable" banner.
- **Reports/exports are MOCK-only** — export buttons show toast messages, no actual file generation.
- **GIS page uses ArcGIS JS SDK** with a real map but MOCK center data.
- **No user management, no WASH, no compliance, no audit logs** in the UI.

### NCDA Admin Portal: DOES NOT EXIST

- The backend role `ncda_admin` exists in the OpenAPI spec.
- The frontend maps `ncda_admin → districtOfficer` in `src/api/roles.ts`, so an NCDA admin user lands in the District portal with zero differentiation.
- There is no `/admin` or `/ncda` route, no admin layout, no admin pages.
- The backend has endpoints for users, compliance, WASH, audit-logs, settings, and admin-units that have **zero frontend consumption**.

### Decision

**Start with District hardening first** (Sprint 5.1–5.4), then build NCDA Admin portal (Sprint 5.5–5.8). The backend already supports most District and many NCDA capabilities — the gap is almost entirely frontend.

---

## 2. Current Architecture

### Source Structure

```
src/
├── api/
│   ├── auth/           — ApiAuthProvider, token management
│   ├── client.ts       — Axios custom instance
│   ├── generated/      — Orval-generated endpoints + models (from openapi.json)
│   │   ├── endpoints/  — alerts, analytics, attendance, audit-logs, auth, centers,
│   │   │                  children, compliance, devices, feeding, geo, monitoring,
│   │   │                  nutrition, referrals, reports, settings, sted, sync,
│   │   │                  transfers, users, wash
│   │   └── models/     — ~245 TypeScript interfaces/types
│   ├── interceptors.ts — JWT refresh interceptor
│   ├── mappers/        — auth.mapper.ts
│   ├── providers/      — ApiProviders, ApiErrorBridge
│   ├── query-client.ts — React Query client
│   ├── query-keys.ts   — Centralized query key factory
│   ├── resources/      — Domain-specific API wrappers (auth, children, attendance,
│   │                      growth, nutrition, feeding, sted, referrals, monitoring,
│   │                      reporting, centers)
│   ├── roles.ts        — Backend ↔ UI role mapping
│   └── token-storage.ts
├── components/
│   ├── auth/           — LoginForm, RoleSelector, GovernmentHeader, InputField
│   ├── attendance/     — AttendanceDialog, AttendanceSummaryCards, AttendanceHistoryTable
│   ├── charts/         — Recharts wrappers (EnhancedLineChart, ChartPeriodFilter)
│   ├── children/       — ChildFormWizard, ChildPicker, AcceptTransferDialog
│   ├── district/       — District-specific components
│   │   ├── AlertsPanel, AttendanceOverview, CenterPerformanceSummary
│   │   ├── DashboardFilterSummary, DashboardTrendCharts, RecentActivityFeed
│   │   ├── TrendBadge
│   │   ├── children/   — ChildrenSummaryCards, ChildrenTableSection, etc.
│   │   ├── gis/        — MapContainer, MapCenterPanel, MapFilterPanel, DistrictMapView
│   │   ├── growth/     — GrowthSummaryCards, GrowthCenterTable, NutritionStatusBreakdown
│   │   └── schools/    — SchoolsTable, SchoolsAttentionPanel, SchoolQuickPreview
│   ├── growth/         — MeasurementDialog, ChildGrowthHistorySection
│   ├── offline/        — SyncStatusIndicator, LogoutPendingModal, etc.
│   ├── reports/        — ReportPreviewModal
│   └── ui/             — ~30 shared UI components (Button, Card, Modal, Table, etc.)
├── config/             — env.ts (VITE_API_MODE: mock|live)
├── contexts/           — AppContext (AuthProvider + DataProvider)
├── features/
│   ├── attendance/     — repository, mutations, local-attendance, seed-from-rest
│   ├── auth/           — mutations, queries
│   ├── children/       — repository, mutations, local-children
│   ├── device/         — device registration
│   ├── feeding/        — repository, mutations, seed-from-rest
│   ├── growth/         — repository
│   ├── monitoring/     — repository, queries, mock-bridge, mappers, models
│   ├── nutrition/      — repository
│   ├── referrals/      — repository, mutations, seed-from-rest, builders
│   ├── reporting/      — repository, queries, mock-bridge, mappers, models
│   └── sted/           — repository, local-sted, seed-from-rest
├── hooks/              — usePagination, useDebounce
├── layouts/
│   ├── CaretakerLayout.tsx  — Mobile-first, bottom nav + sidebar
│   └── DistrictLayout.tsx   — Desktop-first, full sidebar + collapsed sidebar
├── lib/                — Mock data, utilities, Rwanda admin divisions
├── locales/rw/         — Kinyarwanda translations (auth, common, caretaker, district)
├── models/             — View model types (auth, monitoring, reporting)
├── network/            — Network state detection
├── offline/            — OfflineRuntimeProvider, logout-policy, mutation-error-message
├── pages/
│   ├── caretaker/      — 15 pages (Dashboard, Register, Attendance, Growth, etc.)
│   ├── district/       — 12 pages (Dashboard, Centers, Children, Monitoring, etc.)
│   ├── LoginPage.tsx
│   └── RoleSelectionPage.tsx
├── storage/            — Dexie LocalStore, user isolation, ownership
├── sync/               — SyncEngine, apply-local, acknowledge-conflicts
└── types/              — Core domain types
```

### Tech Stack

| Concern | Technology |
|---------|-----------|
| Framework | React 19.1 + TypeScript 5.8 |
| Build | Vite 8 + Rolldown |
| Routing | React Router 7 |
| State/Server | React Query (TanStack Query) 5 |
| API Codegen | Orval 7.13 from OpenAPI 3 |
| Offline Store | Dexie 4 (IndexedDB) |
| Styling | Tailwind CSS 4 |
| Charts | Recharts 2.15 |
| Maps | ArcGIS JS SDK 4.32 (@arcgis/core) |
| PWA | vite-plugin-pwa 1.3 (Workbox) |
| Testing | Vitest 4.1 + fake-indexeddb |
| Icons | Lucide React |

---

## 3. Role Matrix

### Backend Roles (from OpenAPI `UserRole` enum)

| Backend Role | OpenAPI | Frontend UI Role | Login Path | Home Route |
|---|---|---|---|---|
| `caregiver` | Yes | `caretaker` | `/login/caretaker` | `/caretaker` |
| `district_focal_person` | Yes | `districtOfficer` | `/login/district` | `/district` |
| `ncda_admin` | Yes | `districtOfficer` ⚠️ | `/login/district` ⚠️ | `/district` ⚠️ |

**Critical Finding:** `ncda_admin` is collapsed to `districtOfficer` in `src/api/roles.ts:22`. An NCDA admin user sees the exact same District portal with no differentiation. There is no separate login path, no admin layout, no admin routes, no admin-specific navigation.

### Frontend Role Type

```typescript
// src/types/index.ts:1
export type UserRole = 'caretaker' | 'districtOfficer'
```

Only two UI roles exist. The `ncda_admin` backend role has no frontend representation.

### Route Guards

`ProtectedRoute` (`src/components/ProtectedRoute.tsx`) checks `allowedRole` against the user's UI role via `hasRole()`. All district routes require `allowedRole="districtOfficer"`. Since `ncda_admin` maps to `districtOfficer`, NCDA admins can access district routes but have no admin-specific routes.

### Role Capability Matrix

| Capability | Caregiver | District Officer | NCDA Admin |
|---|---|---|---|
| **Route** | `/caretaker/*` | `/district/*` | `/district/*` ⚠️ (same) |
| **Layout** | CaretakerLayout | DistrictLayout | DistrictLayout ⚠️ |
| **Dashboard** | ✅ Center-level | ✅ District-level | ❌ No national view |
| **Children: View** | ✅ Own center | ✅ All district | ✅ (via district) |
| **Children: Create** | ✅ | ❌ | ❌ |
| **Children: Edit** | ✅ | ❌ | ❌ |
| **Attendance: Record** | ✅ | ❌ | ❌ |
| **Attendance: Monitor** | ❌ | ✅ | ✅ (via district) |
| **Growth: Record** | ✅ | ❌ | ❌ |
| **Growth: Monitor** | ❌ | ✅ | ✅ (via district) |
| **Centers: List** | ❌ | ✅ | ✅ (via district) |
| **Centers: Detail** | ❌ | ✅ | ✅ (via district) |
| **Reports** | ✅ Attendance only | ✅ Multiple | ✅ (via district) |
| **GIS** | ❌ | ✅ | ✅ (via district) |
| **Alerts** | ❌ | ✅ MOCK-only | ❌ |
| **User Management** | ❌ | ❌ | ❌ |
| **Configuration** | ❌ | MOCK-only settings | ❌ |
| **Audit Logs** | ❌ | ❌ | ❌ |
| **Compliance** | ❌ | ❌ | ❌ |
| **WASH** | ❌ | ❌ | ❌ |
| **Offline** | ✅ Full | ❌ (online-only banner) | ❌ |

---

## 4. Route Inventory

### Caregiver Routes (15 routes, all behind `ProtectedRoute allowedRole="caretaker"`)

| Route | Page | Status |
|---|---|---|
| `/caretaker` | DashboardPage | ✅ LIVE |
| `/caretaker/kwiyandikisha` | RegisterChildPage | ✅ LIVE |
| `/caretaker/ubwitabire` | AttendancePage | ✅ LIVE |
| `/caretaker/imikurire` | GrowthPage | ✅ LIVE |
| `/caretaker/imikurire/ukwezi` | MonthlyGrowthRosterPage | ✅ LIVE |
| `/caretaker/imirire` | ImirirePage | ✅ LIVE |
| `/caretaker/imirire/raporo` | ImirireMonthlyPage | ✅ LIVE |
| `/caretaker/sted` | StedPage | ✅ LIVE |
| `/caretaker/sted/new` | StedWizardPage | ✅ LIVE |
| `/caretaker/sted/amateka` | StedHistoryPage | ✅ LIVE |
| `/caretaker/abana` | ChildrenListPage | ✅ LIVE |
| `/caretaker/abana/:id` | ChildDetailPage | ✅ LIVE |
| `/caretaker/abana/:id/hindura` | EditChildPage | ✅ LIVE |
| `/caretaker/raporo` | AttendanceReportPage | ✅ LIVE |
| `/caretaker/ibindi` | MorePage | ✅ LIVE |
| `/caretaker/igenamiterere` | SettingsPage | ✅ LIVE |

### District Routes (12 routes, all behind `ProtectedRoute allowedRole="districtOfficer"`)

| Route | Page | LIVE Status |
|---|---|---|
| `/district` | DistrictDashboardPage | ⚡ HYBRID (core KPIs LIVE, registrations/dropouts null) |
| `/district/ibigo` | CentersPage | ⚡ HYBRID (LIVE list + MOCK enrichment) |
| `/district/ibigo/:id` | CenterDetailPage | ⚡ HYBRID |
| `/district/abana` | DistrictChildrenPage | ⚡ HYBRID |
| `/district/abana/:id` | DistrictChildDetailPage | ⚡ HYBRID |
| `/district/attendance` | DistrictAttendancePage | ⚡ HYBRID |
| `/district/imikurire` | GrowthMonitoringPage | ⚡ HYBRID |
| `/district/imirire` | FeedingMonitoringPage | ⚡ HYBRID |
| `/district/sted` | StedMonitoringPage | ⚡ HYBRID |
| `/district/raporo` | DistrictReportsPage | ⚡ HYBRID (attendance LIVE, other reports LIVE queries, export MOCK) |
| `/district/ikarita` | GisAnalyticsPage | 🔶 MOCK (ArcGIS map real, center data MOCK) |
| `/district/gukurikirana` | GukurikiranaPage | ❌ MOCK-ONLY (LiveUnavailableState in LIVE) |
| `/district/igenamiterere` | DistrictSettingsPage | ❌ MOCK-ONLY |

### Unrouted District Pages

Two district page files exist but are **not wired into `App.tsx` routes**:

| File | Export | Status |
|---|---|---|
| `src/pages/district/ReferralMonitoringPage.tsx` | `ReferralMonitoringPage` | **Not routed** — has full LIVE+MOCK implementation |
| `src/pages/caretaker/ReferralsPage.tsx` | `ReferralsPage` | **Not routed** |
| `src/pages/caretaker/TransfersPage.tsx` | `TransfersPage` | **Not routed** |

### NCDA Admin Routes: NONE

No `/admin/*` or `/ncda/*` routes exist.

---

## 5. District Portal Audit

### 5.1 District Dashboard

**File:** `src/pages/district/DashboardPage.tsx`

**Data Source:** `useDashboardMonitoring()` from `src/features/monitoring/repository.ts`

| Widget | MOCK | LIVE | Notes |
|---|---|---|---|
| ECD Centers count | ✅ | ✅ | From `dashboard.centersInScope` |
| Total Children | ✅ | ✅ | From `dashboard.children.active` |
| Present Today | ✅ | ✅ | From `dashboard.attendance.present` |
| Attendance Rate | ✅ | ✅ | From `dashboard.attendance.rate` |
| New Registrations | ✅ (mock stat) | ❌ Shows "—" | `newRegistrations: null` in LIVE — **no backend endpoint** |
| Dropouts | ✅ (mock stat) | ❌ Shows "—" | `dropouts: null` in LIVE — **no backend endpoint** |
| Growth Coverage | ✅ | ✅ | From nutrition monitoring API |
| Growth Overdue | ✅ | ✅ | From nutrition monitoring API |
| Growth At Risk | ✅ | ✅ | From nutrition/dashboard API |
| Alerts Panel | ✅ (mock alerts) | ⚠️ | Uses `AlertsPanel` — calls alerts API in LIVE |
| Recent Activity Feed | ✅ (mock activity) | ⚠️ | Uses `RecentActivityFeed` — likely mock |
| Center Performance | ✅ (mock rankings) | ⚠️ | Uses `CenterPerformanceSummary` — likely mock |
| Attendance Overview | ✅ | ⚡ HYBRID | `AttendanceOverview` component |
| Trend Charts | ✅ (mock trends) | ⚡ HYBRID | `DashboardTrendCharts` — Recharts with period filter |

**Period Filtering:** ChartPeriodFilter supports today/week/month/year/custom month selection.

**Loading State:** SkeletonPage shown while loading.

**Error State:** No explicit error display — `isLoading || !dashboard` shows skeleton indefinitely on error.

**Empty State:** No explicit empty state handling.

**Verdict:** Dashboard is **functional in LIVE for core metrics** but has gaps (registrations, dropouts show "—") and several widgets may fall back to mock data for alerts/activity/rankings.

### 5.2 District Centers

**File:** `src/pages/district/CentersPage.tsx`

| Capability | Status |
|---|---|
| List centers | ✅ (uses `useData().children` to derive center list, or centers API) |
| Search centers | ✅ (client-side text search) |
| Filter by sector | ⚡ MOCK sectors from `ECD_CENTERS` |
| View enrollment per center | ✅ |
| View attendance per center | ✅ |
| Navigate to center detail | ✅ (`/district/ibigo/:id`) |
| See staffing | ❌ |
| See compliance | ❌ |
| See WASH | ❌ |

**Center Detail Page** (`src/pages/district/CenterDetailPage.tsx`):
- Shows center info, enrolled children, attendance stats
- Links to individual children
- No compliance, WASH, staffing, or feeding data

### 5.3 District Children

**File:** `src/pages/district/ChildrenPage.tsx`

| Capability | Status |
|---|---|
| List all district children | ✅ (via `useData().children`) |
| Search by name | ✅ (debounced client-side) |
| Filter by center | ✅ |
| Filter by status | ✅ (active/archived/transferred) |
| Filter by period (enrollment date) | ✅ |
| Filter by village | ❌ |
| Pagination | ✅ (client-side `usePagination`) |
| Navigate to child detail | ✅ (`/district/abana/:id`) |

**Child Detail Page** (`src/pages/district/DistrictChildDetailPage.tsx`):
- Shows child profile, guardian info, attendance, growth, nutrition, referrals, STED
- Read-only (no edit capability for district users)
- All data via `useData()` context

**Critical Architecture Concern:** District children page uses `useData()` which loads **all children into memory** via the caregiver data context. For a district with thousands of children, this will not scale. District should use server-side paginated queries (`GET /api/v1/children` with pagination), not the caregiver's local-first data context.

### 5.4 District Monitoring

Each monitoring page follows the same pattern: `src/features/monitoring/repository.ts` provides a hook that returns LIVE API data in LIVE mode and computed mock data in MOCK mode.

**Attendance Monitoring** (`src/pages/district/AttendanceMonitoringPage.tsx`):
- Daily attendance by center
- Center-level drill-down
- Date selection
- LIVE: calls `GET /api/v1/monitoring/attendance`
- Loading/skeleton states ✅

**Growth Monitoring** (`src/pages/district/GrowthMonitoringPage.tsx`):
- Nutrition screening coverage, status breakdown
- Center comparison table
- LIVE: calls `GET /api/v1/monitoring/nutrition`
- Charts: nutrition status pie/bar

**Feeding Monitoring** (`src/pages/district/FeedingMonitoringPage.tsx`):
- Monthly feeding data per center
- Milk/porridge/balanced meal tracking
- LIVE: calls `GET /api/v1/monitoring/feeding`

**STED Monitoring** (`src/pages/district/StedMonitoringPage.tsx`):
- Developmental assessment coverage
- Center comparison
- LIVE: calls `GET /api/v1/monitoring/sted`

**Referral Monitoring** (accessed via `GukurikiranaPage.tsx` or separate page):
- Uses `GET /api/v1/monitoring/referrals` in LIVE
- Follow-up alerts page is MOCK-ONLY with `ACTION_ALERTS` from mock-data

### 5.5 District GIS

**File:** `src/components/district/gis/DistrictMapView.tsx`

| Aspect | Status |
|---|---|
| Map Library | ArcGIS JS SDK 4.32 (`@arcgis/core`) |
| Base Map | ArcGIS basemap (topographic/streets) |
| Center Markers | ✅ from `ECD_CENTERS` mock data ⚠️ |
| District Boundaries | ❌ Not implemented |
| Sector/Cell/Village | ❌ Not implemented |
| Child Density | ❌ Not implemented |
| Performance Indicators | ❌ Not on map |
| Clustering | ❌ Not implemented |
| Filter Panel | ✅ `MapFilterPanel` with sector/status filters |
| Center Info Panel | ✅ `MapCenterPanel` on click |
| LIVE Data | ❌ Centers are from mock `ECD_CENTERS` |
| Loading State | ✅ Map loading indicator |
| Error State | Basic error handling |

**Verdict:** GIS has a working ArcGIS map container with mock center points. Center locations are hardcoded from `ECD_CENTERS`. No geographic data from the backend is consumed by the map. **However, the backend `CenterDetailResponseDto` includes `latitude` and `longitude` fields** — so real center coordinates exist in the database and can be consumed via `GET /api/v1/centers`.

**Note:** Despite `@arcgis/core` being referenced in layouts/components, it is **not listed in `package.json` dependencies** — the ArcGIS SDK may be loaded via CDN or the map is currently a placeholder div without actual rendering.

### 5.6 District Reporting

**File:** `src/pages/district/ReportsPage.tsx`

| Report Type | Backend API | Frontend | Status |
|---|---|---|---|
| Attendance | `GET /api/v1/monitoring/attendance` | ✅ | ⚡ LIVE KPIs, MOCK export |
| Enrollment | `GET /api/v1/reports/enrollment` | ✅ | ⚡ LIVE data, MOCK export |
| Dropouts | `GET /api/v1/reports/dropouts` | ✅ | ⚡ LIVE data, MOCK export |
| Centers | `GET /api/v1/reports/centers` | ✅ | ⚡ LIVE data, MOCK export |
| Sectors | None | ✅ UI | ❌ "No endpoint" warning shown |
| Nutrition Coverage | `GET /api/v1/monitoring/nutrition` | ✅ | ⚡ LIVE data, MOCK export |
| Nutrition Status | `GET /api/v1/monitoring/nutrition` | ✅ | ⚡ LIVE data, MOCK export |
| Nutrition Centers | `GET /api/v1/monitoring/nutrition` | ✅ | ⚡ LIVE data, MOCK export |
| Nutrition Trends | `GET /api/v1/monitoring/nutrition` | ✅ | ⚡ LIVE data, MOCK export |

**Export Capabilities:**
- Preview modal (`ReportPreviewModal`) shows summary + table preview
- PDF/Excel export buttons exist but are MOCK-ONLY (show toast, no file generated)
- In LIVE mode: export buttons are disabled with "unavailable" message

**Date Filtering:** ✅ Date range picker, today/yesterday shortcuts
**Search:** ✅ Center name search
**Sector Filter:** ⚠️ Disabled in LIVE mode (sectors come from mock data)
**Pagination:** ✅ Client-side pagination on comparison table

### 5.7 District Follow-Up / Alerts (Gukurikirana)

**File:** `src/pages/district/GukurikiranaPage.tsx`

**Status: 100% MOCK-ONLY**

- Uses `ACTION_ALERTS` directly from `src/lib/mock-data.ts`
- LIVE mode shows `LiveUnavailableState` component — blank page with "unavailable" message
- No API integration whatsoever
- Alert categories: attendance, enrollment, nutrition, data quality, operational
- Filterable by category via `SegmentedTabs`

**Backend API:** `GET /api/v1/alerts/follow-up` exists in OpenAPI — **not consumed by frontend**.

### 5.8 District Settings

**File:** `src/pages/district/SettingsPage.tsx`

**Status: 100% MOCK-ONLY**

- Displays district info (name, role, app version, language)
- Profile form with name, attendance threshold, late cutoff time
- Save is mocked with `setTimeout` — no backend write
- LIVE mode: shows `LiveUnavailableState`, save button disabled
- Backend `GET/PATCH /api/v1/settings` exists — **not consumed**

---

## 6. NCDA Admin Portal Audit

### 6.1 Administration

| Capability | Backend API | Frontend UI | Workflow |
|---|---|---|---|
| List users | `GET /api/v1/users` (paginated, filterable) | ❌ No page | ❌ |
| Create user | `POST /api/v1/users` (returns temporaryPassword) | ❌ No page | ❌ |
| View user | `GET /api/v1/users/:id` | ❌ No page | ❌ |
| Update user | `PATCH /api/v1/users/:id` | ❌ No page | ❌ |
| Reset password | `POST /api/v1/users/:id/reset-password` | ❌ No page | ❌ |
| Role assignment | In CreateUserDto (role field) | ❌ | ❌ |
| District assignment | In CreateUserDto (districtId field) | ❌ | ❌ |
| Center assignment | In CreateUserDto (centerId field) | ❌ | ❌ |
| User status (activate/deactivate) | In UpdateUserDto (status field) | ❌ | ❌ |

**Generated hooks exist** (`useUsersControllerCreate`, `useUsersControllerFindAll`, etc.) but are **never imported or used** by any page or component.

### 6.2 Geography / Organization

| Capability | Backend API | Frontend | Status |
|---|---|---|---|
| List districts | `GET /api/v1/districts` (paginated) | ❌ No page | Generated hooks unused |
| List admin units | `GET /api/v1/admin-units` (sectors/cells/villages) | ✅ Used by child registration wizard | Consumed only by caregiver forms |
| List centers | `GET /api/v1/centers` (paginated, filterable) | ✅ District centers page | LIVE for basic list |
| Create center | ❌ No endpoint | ❌ | ❌ |
| Update center | ❌ No endpoint | ❌ | ❌ |

### 6.3 ECD Configuration

| Aspect | Status |
|---|---|
| ECD standards | ❌ Hardcoded in frontend (`src/lib/`) |
| Assessment definitions | ❌ Hardcoded MUAC thresholds |
| Nutrition classifications | ❌ Hardcoded in `src/lib/nutrition-utils.ts` |
| STED milestones | ❌ Hardcoded in locales/components |
| Referral configuration | ❌ Hardcoded auto-referral rules |
| WASH indicators | Backend exists, frontend ❌ |
| Compliance rules | Backend exists, frontend ❌ |
| Feeding configuration | ❌ Hardcoded |
| Age bands | ❌ Hardcoded `1_3` and `4_6` |
| Reference data | ❌ Hardcoded |

**Verdict:** All ECD standards and configuration are hardcoded in the frontend. The backend has `GET /api/v1/settings` and `GET /api/v1/compliance/*` endpoints, but no admin UI exists to manage these.

### 6.4 NCDA National Dashboard

**Does not exist.** No national-level aggregation, no district comparison, no cross-district analytics.

### 6.5 Data Quality & Governance

| Capability | Backend API | Frontend |
|---|---|---|
| Audit logs | `GET /api/v1/audit-logs` (paginated) | ❌ No page |
| Device activity | `GET /api/v1/devices` (paginated) | ❌ No page |
| Sync sessions | `GET /api/v1/sync/sessions` | ❌ No page |
| Failed sync operations | `GET /api/v1/sync/operations` | ❌ No page |
| Compliance assessments | `GET /api/v1/compliance/assessments` | ❌ No page |
| Compliance gaps | `GET /api/v1/compliance/gaps` | ❌ No page |
| WASH assessments | `GET /api/v1/wash/assessments` | ❌ No page |
| WASH summary | `GET /api/v1/wash/summary` | ❌ No page |

---

## 7. Backend ↔ Frontend Capability Matrix

| Domain | Backend Endpoint(s) | Orval Hooks | Frontend Route | Frontend API Usage | UI Workflow | Status |
|---|---|---|---|---|---|---|
| **Auth** | login, refresh, me, password-reset | ✅ | `/login/:role` | ✅ | ✅ Login + session | **COMPLETE** |
| **Children** | CRUD, list (paginated) | ✅ | Both portals | ✅ (caregiver local-first) | ✅ | **COMPLETE** (caregiver); District uses DataContext ⚠️ |
| **Attendance** | CRUD, batch, list | ✅ | Both portals | ✅ (caregiver local-first) | ✅ | **COMPLETE** (caregiver) |
| **Nutrition/Growth** | CRUD, list | ✅ | Both portals | ✅ (caregiver local-first) | ✅ | **COMPLETE** (caregiver) |
| **Feeding** | CRUD, list, month-summary | ✅ | Both portals | ✅ (caregiver local-first) | ✅ | **COMPLETE** (caregiver) |
| **STED** | CRUD, list | ✅ | Both portals | ✅ (caregiver local-first) | ✅ | **COMPLETE** (caregiver) |
| **Referrals** | CRUD, list | ✅ | Both portals | ✅ (caregiver local-first) | ✅ | **COMPLETE** (caregiver) |
| **Transfers** | create, list, accept | ✅ | Caregiver | ✅ (caregiver REST) | ✅ | **COMPLETE** (caregiver) |
| **Centers** | list (paginated), detail | ✅ | District | ⚡ Partial | ⚡ List+detail | **PARTIAL** |
| **Districts** | list (paginated) | ✅ | ❌ | ❌ | ❌ | **MISSING** frontend |
| **Admin Units** | list (filtered by level) | ✅ | Caregiver forms | ✅ | ✅ Location picker | **COMPLETE** (caregiver) |
| **Monitoring** | dashboard, attendance, nutrition, feeding, sted, referrals | ✅ | District monitoring pages | ✅ | ⚡ HYBRID | **PARTIAL** — LIVE KPIs work, some gaps |
| **Reports** | enrollment, dropouts, centers, district | ✅ | District reports | ✅ | ⚡ HYBRID (no export) | **PARTIAL** |
| **Analytics** | district-kpis | ✅ | ❌ | ❌ | ❌ | **MISSING** frontend |
| **Alerts** | follow-up (list, create, update, dismiss) | ✅ | District (Gukurikirana) | ❌ MOCK-ONLY | ❌ Uses mock data | **MOCK-ONLY** |
| **Users** | CRUD, reset-password | ✅ | ❌ | ❌ | ❌ | **MISSING** frontend |
| **Compliance** | assessments CRUD, gaps, standards | ✅ | ❌ | ❌ | ❌ | **MISSING** frontend |
| **WASH** | assessments CRUD, summary | ✅ | ❌ | ❌ | ❌ | **MISSING** frontend |
| **Audit Logs** | list (paginated) | ✅ | ❌ | ❌ | ❌ | **MISSING** frontend |
| **Settings** | get, patch | ✅ | District (MOCK-only) | ❌ | ❌ | **MOCK-ONLY** |
| **Devices** | list, register, update | ✅ | ❌ (registration used internally) | Internal only | ❌ Admin view | **MISSING** admin view |
| **Sync** | pull, push, sessions, operations | ✅ | ❌ | Internal sync engine | ❌ Admin view | **MISSING** admin view |
| **Geo** | districts, admin-units, district boundaries | ✅ | ❌ for GIS | ❌ GIS uses mock | ❌ | **MISSING** GIS integration |

---

## 8. LIVE vs MOCK Leakage Report

### CRITICAL — Fake data shown in production paths

| File | Feature | Screen | Behavior | Severity |
|---|---|---|---|---|
| `src/pages/district/GukurikiranaPage.tsx:10,27` | Follow-up alerts | Gukurikirana | `ACTION_ALERTS` from mock-data used directly; LIVE shows blank `LiveUnavailableState` | **CRITICAL** — core workflow missing |
| `src/pages/district/CenterDetailPage.tsx:50,256` | Center alerts | Center Detail | `ACTION_ALERTS.filter(a => a.centerId === id)` used **unconditionally** — fake alerts in both MOCK and LIVE | **CRITICAL** — fake data in production |
| `src/pages/district/SettingsPage.tsx:12,34` | Settings | Settings | `ATTENDANCE_THRESHOLD` from mock-data; save is `setTimeout` mock | **HIGH** — settings not functional |
| `src/pages/district/ReportsPage.tsx:34,215-222` | Export | Reports | `handleMockExport` shows toast; no actual file generation | **HIGH** — export not functional |
| `src/components/district/gis/DistrictMapView.tsx` | GIS centers | GIS Map | Center locations from `ECD_CENTERS` mock data | **HIGH** — map shows fake locations |
| `src/pages/district/ReportsPage.tsx:143-145` | Sector filter | Reports | Sectors from `ECD_CENTERS`; disabled in LIVE | **MEDIUM** |
| `src/features/monitoring/utils/mock-bridge.ts` | All monitoring | All monitoring pages | Complete mock computation layer; properly gated by `env.isMock` | **LOW** — correctly segregated |
| `src/features/reporting/utils/mock-bridge.ts` | All reporting | Reports page | Complete mock computation layer; properly gated | **LOW** — correctly segregated |
| `src/contexts/AppContext.tsx:176-195` | Auth | Login | `DEMO_USERS`, `DEMO_CREDENTIALS` for MOCK mode | **LOW** — correctly gated |

### MOCK Leakage Architecture Assessment

The monitoring and reporting feature modules use a **well-designed dual-mode pattern**: `env.isLive` branches to API queries, `env.isMock` branches to local computation from mock data. This is architecturally sound — LIVE mode correctly calls real APIs. The main issue is that some pages (GukurikiranaPage, SettingsPage) bypass this pattern entirely and use mock data directly.

---

## 9. UX Audit

### 9.1 Navigation

**District Layout** (`src/layouts/DistrictLayout.tsx`):
- Desktop: full sidebar (w-64) with 7 nav items + logout
- Tablet: collapsed sidebar (w-16, icons only)
- Mobile: hamburger → NavDrawer + bottom nav (5 items)
- Active states: tinted style on sidebar links

**Navigation Items:**
1. Dashboard (`/district`)
2. Children (`/district/abana`)
3. Centers (`/district/ibigo`)
4. Follow-up (`/district/gukurikirana`)
5. Reports (`/district/raporo`)
6. GIS (`/district/ikarita`)
7. Settings (`/district/igenamiterere`)

**Missing from navigation:**
- No monitoring sub-pages in sidebar (attendance/growth/feeding/STED monitoring are orphaned — accessible only via dashboard "View Growth" button or direct URL)
- No user management
- No compliance/WASH
- No audit logs

### 9.2 Data Density

District pages appropriately use:
- ✅ StatCards for KPIs
- ✅ Tables with column headers for center/child lists
- ✅ Recharts for trend visualization
- ✅ Cards for report previews
- ❌ No comparison views (side-by-side district/center)
- ❌ No drill-down from chart elements
- ❌ No sortable table columns

### 9.3 Interaction Patterns

| Pattern | Status |
|---|---|
| Filters persist | ❌ Lost on navigation (state in `useState`, not URL) |
| URL query state | ❌ Not implemented for any district page |
| Pagination | ✅ Client-side via `usePagination` hook |
| Sorting | ❌ No column sorting on any table |
| Search | ✅ Text search on children/centers/reports |
| Bulk actions | ❌ Not available |
| Exports | ❌ MOCK-only |
| Deep links | ❌ No URL-based filter state |

### 9.4 States

| State | Dashboard | Centers | Children | Monitoring | Reports | GIS | Alerts |
|---|---|---|---|---|---|---|---|
| Loading | ✅ Skeleton | ✅ | ✅ | ✅ Skeleton | ✅ Skeleton | ✅ | N/A |
| Success | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (MOCK) |
| Empty | ❌ Generic | ✅ EmptyState | ✅ EmptyState | ⚠️ | ✅ EmptyState | ❌ | ❌ |
| Error | ❌ Shows skeleton | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| LIVE unavailable | ❌ | ❌ | ❌ | ❌ | ⚠️ Partial | ❌ | ✅ LiveUnavailableState |

**Major gap:** Error states are not handled on most district pages. API failures result in indefinite loading skeletons.

---

## 10. Localization Audit

**District locale file:** `src/locales/rw/district.ts`

| Section | Coverage | Issues |
|---|---|---|
| Navigation | ✅ Full Kinyarwanda | |
| Dashboard labels | ✅ | |
| Schools/Centers table | ✅ | "Schools" terminology in code (`schools/`) vs "Centers" in UI |
| Reports | ✅ Labels | English leakage in report preview: "Active", "New", "Archived", "Dropouts", "Transfers out", "Child", "Center", "Coverage", "Screenings", "Severe", "Overdue" |
| Growth monitoring | ✅ | |
| Settings | ✅ | |
| Follow-up | ✅ | |
| GIS | ⚠️ Partial | Some map UI strings likely from ArcGIS SDK (English-only) |

**English Leakage in District:**
- `src/pages/district/ReportsPage.tsx:257` — "No /reports/sectors endpoint" hardcoded English
- `src/pages/district/ReportsPage.tsx:273-274` — "Active", "New", "Archived" in report preview cards
- `src/pages/district/ReportsPage.tsx:286-287` — "Dropouts", "Transfers out"
- `src/features/reporting/utils/mock-bridge.ts:127-129` — "Archived children in period", "Mock dropout report"
- `src/features/reporting/utils/mock-bridge.ts:199` — "Coverage", "Screenings", "Severe", "Overdue"

---

## 11. Accessibility Audit

| Aspect | Status |
|---|---|
| Keyboard navigation | ⚠️ Basic — buttons/links focusable, no skip links |
| Focus states | ✅ `focus-visible` outlines on interactive elements |
| Semantic HTML | ⚠️ Mixed — some `<nav>` with `aria-label`, but tables lack `<caption>` |
| Color contrast | ✅ Tailwind theme appears to meet WCAG AA |
| Table accessibility | ⚠️ `data-label` attributes for responsive cards, no `<caption>` or `scope` |
| Charts | ❌ Recharts — no screen reader alternatives |
| Modal behavior | ✅ `ConfirmModal` has close/focus management |
| Responsive | ✅ Good responsive design across breakpoints |
| Mobile/tablet | ✅ Bottom nav, drawer, collapsed sidebar |

---

## 12. Performance Audit

| Concern | Finding | Risk |
|---|---|---|
| Bundle size | 1,702 KB (464 KB gzip) — single chunk | **HIGH** — no code splitting; monitoring pages load all caregiver code too |
| Dashboard query count | 2+ API calls (dashboard + nutrition) + DataContext loading all children | **MEDIUM** |
| `useData()` in district | Loads ALL children, ALL attendance, ALL growth into memory | **HIGH** — does not scale for districts with 1000+ children |
| Client-side pagination | `usePagination` paginates in-memory arrays | **HIGH** for large datasets |
| React Query stale times | Configured in `query-keys.ts` with reasonable intervals | ✅ |
| ArcGIS SDK | 4.32 — significant bundle weight | **MEDIUM** — loaded on GIS page only? Check lazy loading |
| Chart rendering | Recharts with reasonable data volumes | ✅ |

**Critical:** The DataProvider in `AppContext.tsx` is designed for caregiver (single center, ~50 children). District pages import `useData()` which triggers the caregiver's full data loading pipeline. This must be separated — district should query paginated REST endpoints directly.

---

## 13. Security / Authorization Audit

| Concern | Finding | Risk |
|---|---|---|
| Route guards | ✅ `ProtectedRoute` checks UI role | Low — backend enforces |
| Cross-district access | ⚠️ No frontend check for districtId scoping | Low — backend scopes queries |
| NCDA admin → district | ⚠️ `ncda_admin` mapped to `districtOfficer` — can access all district routes | **MEDIUM** — NCDA admin may see district-scoped data instead of national |
| Client-only auth | ❌ If someone modifies localStorage role, they see different UI but backend blocks API | Low — UX only |
| Hidden routes | No admin routes exist to protect | N/A |
| Unsafe IDs in routes | ✅ IDs are UUIDs; backend validates ownership | Low |

---

## 14. Prioritized Backlog

### P0 — Blocks safe/usable District operation

| # | Item | Rationale |
|---|---|---|
| P0.1 | **Separate District data from caregiver DataContext** | District pages use `useData()` which loads all children into memory — breaks at scale |
| P0.2 | **Error states on all district pages** | API failures show infinite skeleton — users can't distinguish loading from broken |
| P0.3 | **Connect alerts/follow-up to LIVE API** | Gukurikirana (follow-up) is the operational heart of district work — currently MOCK-only; `GET /api/v1/alerts/follow-up` exists |

### P1 — Major workflow missing or misleading

| # | Item | Rationale |
|---|---|---|
| P1.1 | **Wire GIS to real center locations** | Map shows fake positions from mock data |
| P1.2 | **Implement report export (PDF/Excel)** | Export buttons exist but do nothing in LIVE |
| P1.3 | **Expose monitoring sub-pages in navigation** | Attendance/growth/feeding/STED monitoring pages exist but aren't in sidebar — unreachable without direct URL |
| P1.4 | **Wire settings to backend** | `GET/PATCH /api/v1/settings` — replace mock save |
| P1.5 | **Add new registrations/dropouts to dashboard** | Shows "—" in LIVE — either add backend endpoint or compute from reports API |
| P1.6 | **Fix English leakage in report previews** | Mixed Kinyarwanda/English in production-facing reports |
| P1.7 | **NCDA Admin portal shell** — layout, navigation, routing, role guard | No admin experience exists at all |
| P1.8 | **User management pages** | Backend fully supports CRUD + password reset — zero frontend |

### P2 — Important improvement

| # | Item | Rationale |
|---|---|---|
| P2.1 | URL query state for district filters | Filters lost on navigation; can't share/bookmark filtered views |
| P2.2 | Server-side pagination for children list | Client-side pagination won't scale |
| P2.3 | Table column sorting | District analytical tables have no sort capability |
| P2.4 | Compliance assessment UI | Backend supports it, district needs it |
| P2.5 | WASH assessment UI | Backend supports it, important for center quality |
| P2.6 | Audit log viewer | Backend logs actions — NCDA needs visibility |
| P2.7 | Device/sync admin view | NCDA needs to see sync health across devices |
| P2.8 | National dashboard for NCDA | Cross-district aggregation + comparison |
| P2.9 | Code splitting | 1.7 MB single bundle — split by route/role |

### P3 — Polish / optimization

| # | Item | Rationale |
|---|---|---|
| P3.1 | Chart accessibility (screen reader alternatives) | WCAG compliance for charts |
| P3.2 | Skip links for keyboard navigation | Accessibility polish |
| P3.3 | Table `<caption>` and `scope` attributes | Semantic HTML tables |
| P3.4 | Center create/edit UI | No backend endpoint yet |
| P3.5 | District boundary layers on GIS map | Geographic context |
| P3.6 | Sector-level reporting | No backend endpoint for sector rollup |

---

## 15. Sprint 5.x Roadmap

### Sprint 5.0 — Audit + Architecture ← THIS SPRINT

- ✅ Comprehensive audit
- ✅ Role matrix
- ✅ Capability matrix
- ✅ MOCK leakage report
- ✅ Prioritized backlog
- ✅ Roadmap

### Sprint 5.1 — District Data Architecture + Critical Fixes

**Goal:** Make the District portal safe to use at scale with real data.

- [ ] P0.1 — Create district-specific data hooks that use paginated REST APIs instead of `useData()` for children, attendance, etc.
- [ ] P0.2 — Add error state handling to all district pages
- [ ] P1.3 — Add monitoring sub-pages to district sidebar navigation
- [ ] P1.5 — Surface new registrations/dropouts (from reports API or new analytics endpoint)

### Sprint 5.2 — District Alerts + Settings (LIVE)

**Goal:** Connect the operational core to real backend APIs.

- [ ] P0.3 — Wire GukurikiranaPage to `GET /api/v1/alerts/follow-up`, `POST /api/v1/alerts/follow-up`, `PATCH /api/v1/alerts/follow-up/:id`
- [ ] P1.4 — Wire DistrictSettingsPage to `GET/PATCH /api/v1/settings`
- [ ] P1.6 — Fix English leakage in report previews — move hardcoded strings to locale

### Sprint 5.3 — District Reporting + Exports

**Goal:** Make reporting production-grade.

- [ ] P1.2 — Implement actual PDF/Excel export (either client-side generation or backend report endpoint)
- [ ] P2.1 — URL query state for filters (date range, center, sector)
- [ ] P2.2 — Server-side pagination for district children list
- [ ] P2.3 — Table column sorting

### Sprint 5.4 — District GIS + Compliance + WASH

**Goal:** Complete the district monitoring suite.

- [ ] P1.1 — Wire GIS map to real center locations from `GET /api/v1/centers` (with lat/lng if available) or `GET /api/v1/geo/districts`
- [ ] P2.4 — Compliance assessment list/detail UI (read-only initially)
- [ ] P2.5 — WASH assessment list/detail UI (read-only initially)

### Sprint 5.5 — NCDA Admin Shell + User Management

**Goal:** Bootstrap the NCDA admin experience.

- [ ] P1.7 — NCDA admin layout, navigation, routing (`/admin/*`)
- [ ] Expand `UserRole` type to include `ncdaAdmin`
- [ ] Create `ProtectedRoute` for `ncdaAdmin` role
- [ ] Login path for NCDA admin (`/login/admin`)
- [ ] P1.8 — User management pages: list, create, view, edit, reset-password
- [ ] User status management (activate/deactivate)

### Sprint 5.6 — NCDA Geography + Configuration

**Goal:** Organization hierarchy and system configuration.

- [ ] District list/detail management (using `GET /api/v1/districts`)
- [ ] Center list/detail management
- [ ] Admin unit hierarchy viewer (provinces → districts → sectors → cells → villages)
- [ ] Settings management UI (system-wide configuration)

### Sprint 5.7 — NCDA National Dashboard + Analytics

**Goal:** National oversight capability.

- [ ] P2.8 — National dashboard with cross-district KPIs
- [ ] District comparison views
- [ ] Analytics endpoint integration (`GET /api/v1/analytics/district-kpis`)
- [ ] National-level trend charts

### Sprint 5.8 — Audit/Compliance + Operational Monitoring

**Goal:** Governance and oversight tools.

- [ ] P2.6 — Audit log viewer (list, filter by action/user/entity)
- [ ] P2.7 — Device/sync admin view (device list, sync session status, failed operations)
- [ ] Compliance management (create/update assessments, gap tracking)
- [ ] WASH management (create/update assessments)

### Sprint 5.9 — Cross-Portal Hardening

**Goal:** Polish and optimization.

- [ ] P2.9 — Route-level code splitting
- [ ] Performance optimization for large districts
- [ ] Accessibility improvements (P3.1–P3.3)
- [ ] Comprehensive localization pass
- [ ] E2E test coverage for district + admin workflows

---

## 16. Verification

| Check | Result |
|---|---|
| `npm run build` | ✅ PASS — 2777 modules, 23s, 1702 KB |
| `npm run test` | ✅ PASS — 11 files, 128 tests |
| `npm run lint` | ⚠️ 147 pre-existing errors (109 errors, 38 warnings) — mostly generated Orval code + `react-hooks/set-state-in-effect` |
| Frontend code changed | **NO** |
| Backend changed | **NO** |
| OpenAPI changed | **NO** |
| Offline architecture changed | **NO** |
| LocalStore changed | **NO** |
| SyncEngine changed | **NO** |
| PWA changed | **NO** |
| Caregiver workflows changed | **NO** |
| District audit completed | **YES** |
| NCDA audit completed | **YES** |

---

## 17. What We Have

- A **fully functional caregiver portal** with mature offline-first architecture
- A **partially functional District portal** with 12 routes, dedicated layout, and dual-mode (MOCK/LIVE) data architecture
- A **backend API** with comprehensive endpoint coverage for: auth, children, attendance, growth/nutrition, feeding, STED, referrals, transfers, centers, districts, admin-units, monitoring (6 endpoints), reports (4 endpoints), analytics, alerts, users, compliance, WASH, audit-logs, settings, devices, sync
- **Orval-generated React Query hooks** for every backend endpoint
- A **well-designed monitoring feature module** with clean MOCK/LIVE separation
- **ArcGIS-based GIS** with working map rendering
- **Recharts-based charting** for trends and analytics
- **Kinyarwanda localization** for most UI strings

## What Actually Works (LIVE)

- Login with username/password (both roles)
- District dashboard KPIs (centers, children, attendance, growth coverage)
- Attendance monitoring by center
- Nutrition/growth monitoring
- Feeding monitoring
- STED monitoring
- Referral monitoring
- Center listing and detail
- Children listing and detail (but uses caregiver DataContext — scalability concern)
- Report data previews (attendance, enrollment, dropouts, centers, nutrition)
- Period filtering on dashboard

## What Is Mocked

- Follow-up alerts (GukurikiranaPage) — MOCK data, LIVE shows blank
- Settings — mock save, LIVE shows unavailable
- Report exports (PDF/Excel) — toast only, no files
- GIS center locations — from `ECD_CENTERS` mock array
- Sector filter in reports — disabled in LIVE
- Dashboard "Recent Activity Feed" — appears to use mock data
- Dashboard "Center Performance Summary" — appears to use mock data
- Dashboard new registrations / dropouts — shows "—" in LIVE

## What Is Missing

- **NCDA Admin portal** — no routes, no layout, no pages, no navigation
- **User management UI** — backend fully ready, zero frontend
- **Compliance UI** — backend ready, zero frontend
- **WASH UI** — backend ready, zero frontend
- **Audit log viewer** — backend ready, zero frontend
- **Device/sync admin view** — backend ready, zero frontend
- **National dashboard** — no cross-district aggregation
- **District management** — no district list/detail for NCDA
- **ECD configuration management** — all standards hardcoded
- **Actual report file generation** — no PDF/Excel export
- **Monitoring sub-pages in navigation** — pages exist but unreachable without direct URL

## What Is Broken

- **Error handling on district pages** — API failures result in infinite skeleton, indistinguishable from loading
- **District data architecture** — `useData()` loads all children into memory; unsuitable for districts with 1000+ children
- **GIS data** — map renders but center positions are fake

## What Backend Already Supports

| Domain | Endpoints | Frontend Consumed |
|---|---|---|
| Users CRUD + password reset | 5 endpoints | ❌ |
| Compliance (assessments, gaps, standards) | 6 endpoints | ❌ |
| WASH (assessments, summary) | 4 endpoints | ❌ |
| Audit logs | 1 endpoint (paginated) | ❌ |
| Settings | 2 endpoints (get/patch) | ❌ |
| Alerts/follow-up | 4 endpoints (CRUD + dismiss) | ❌ |
| Districts | 1 endpoint (list) | ❌ |
| Analytics | 1 endpoint (district-kpis) | ❌ |
| Devices | 3 endpoints | Internal only |
| Sync sessions/operations | 4 endpoints | Internal only |

**Total: 31 backend endpoints with zero or internal-only frontend consumption.**

## What Backend Does Not Support

- Report file generation (PDF/Excel) — would need new endpoint or client-side generation
- Sector-level report aggregation — no `/reports/sectors` endpoint
- Center create/update — no mutation endpoints for centers
- National-level KPI aggregation — no cross-district analytics endpoint (analytics/district-kpis is single-district)
- New registrations / dropouts count on monitoring dashboard
- Center geolocation data (lat/lng for GIS) — unclear if centers table has coordinates

## What District Needs First

1. **P0.1** — Separate district data loading from caregiver DataContext (server-side paginated queries)
2. **P0.2** — Error states on all district pages
3. **P0.3** — Connect alerts/follow-up to LIVE backend API
4. **P1.3** — Expose monitoring sub-pages in sidebar navigation
5. **P1.5** — Dashboard registration/dropout counts

## What NCDA Needs First

1. **P1.7** — Admin portal shell (layout, routing, role guard)
2. **P1.8** — User management pages (list, create, view, edit, reset-password)
3. Add `ncdaAdmin` to frontend `UserRole` type
4. National dashboard (requires analytics API clarification)

## Recommended Sprint 5.x Sequence

```
Sprint 5.0  → Audit + Architecture (this sprint) ✅
Sprint 5.1  → District data architecture + critical fixes (P0.1, P0.2, P1.3, P1.5)
Sprint 5.2  → District alerts + settings LIVE (P0.3, P1.4, P1.6)
Sprint 5.3  → District reporting + exports (P1.2, P2.1, P2.2, P2.3)
Sprint 5.4  → District GIS + compliance + WASH (P1.1, P2.4, P2.5)
Sprint 5.5  → NCDA admin shell + user management (P1.7, P1.8)
Sprint 5.6  → NCDA geography + configuration
Sprint 5.7  → NCDA national dashboard + analytics (P2.8)
Sprint 5.8  → Audit/compliance + operational monitoring (P2.6, P2.7)
Sprint 5.9  → Cross-portal hardening (P2.9, P3.x)
```

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| District `useData()` scalability | Pages crash or become unusable with 1000+ children | Sprint 5.1 — replace with paginated REST queries before adding more district features |
| Backend analytics gap | National dashboard may need new API endpoints | Clarify with backend team in Sprint 5.6 planning |
| Center geolocation | GIS map needs lat/lng — **backend `CenterDetailResponseDto` already has `latitude`/`longitude` fields** | Wire `GET /api/v1/centers` response to map; no backend change needed |
| Bundle size | 1.7 MB — adding NCDA portal will increase further | Sprint 5.9 — route-level code splitting |
| Report export | No backend endpoint for file generation | Evaluate client-side libraries (jsPDF, xlsx) vs backend report service |
| NCDA role mapping | Currently collapsed to `districtOfficer` — changing adds complexity | Sprint 5.5 — plan carefully to avoid breaking existing district auth |

## Decision

**Start with District hardening (Sprint 5.1–5.4), then NCDA Admin (Sprint 5.5+).**

Rationale:
1. The District portal **already has 12 working routes** and substantial UI investment — it needs hardening, not rebuilding.
2. The **P0 issues** (data architecture, error handling, alerts) must be resolved before the district portal is safe for production use.
3. The NCDA admin portal **doesn't exist** and requires new routing/layout/pages — it's a clean build that can happen in parallel once district is stable.
4. The **backend already supports** most of what both portals need — the gap is almost entirely frontend.
5. **No backend or OpenAPI changes are required** for Sprint 5.1–5.3. Backend work may be needed for Sprint 5.7 (national analytics) and center geolocation (Sprint 5.4).

> **We are ready to start building. District first.**
