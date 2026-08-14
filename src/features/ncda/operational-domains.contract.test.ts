import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { queryKeys, queryStaleTimes } from '@/api/query-keys'
import { homePathForRole, hasRole } from '@/api/roles'
import { COMPLIANCE_MAX_PAGE_SIZE } from '@/api/resources/compliance'
import { WASH_MAX_PAGE_SIZE } from '@/api/resources/wash'
import { NCDA_MONITORING_UNAVAILABLE } from '@/features/ncda/monitoring/queries'
import { NCDA_REPORTING_UNAVAILABLE } from '@/features/ncda/reporting/queries'
import { findNcdaNavItem } from '@/layouts/ncda/navigation'

const root = (...parts: string[]) => path.resolve(__dirname, ...parts)

describe('Sprint 5.5H / 5.5I — NCDA operational domains contract', () => {
  const app = fs.readFileSync(root('../../App.tsx'), 'utf8')
  const pages = fs.readFileSync(root('../../pages/ncda/NcdaPages.tsx'), 'utf8')
  const compliancePage = fs.readFileSync(root('../../pages/ncda/NcdaCompliancePage.tsx'), 'utf8')
  const washPage = fs.readFileSync(root('../../pages/ncda/NcdaWashPage.tsx'), 'utf8')
  const monitoringPage = fs.readFileSync(root('../../pages/ncda/NcdaMonitoringPage.tsx'), 'utf8')
  const reportsPage = fs.readFileSync(root('../../pages/ncda/NcdaReportsPage.tsx'), 'utf8')
  const complianceQueries = fs.readFileSync(root('./compliance/queries.ts'), 'utf8')
  const washQueries = fs.readFileSync(root('./wash/queries.ts'), 'utf8')
  const monitoringQueries = fs.readFileSync(root('./monitoring/queries.ts'), 'utf8')
  const reportingQueries = fs.readFileSync(root('./reporting/queries.ts'), 'utf8')
  const complianceResource = fs.readFileSync(root('../../api/resources/compliance.ts'), 'utf8')
  const washResource = fs.readFileSync(root('../../api/resources/wash.ts'), 'utf8')
  const monitoringResource = fs.readFileSync(root('../../api/resources/monitoring.ts'), 'utf8')

  describe('routing + authorization', () => {
    it('registers operational domains under ncda ProtectedRoute', () => {
      expect(app).toContain('allowedRole="ncda"')
      expect(app).toContain('path="/ncda/inspections"')
      expect(app).toContain('path="/ncda/compliance"')
      expect(app).toContain('path="/ncda/wash"')
      expect(app).toContain('path="/ncda/monitoring"')
      expect(app).toContain('path="/ncda/reports"')
      expect(app).toContain('RedirectWithSearch to="/ncda/dashboard"')
      expect(homePathForRole('ncda')).toBe('/ncda')
      expect(hasRole({ role: 'ncda' }, 'ncda')).toBe(true)
      expect(findNcdaNavItem('/ncda/inspections')?.id).toBe('inspections')
      expect(findNcdaNavItem('/ncda/compliance')?.id).toBe('inspections')
      expect(findNcdaNavItem('/ncda/wash')?.id).toBe('wash')
      expect(findNcdaNavItem('/ncda/monitoring')?.id).toBe('monitoring')
      expect(findNcdaNavItem('/ncda/reports')?.id).not.toBe('reports')
      expect(pages).toContain("export { NcdaCompliancePage }")
      expect(pages).toContain("export { NcdaWashPage }")
      expect(pages).toContain("export { NcdaMonitoringPage }")
      expect(pages).toContain("export { NcdaReportsPage }")
    })
  })

  describe('compliance', () => {
    it('uses ncda.compliance.* with clamped pagination and real list/detail APIs', () => {
      expect(queryKeys.ncda.compliance.all).toEqual(['ncda', 'compliance'])
      expect(queryKeys.ncda.compliance.list({ page: 1 })[2]).toBe('list')
      expect(queryKeys.ncda.compliance.detail('a1')).toEqual([
        'ncda',
        'compliance',
        'detail',
        'a1',
      ])
      expect(queryStaleTimes.ncdaCompliance).toBe(30_000)
      expect(COMPLIANCE_MAX_PAGE_SIZE).toBe(100)
      expect(complianceResource).toContain('clampPageSize')
      expect(complianceResource).toContain('complianceControllerListAssessments')
      expect(complianceResource).toContain('complianceControllerGetAssessment')
      expect(complianceQueries).toContain('env.isLive')
      expect(compliancePage).not.toContain('aggregatesUnavailable')
      expect(compliancePage).not.toContain('followUpUnavailable')
      expect(compliancePage).toContain('LiveUnavailableState')
      expect(compliancePage).toContain('listError')
      expect(compliancePage).toContain('retry')
    })
  })

  describe('wash', () => {
    it('uses ncda.wash.* with server filters and no client aggregation', () => {
      expect(queryKeys.ncda.wash.all).toEqual(['ncda', 'wash'])
      expect(queryStaleTimes.ncdaWash).toBe(30_000)
      expect(WASH_MAX_PAGE_SIZE).toBe(100)
      expect(washResource).toContain('washControllerListIndicators')
      expect(washResource).toContain('washControllerGetIndicator')
      expect(washQueries).toContain('env.isLive')
      expect(washPage).not.toContain('aggregatesUnavailable')
      expect(washPage).not.toMatch(/loadCenters\(|findMany|MOCK_DATA/)
      expect(washPage).toContain('emptyFiltered')
    })
  })

  describe('monitoring (5.5I)', () => {
    it('uses national-safe STED/compliance/WASH aggregates without per-center hydration', () => {
      expect(queryKeys.ncda.monitoring.sted({ page: 1 })[2]).toBe('sted')
      expect(queryKeys.ncda.monitoring.compliance({})[2]).toBe('compliance')
      expect(queryKeys.ncda.monitoring.wash({})[2]).toBe('wash')
      expect(queryStaleTimes.ncdaMonitoring).toBe(120_000)
      expect(monitoringQueries).toContain('fetchMonitoringDashboard')
      expect(monitoringQueries).toContain('fetchDistrictReport')
      expect(monitoringQueries).toContain('fetchMonitoringSted')
      expect(monitoringQueries).toContain('fetchMonitoringCompliance')
      expect(monitoringQueries).toContain('fetchMonitoringWash')
      expect(monitoringQueries).not.toContain('fetchMonitoringAttendance')
      expect(monitoringResource).toContain('monitoringControllerSted')
      expect(monitoringResource).toContain('monitoringControllerCompliance')
      expect(monitoringResource).toContain('monitoringControllerWash')
      expect(monitoringPage).toContain('useNcdaMonitoringSted')
      expect(monitoringPage).toContain('compliance.data?.summary.totalAssessments')
      expect(monitoringPage).toContain('wash.data?.summary.reporting.centersReporting')
      expect(monitoringPage).not.toMatch(/LocalStore|useData\(|MOCK_DATA/)
      const monitoringUnavailableIds = NCDA_MONITORING_UNAVAILABLE.map((x) => x.id)
      expect(monitoringUnavailableIds).not.toContain('sted-monitoring')
      expect(
        NCDA_MONITORING_UNAVAILABLE.some((x) => x.id === 'per-center-monitoring-tables'),
      ).toBe(true)
      expect(monitoringPage).toContain('unavailableTitle')
    })
  })

  describe('reporting + exports (5.5I)', () => {
    it('allows national centers report and documents export GAP', () => {
      expect(queryKeys.ncda.reporting.all).toEqual(['ncda', 'reporting'])
      expect(queryStaleTimes.ncdaReporting).toBe(60_000)
      expect(reportingQueries).toContain('fetchCentersReport')
      expect(reportingQueries).not.toContain('Boolean(districtId)')
      expect(reportsPage).toContain('exportUnavailable')
      expect(reportsPage).not.toContain('centersNeedDistrict')
      expect(reportsPage).toMatch(/disabled/)
      expect(NCDA_REPORTING_UNAVAILABLE.some((x) => x.id === 'export-csv-pdf')).toBe(true)
      expect(reportsPage).not.toMatch(/blob:|downloadCsv|jsPDF|fakeExport/)
    })
  })

  describe('architecture isolation', () => {
    it('avoids LocalStore, useData, mock fallback, and district primary reuse', () => {
      for (const src of [
        compliancePage,
        washPage,
        monitoringPage,
        reportsPage,
        complianceQueries,
        washQueries,
        monitoringQueries,
        reportingQueries,
      ]) {
        expect(src).not.toMatch(/\buseData\(|LocalStore|SyncEngine|MOCK_DATA/)
        expect(src).not.toMatch(/if\s*\(!.*\)\s*return\s+MOCK/)
        expect(src).not.toMatch(/from ['"]@\/pages\/district/)
        expect(src).not.toMatch(/district\.keys\.(monitoring|reporting)/)
      }
      expect(compliancePage).toContain('LiveUnavailableState')
      expect(washPage).toContain('LiveUnavailableState')
      expect(monitoringPage).toContain('LiveUnavailableState')
      expect(reportsPage).toContain('LiveUnavailableState')
    })
  })
})
