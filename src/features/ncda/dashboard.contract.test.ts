import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { queryKeys, queryStaleTimes } from '@/api/query-keys'
import { homePathForRole, hasRole } from '@/api/roles'
import {
  NCDA_DASHBOARD_METRICS,
  NCDA_UNSUPPORTED_METRICS,
} from '@/features/ncda/dashboard/definitions'

const root = (...parts: string[]) => path.resolve(__dirname, ...parts)

describe('Sprint 5.5C — NCDA national dashboard contract', () => {
  const app = fs.readFileSync(root('../../App.tsx'), 'utf8')
  const dashboardPage = fs.readFileSync(root('../../pages/ncda/NcdaDashboardPage.tsx'), 'utf8')
  const pages = fs.readFileSync(root('../../pages/ncda/NcdaPages.tsx'), 'utf8')
  const queries = fs.readFileSync(root('./dashboard/queries.ts'), 'utf8')
  const useDash = fs.readFileSync(root('./dashboard/useNcdaDashboard.ts'), 'utf8')
  const geoResource = fs.readFileSync(root('../../api/resources/geo.ts'), 'utf8')
  const definitions = fs.readFileSync(root('./dashboard/definitions.ts'), 'utf8')

  describe('routing + authorization', () => {
    it('registers /ncda and /ncda/dashboard under ncda ProtectedRoute', () => {
      expect(app).toContain('allowedRole="ncda"')
      expect(app).toContain('path="/ncda/dashboard"')
      expect(app).toContain('NcdaDashboardPage')
      expect(homePathForRole('ncda')).toBe('/ncda')
      expect(hasRole({ role: 'ncda' }, 'ncda')).toBe(true)
      expect(hasRole({ role: 'districtOfficer' }, 'ncda')).toBe(false)
      expect(hasRole({ role: 'caretaker' }, 'ncda')).toBe(false)
    })
  })

  describe('query namespace + caching', () => {
    it('uses ncda.dashboard.* keys and a non-zero staleTime', () => {
      expect(queryKeys.ncda.all).toEqual(['ncda'])
      expect(queryKeys.ncda.dashboard.all).toEqual(['ncda', 'dashboard'])
      expect(queryKeys.ncda.dashboard.overview({ from: 'x' })).toEqual([
        'ncda',
        'dashboard',
        'overview',
        { from: 'x' },
      ])
      expect(queryKeys.ncda.dashboard.kpis({})[2]).toBe('kpis')
      expect(queryKeys.ncda.dashboard.network({})[2]).toBe('network')
      expect(queryStaleTimes.ncdaDashboard).toBe(120_000)
      expect(queries).toContain('queryStaleTimes.ncdaDashboard')
      expect(queries).toContain('env.isLive')
    })
  })

  describe('aggregate API wiring', () => {
    it('wires overview + district KPIs + network totals (bounded totals only)', () => {
      expect(queries).toContain('fetchMonitoringDashboard')
      expect(queries).toContain('fetchDistrictReport')
      expect(queries).toContain('fetchDistrictsTotal')
      expect(queries).toContain('fetchCentersTotal')
      expect(queries).toContain("status: 'active'")
      expect(geoResource).toContain('pageSize: 1')
      expect(geoResource).toContain('page.total')
      expect(useDash).toContain('useNcdaDashboardOverview')
      expect(useDash).toContain('useNcdaDashboardKpis')
      expect(useDash).toContain('useNcdaDashboardNetwork')
    })

    it('does not invoke unsafe national operational/list aggregations', () => {
      expect(queries).not.toMatch(
        /fetchMonitoringAttendance|fetchMonitoringSted|fetchMonitoringNutrition|fetchMonitoringFeeding|fetchMonitoringReferrals/,
      )
      expect(queries).not.toMatch(/fetchEnrollmentReport|fetchDropoutsReport|fetchCentersReport/)
      expect(dashboardPage).not.toMatch(
        /\buseDashboardMonitoring\b|\buseData\(|LocalStore|SyncEngine|MOCK_DATA/,
      )
      expect(dashboardPage).not.toMatch(/from ['"]@\/pages\/district/)
    })
  })

  describe('KPI definitions + honesty', () => {
    it('documents supported metrics with sources and marks gaps unavailable', () => {
      const supported = NCDA_DASHBOARD_METRICS.filter((m) => m.availability === 'supported')
      expect(supported.length).toBeGreaterThanOrEqual(8)
      expect(supported.every((m) => m.source.includes('/api/v1') || m.source.includes('GET'))).toBe(
        true,
      )
      expect(NCDA_UNSUPPORTED_METRICS.length).toBeGreaterThanOrEqual(4)
      expect(
        NCDA_UNSUPPORTED_METRICS.every(
          (m) => m.availability === 'unavailable' && Boolean(m.unavailableReason),
        ),
      ).toBe(true)
      expect(definitions).toContain('UNSAFE AT NATIONAL SCALE')
    })

    it('renders unsupported section and section retry affordances', () => {
      expect(dashboardPage).toContain('NCDA_UNSUPPORTED_METRICS')
      expect(dashboardPage).toContain('NcdaDashboardSection')
      expect(dashboardPage).toContain('onRetry')
      expect(dashboardPage).toContain('ncda.dashboard.retry')
      expect(dashboardPage).toContain('LiveUnavailableState')
      expect(dashboardPage).toContain('trendsUnavailable')
    })

    it('does not treat MOCK as LIVE fallback', () => {
      expect(dashboardPage).toContain('!env.isLive')
      expect(dashboardPage).toContain('mockOnlyTitle')
      expect(dashboardPage).not.toMatch(/if \(.*error.*\)[\s\S]*mock/i)
    })
  })

  describe('shell residual placeholders', () => {
    it('keeps non-dashboard NCDA pages as Coming Soon without API imports', () => {
      expect(pages).toContain('NcdaComingSoonPage')
      expect(pages).toContain("export { NcdaDashboardPage } from './NcdaDashboardPage'")
      expect(pages).not.toMatch(/useQuery|@\/api\/resources|@\/api\/generated/)
    })
  })
})
