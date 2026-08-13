import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { isSidebarNavActive } from '@/components/ui/SidebarNavLink'
import {
  DISTRICT_NAV_GROUPS,
  DISTRICT_NAV_ITEMS,
  DISTRICT_PATHS,
  findDistrictNavItem,
  getDistrictPageTitle,
} from '@/layouts/district/navigation'
import { homePathForRole, hasRole } from '@/api/roles'
import { LayoutDashboard } from 'lucide-react'

describe('District portal information architecture', () => {
  const app = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8')
  const layout = fs.readFileSync(
    path.resolve(__dirname, '../../layouts/DistrictLayout.tsx'),
    'utf8',
  )
  const dashboardPage = fs.readFileSync(
    path.resolve(__dirname, '../../pages/district/DashboardPage.tsx'),
    'utf8',
  )
  const monitoringPage = fs.readFileSync(
    path.resolve(__dirname, '../../pages/district/DistrictMonitoringPage.tsx'),
    'utf8',
  )

  describe('route hierarchy', () => {
    it('nests district routes under DistrictLayout and keeps operational destinations', () => {
      expect(app).toContain('allowedRole="districtOfficer"')
      expect(app).toContain('DistrictLayout')
      expect(app).toContain('path="/district"')
      expect(app).toContain('path="/district/ibigo"')
      expect(app).toContain('path="/district/abana"')
      expect(app).toContain('path="/district/imikorere"')
      expect(app).toContain('path="/district/imikorere/ubwitabire"')
      expect(app).toContain('path="/district/imikorere/imikurire"')
      expect(app).toContain('path="/district/imikorere/imirire"')
      expect(app).toContain('path="/district/imikorere/sted"')
      expect(app).toContain('path="/district/gukurikirana"')
      expect(app).toContain('path="/district/raporo"')
      expect(app).toContain('path="/district/igenamiterere"')
      expect(app).toContain('DistrictMonitoringPage')
      expect(app).not.toContain('ReferralMonitoringPage')
    })

    it('redirects deprecated domain destinations into the new workspaces', () => {
      expect(app).toContain('to={DISTRICT_PATHS.monitoringAttendance}')
      expect(app).toContain('to={DISTRICT_PATHS.monitoringGrowth}')
      expect(app).toContain('to={DISTRICT_PATHS.monitoringFeeding}')
      expect(app).toContain('to={DISTRICT_PATHS.monitoringSted}')
      expect(app).toContain('to={DISTRICT_PATHS.followup}')
      expect(app).toContain('to={DISTRICT_PATHS.dashboard}')
      expect(app).toContain('path="/district/ikarita"')
      expect(app).toContain('path="/district/referrals"')
      expect(app).toContain('path="/district/attendance"')
    })
  })

  describe('navigation IA', () => {
    it('exposes command + administration groups without domain CRUD as siblings', () => {
      expect(DISTRICT_NAV_GROUPS.map((g) => g.id)).toEqual(['command', 'administration'])
      const paths = DISTRICT_NAV_ITEMS.map((item) => item.path)
      expect(paths).toEqual([
        DISTRICT_PATHS.dashboard,
        DISTRICT_PATHS.centers,
        DISTRICT_PATHS.children,
        DISTRICT_PATHS.monitoring,
        DISTRICT_PATHS.followup,
        DISTRICT_PATHS.reports,
        DISTRICT_PATHS.caregivers,
        DISTRICT_PATHS.settings,
      ])
      expect(paths).not.toContain(DISTRICT_PATHS.gis)
      expect(paths).not.toContain(DISTRICT_PATHS.monitoringAttendance)
      expect(new Set(paths).size).toBe(paths.length)
    })

    it('resolves Incamake as exact /district and monitoring nested paths to Imikorere', () => {
      expect(findDistrictNavItem('/district')?.id).toBe('dashboard')
      expect(findDistrictNavItem('/district/imikorere/ubwitabire')?.id).toBe('monitoring')
      expect(findDistrictNavItem('/district/gukurikirana')?.id).toBe('followup')
      expect(findDistrictNavItem('/district/referrals')).toBeUndefined()
      expect(getDistrictPageTitle('/district/imikorere')).toBe(
        DISTRICT_NAV_ITEMS.find((i) => i.id === 'monitoring')!.label,
      )
    })

    it('does not highlight Incamake for nested district routes', () => {
      const dashboardItem = {
        path: DISTRICT_PATHS.dashboard,
        label: 'Incamake',
        icon: LayoutDashboard,
        matchPaths: [DISTRICT_PATHS.dashboard],
      }
      expect(isSidebarNavActive('/district', dashboardItem)).toBe(true)
      expect(isSidebarNavActive('/district/ibigo', dashboardItem)).toBe(false)
    })
  })

  describe('command centre + monitoring isolation', () => {
    it('Incamake is the GIS command centre, not a KPI card dump', () => {
      expect(dashboardPage).toContain('DistrictOverviewCommand')
      expect(dashboardPage).not.toContain('AttendanceSummaryCards')
      expect(dashboardPage).not.toContain('DashboardTrendCharts')
      expect(layout).toContain('Outlet')
      expect(layout).toContain('DISTRICT_NAV_GROUPS')
    })

    it('Monitoring hub is analytical and does not clone Incamake GIS', () => {
      expect(monitoringPage).toContain('useDistrictMonitoringHub')
      expect(monitoringPage).toContain('DistrictWorkspaceNav')
      expect(monitoringPage).not.toContain('GisPendingPlaceholder')
      expect(monitoringPage).not.toContain('DistrictOverviewCommand')
    })
  })

  describe('authorization remains role-isolated', () => {
    it('only districtOfficer is allowed on the district home path', () => {
      expect(homePathForRole('districtOfficer')).toBe('/district')
      expect(hasRole({ role: 'districtOfficer' }, 'districtOfficer')).toBe(true)
      expect(hasRole({ role: 'ncda' }, 'districtOfficer')).toBe(false)
    })
  })
})
