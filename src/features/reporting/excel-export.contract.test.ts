import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = (...parts: string[]) => path.resolve(__dirname, '../../pages', ...parts)

describe('client-side Excel export is not blocked by live mode', () => {
  it('caretaker attendance no longer uses mock-only Excel success or liveExportUnavailable', () => {
    const src = fs.readFileSync(root('caretaker/AttendanceReportPage.tsx'), 'utf8')
    expect(src).toContain('handleExportExcel')
    expect(src).toContain('buildAttendanceWorkbook')
    expect(src).toContain('onExportExcel={handleExportExcel}')
    expect(src).toContain('disabled={!isGradeSelected}')
    expect(src).toContain('common.reportPreview.exportExcel')
    expect(src).not.toContain('handleMockExport')
    expect(src).not.toContain('liveExportUnavailable')
    expect(src).not.toContain('exportDisabled={env.isLive}')
  })

  it('district reports expose Excel on the page, not only in the preview modal', () => {
    const src = fs.readFileSync(root('district/ReportsPage.tsx'), 'utf8')
    expect(src).toContain('requestDistrictExcel')
    expect(src).toContain('buildDistrictReportWorkbook')
    expect(src).toContain('common.reportPreview.exportExcel')
    expect(src).not.toContain('handleMockExport')
    expect(src).not.toContain('liveExportUnavailable')
    expect(src).not.toContain('exportDisabled={env.isLive}')
  })

  it('district monitoring pages expose scoped Excel export controls', () => {
    const attendance = fs.readFileSync(root('district/AttendanceMonitoringPage.tsx'), 'utf8')
    const growth = fs.readFileSync(root('district/GrowthMonitoringPage.tsx'), 'utf8')
    const referrals = fs.readFileSync(root('district/ReferralsPage.tsx'), 'utf8')
    for (const src of [attendance, growth, referrals]) {
      expect(src).toContain('useExcelExport')
      expect(src).toContain('common.reportPreview.exportExcel')
      expect(src).toContain('buildDistrict')
    }
    expect(attendance).toContain('mapCenterDailyRowsToExport')
    expect(growth).toContain('mapGrowthChildRowsToExportRows')
    expect(referrals).toContain('mapReferralsToExportRows')
  })
})
