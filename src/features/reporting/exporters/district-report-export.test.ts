import { describe, expect, it } from 'vitest'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { createWorkbook } from '@/lib/export/excel'
import {
  buildDistrictReportWorkbook,
  districtExcelExportAvailable,
  districtKindHasExportData,
} from '@/features/reporting/exporters/district-report-export'

describe('district report Excel exporter', () => {
    it('builds attendance summary and center sheets from real rows', async () => {
    const spec = buildDistrictReportWorkbook({
      kind: 'attendance',
      title: district.reports.attendance,
      dateFrom: '2026-08-01',
      dateTo: '2026-08-07',
      isMock: false,
      attendance: {
        summary: {
          total: 20,
          present: 16,
          absent: 4,
          unrecorded: 0,
          rate: 80,
          lateArrivals: null,
        },
        rows: [
          {
            centerId: 'c1',
            centerName: 'Ikigo A',
            sector: 'Kimironko',
            enrolledChildren: 40,
            rate: 80,
            present: 16,
            absent: 4,
            totalRecords: 20,
            submittedToday: true,
          },
        ],
      },
    })
    expect(spec.sheets.map((sheet) => sheet.name)).toEqual([
      common.excelExport.sheetSummary,
      common.excelExport.sheetCenters,
    ])
    expect(spec.sheets[1]?.rows).toHaveLength(1)
    const workbook = await createWorkbook(spec)
    const centers = workbook.getWorksheet(common.excelExport.sheetCenters)!
    let rate: unknown
    centers.eachRow((row) => {
      if (row.getCell(1).value === 'Ikigo A') rate = row.getCell(4).value
    })
    expect(rate).toBe(0.8)
  })

  it('does not invent a sectors workbook and keeps nutrition off without data', () => {
    expect(districtExcelExportAvailable('sectors')).toBe(false)
    expect(
      districtKindHasExportData({
        kind: 'nutritionCenters',
        loading: false,
        nutrition: null,
      }),
    ).toBe(false)
    expect(
      districtKindHasExportData({
        kind: 'attendance',
        loading: false,
      }),
    ).toBe(true)
  })

  it('does not create a dropouts sheet when only the summary exists', async () => {
    const spec = buildDistrictReportWorkbook({
      kind: 'dropouts',
      title: district.reports.dropouts,
      dateFrom: '2026-08-01',
      dateTo: '2026-08-07',
      isMock: true,
      dropouts: {
        from: '2026-08-01',
        to: '2026-08-07',
        districtId: null,
        total: 2,
        page: 1,
        pageSize: 100,
        totalPages: 1,
        interpretation: { dropoutDefinition: '', excluded: '', note: '' },
        summary: { dropouts: 2, transfersOut: 0 },
        items: [],
      },
    })
    expect(spec.sheets.map((sheet) => sheet.name)).toEqual([common.excelExport.sheetSummary])
    await expect(createWorkbook(spec)).resolves.toBeDefined()
  })
})
