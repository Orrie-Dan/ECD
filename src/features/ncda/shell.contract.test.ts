import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { isSidebarNavActive } from '@/components/ui/SidebarNavLink'
import {
  NCDA_NAV_GROUPS,
  NCDA_NAV_ITEMS,
  NCDA_PATHS,
  findNcdaNavItem,
  getNcdaPageTitle,
} from '@/layouts/ncda/navigation'
import { homePathForRole, hasRole } from '@/api/roles'
import { LayoutDashboard } from 'lucide-react'

describe('Sprint 5.5B — NCDA Admin shell', () => {
  const app = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8')
  const layout = fs.readFileSync(
    path.resolve(__dirname, '../../layouts/NcdaLayout.tsx'),
    'utf8',
  )
  const comingSoon = fs.readFileSync(
    path.resolve(__dirname, '../../components/ncda/NcdaComingSoonPage.tsx'),
    'utf8',
  )
  const pages = fs.readFileSync(
    path.resolve(__dirname, '../../pages/ncda/NcdaPages.tsx'),
    'utf8',
  )
  const dashboardPage = fs.readFileSync(
    path.resolve(__dirname, '../../pages/ncda/NcdaDashboardPage.tsx'),
    'utf8',
  )

  describe('route hierarchy', () => {
    it('registers protected NCDA shell routes under NcdaLayout', () => {
      expect(app).toContain('allowedRole="ncda"')
      expect(app).toContain('NcdaLayout')
      expect(app).toContain('path="/ncda"')
      expect(app).toContain('path="/ncda/dashboard"')
      expect(app).toContain('path="/ncda/districts"')
      expect(app).toContain('path="/ncda/centers"')
      expect(app).toContain('path="/ncda/children"')
      expect(app).toContain('path="/ncda/users"')
      expect(app).toContain('path="/ncda/compliance"')
      expect(app).toContain('path="/ncda/wash"')
      expect(app).toContain('path="/ncda/monitoring"')
      expect(app).toContain('path="/ncda/reports"')
      expect(app).toContain('path="/ncda/audit-logs"')
      expect(app).toContain('path="/ncda/devices"')
      expect(app).toContain('path="/ncda/sync"')
      expect(app).toContain('Navigate to="/ncda/dashboard"')
    })

    it('does not import District pages into NCDA routes', () => {
      const ncdaRouteBlock = app.slice(app.indexOf('Sprint 5.5B'))
      expect(ncdaRouteBlock).not.toMatch(/DistrictDashboardPage|DistrictLayout|pages\/district/)
      expect(pages).not.toMatch(/DistrictLayout|pages\/district/)
      expect(layout).not.toMatch(/DistrictLayout|pages\/district/)
    })
  })

  describe('authorization helpers remain role-isolated', () => {
    it('only ncda role is allowed on the NCDA home path', () => {
      expect(homePathForRole('ncda')).toBe('/ncda')
      expect(hasRole({ role: 'ncda' }, 'ncda')).toBe(true)
      expect(hasRole({ role: 'districtOfficer' }, 'ncda')).toBe(false)
      expect(hasRole({ role: 'caretaker' }, 'ncda')).toBe(false)
    })
  })

  describe('navigation IA', () => {
    it('exposes grouped navigation covering every shell path', () => {
      expect(NCDA_NAV_GROUPS.length).toBeGreaterThanOrEqual(5)
      const paths = NCDA_NAV_ITEMS.map((item) => item.path)
      expect(paths).toEqual(
        expect.arrayContaining([
          NCDA_PATHS.dashboard,
          NCDA_PATHS.districts,
          NCDA_PATHS.centers,
          NCDA_PATHS.children,
          NCDA_PATHS.users,
          NCDA_PATHS.compliance,
          NCDA_PATHS.wash,
          NCDA_PATHS.monitoring,
          NCDA_PATHS.reports,
          NCDA_PATHS.auditLogs,
          NCDA_PATHS.devices,
          NCDA_PATHS.sync,
        ]),
      )
      expect(new Set(paths).size).toBe(paths.length)
    })

    it('resolves active nav item and page title from pathname', () => {
      expect(findNcdaNavItem('/ncda/dashboard')?.id).toBe('dashboard')
      expect(findNcdaNavItem('/ncda')?.id).toBe('dashboard')
      expect(findNcdaNavItem('/ncda/users')?.id).toBe('users')
      expect(getNcdaPageTitle('/ncda/compliance')).toBe(
        NCDA_NAV_ITEMS.find((i) => i.id === 'compliance')!.label,
      )
    })

    it('highlights the correct sidebar item for dashboard and nested paths', () => {
      const dashboardItem = {
        path: NCDA_PATHS.dashboard,
        label: 'Dashboard',
        icon: LayoutDashboard,
        matchPaths: [NCDA_PATHS.dashboard],
      }
      expect(isSidebarNavActive('/ncda/dashboard', dashboardItem)).toBe(true)
      expect(isSidebarNavActive('/ncda/users', dashboardItem)).toBe(false)

      const usersItem = toSidebarFromNav('users')
      expect(isSidebarNavActive('/ncda/users', usersItem)).toBe(true)
      expect(isSidebarNavActive('/ncda/dashboard', usersItem)).toBe(false)
    })
  })

  describe('placeholder honesty + isolation', () => {
    it('coming-soon copy distinguishes unimplemented from empty data', () => {
      expect(comingSoon).toContain('ncda.comingSoon')
      expect(comingSoon).toContain('notEmptyData')
      expect(comingSoon).not.toMatch(/39445|125000|98%/)
      expect(pages).not.toMatch(/39445|mockNational|fakeMetric/)
    })

    it('NCDA shell placeholders do not pull LocalStore, SyncEngine, or Orval resources', () => {
      expect(layout).not.toMatch(/LocalStore|SyncEngine|getLocalStore|outbox|evaluateLogoutPolicy/)
      expect(pages).not.toMatch(/LocalStore|SyncEngine|useQuery|@\/api\/resources|@\/api\/generated/)
      expect(comingSoon).not.toMatch(/LiveUnavailableState/)
    })

    it('dashboard is a real national page (not Coming Soon) and not a District clone', () => {
      expect(dashboardPage).toContain('useNcdaDashboard')
      expect(dashboardPage).not.toContain('NcdaComingSoonPage')
      expect(dashboardPage).not.toMatch(/\buseDashboardMonitoring\b|\buseData\(/)
      expect(dashboardPage).not.toMatch(/from ['"]@\/pages\/district/)
      expect(pages).toContain("export { NcdaDashboardPage } from './NcdaDashboardPage'")
    })

    it('districts is a real governance page (not Coming Soon) exported beside placeholders', () => {
      const districtsPage = fs.readFileSync(
        path.resolve(__dirname, '../../pages/ncda/NcdaDistrictsPage.tsx'),
        'utf8',
      )
      expect(districtsPage).toContain('useNcdaDistrictsList')
      expect(districtsPage).not.toContain('NcdaComingSoonPage')
      expect(pages).toContain("export { NcdaDistrictsPage } from './NcdaDistrictsPage'")
      expect(app).toContain('path="/ncda/districts/:districtId"')
    })

    it('layout reuses shared UI primitives without District nav config', () => {
      expect(layout).toContain('SidebarNavLink')
      expect(layout).toContain('NavDrawer')
      expect(layout).toContain('ConfirmModal')
      expect(layout).toContain('NcdaUserMenu')
      expect(layout).not.toContain("path: '/district")
    })
  })
})

function toSidebarFromNav(id: string) {
  const item = NCDA_NAV_ITEMS.find((entry) => entry.id === id)!
  return {
    path: item.path,
    label: item.label,
    icon: item.icon,
    matchPaths: item.matchPaths,
  }
}
