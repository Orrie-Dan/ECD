# Sprint 5.5B — NCDA Admin Application Shell & Information Architecture

**Date:** 2026-08-11  
**Frontend:** `D:\Esri\ECD`  
**Backend:** unchanged  
**Continues from:** Sprint 5.5A (`docs/sprint-5.5a-ncda-role-boundary-report.md`)

---

## 1. Executive summary

Sprint 5.5B delivers the **NCDA Admin application shell**: layout, grouped navigation, protected route hierarchy, and honest “coming soon” placeholders.

```text
Auth (ncda)
  ↓
ProtectedRoute allowedRole="ncda"
  ↓
NcdaLayout (sidebar + header + Outlet)
  ↓
Ncda navigation groups
  ↓
NcdaComingSoonPage placeholders (no domain APIs)
```

No domain features were implemented. No national-scale API calls. No LocalStore / SyncEngine. District and caregiver architectures remain frozen.

---

## 2. Shell architecture

```text
JWT / session
    ↓
normalizeRole → ncda
    ↓
ProtectedRoute(allowedRole="ncda")
    ↓
NcdaLayout
    ├── NcdaBrand (NCDA · National Administration)
    ├── Grouped sidebar (NCDA_NAV_GROUPS)
    ├── Header (page context + NcdaUserMenu)
    ├── ConfirmModal logout (online-only; no offline policy)
    └── <Outlet /> → section pages
```

Default route:

```text
/ncda  →  /ncda/dashboard
```

---

## 3. Route map

| Route | Page | Status |
|-------|------|--------|
| `/ncda` | Redirect → dashboard | READY |
| `/ncda/dashboard` | `NcdaDashboardPage` | SHELL ONLY |
| `/ncda/districts` | `NcdaDistrictsPage` | SHELL ONLY |
| `/ncda/centers` | `NcdaCentersPage` | SHELL ONLY |
| `/ncda/children` | `NcdaChildrenPage` | SHELL ONLY |
| `/ncda/users` | `NcdaUsersPage` | SHELL ONLY |
| `/ncda/compliance` | `NcdaCompliancePage` | SHELL ONLY |
| `/ncda/wash` | `NcdaWashPage` | SHELL ONLY |
| `/ncda/monitoring` | `NcdaMonitoringPage` | SHELL ONLY |
| `/ncda/reports` | `NcdaReportsPage` | SHELL ONLY |
| `/ncda/audit-logs` | `NcdaAuditLogsPage` | SHELL ONLY |
| `/ncda/devices` | `NcdaDevicesPage` | SHELL ONLY |
| `/ncda/sync` | `NcdaSyncPage` | SHELL ONLY |
| `/ncda/*` | Redirect → dashboard | READY |

All routes sit under `ProtectedRoute allowedRole="ncda"`. District and caregiver roles are denied.

---

## 4. Navigation groups (IA)

Defined in `src/layouts/ncda/navigation.ts` — **not** a renamed District nav.

| Group | Items |
|-------|-------|
| Overview | Dashboard |
| Program Management | Districts, Centers, Children |
| Quality & Compliance | Compliance, WASH, Monitoring |
| Administration | Users, Audit Logs |
| Reporting | Reports |
| Platform Operations | Devices, Sync Operations |

Active state uses `SidebarNavLink` / `isSidebarNavActive` with exact matching for portal roots so `/ncda` never steals `/ncda/users`.

---

## 5. Placeholder strategy

`NcdaComingSoonPage` clearly states:

- **Not implemented** (coming soon badge)
- Explicitly **not** an empty-data state
- No fake KPIs, charts, activity feeds, or health widgets

Dashboard uses `variant="landing"` (slightly richer framing) still without metrics.

---

## 6. Reused vs new components

### Reused (design system)

| Component | Use |
|-----------|-----|
| `SidebarNavLink` / `isSidebarNavActive` | Nav links + active state |
| `NavDrawer` | Mobile/tablet menu |
| `PageHeader`, `PageContainer`, `PageContent` | Page framing |
| `Card`, `Badge` | Coming-soon panel |
| `ConfirmModal` | Logout confirm |
| `Toast` / `useToast` | Profile “coming soon” notice |
| Lucide icons | Existing icon set |
| `ncda-logo.png` | Brand mark |

### New (NCDA-specific)

| Artifact | Path |
|----------|------|
| Layout | `src/layouts/NcdaLayout.tsx` |
| Nav config | `src/layouts/ncda/navigation.ts` |
| Coming soon | `src/components/ncda/NcdaComingSoonPage.tsx` |
| Breadcrumbs | `src/components/ncda/NcdaBreadcrumbs.tsx` |
| User menu | `src/components/ncda/NcdaUserMenu.tsx` |
| Section pages | `src/pages/ncda/NcdaPages.tsx` |
| Locales | `src/locales/rw/ncda.ts` |
| Shell tests | `src/features/ncda/shell.contract.test.ts` |

---

## 7. Domain implementation status

| Domain | Status |
|--------|--------|
| Dashboard | **SHELL ONLY** |
| Districts | **SHELL ONLY** |
| Centers | **SHELL ONLY** |
| Children | **SHELL ONLY** |
| Users | **SHELL ONLY** |
| Compliance | **SHELL ONLY** |
| WASH | **SHELL ONLY** |
| Monitoring | **SHELL ONLY** |
| Reports | **SHELL ONLY** |
| Audit Logs | **SHELL ONLY** |
| Devices | **SHELL ONLY** |
| Sync | **SHELL ONLY** |

Future data hooks must use `queryKeys.ncda.*` and must not call national unbounded APIs without district filters / aggregation contracts.

---

## 8. Isolation guarantees

| Guarantee | Result |
|-----------|--------|
| No District page imports in NCDA shell | YES |
| No caregiver LocalStore / SyncEngine / outbox | YES |
| No Orval / resource / React Query domain hooks in shell pages | YES |
| No national-scale API on shell init | YES |
| Backend / OpenAPI / Prisma unchanged | YES |
| District architecture unchanged | YES |

Logout is a simple confirm → `logout()` → `/` (no offline logout policy).

---

## 9. Verification

| Check | Result |
|-------|--------|
| `vitest` `src/features/ncda/` | **22/22 PASS** |
| `npm run build` | **PASS** |
| ESLint on 5.5B-touched NCDA files | **PASS** (0 warnings) |
| `SidebarNavLink` react-refresh export lint | **Pre-existing** (unchanged rule; helper export) |

---

## 10. Success criteria

```text
[x] NCDA has its own application layout
[x] NCDA has clear information architecture
[x] NCDA navigation is distinct from District
[x] All planned NCDA routes have protected boundaries
[x] Placeholder pages clearly communicate implementation status
[x] No fake national data exists
[x] No NCDA domain API calls are triggered by the shell
[x] No LocalStore/SyncEngine dependency exists
[x] District architecture remains unchanged
[x] Caregiver offline architecture remains unchanged
[x] Responsive behavior (desktop sidebar / tablet rail / mobile drawer)
[x] Accessibility basics (nav landmarks, buttons, aria-current, focus rings)
[x] Tests pass
[x] Build passes
[x] Lint has no new issues on NCDA shell files
[x] Final report documents the shell honestly
```

---

## SPRINT 5.5B STATUS

```text
SPRINT 5.5B STATUS

Verdict:
COMPLETE

NCDA shell:
READY

NCDA navigation:
READY

NCDA route hierarchy:
READY

Role protection:
READY

Dashboard:
SHELL ONLY

Districts:
SHELL ONLY

Centers:
SHELL ONLY

Children:
SHELL ONLY

Users:
SHELL ONLY

Compliance:
SHELL ONLY

WASH:
SHELL ONLY

Monitoring:
SHELL ONLY

Reports:
SHELL ONLY

Audit Logs:
SHELL ONLY

Devices:
SHELL ONLY

Sync:
SHELL ONLY

Backend changed:
NO

OpenAPI changed:
NO

Prisma changed:
NO

District architecture changed:
NO

Caregiver offline architecture changed:
NO

NCDA LocalStore dependency:
NO

National-scale API calls triggered by shell:
NO

Tests:
22/22 PASS

Build:
PASS

Lint:
PASS

Remaining P0:
National-scale monitoring/report defaults when first NCDA data pages land (do not unfilter loadCenters/STED nationally)

Remaining P1:
User administration FE; org browse (districts/centers); governance (audit/compliance/WASH); dashboard aggregates with mandatory filters; children/referrals districtId contract gaps

Remaining P2:
Device/sync admin APIs + FE; exports; GIS; multi-district scope; peer ncda_admin provisioning

Recommended next sprint:
5.5C — User administration (backend-ready users API + NCDA FE against shared Orval/resources), OR 5.5D org browse (districts/centers) if product prioritizes geography first — evaluate national-scale filters before monitoring
```
