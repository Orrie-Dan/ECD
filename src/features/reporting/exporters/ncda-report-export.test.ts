import { describe, expect, it } from 'vitest'
import { ncda } from '@/locales/rw/ncda'
import { common } from '@/locales/rw/common'
import { createWorkbook } from '@/lib/export/excel'
import {
  buildNcdaReportWorkbook,
  ncdaExcelExportAvailable,
} from '@/features/reporting/exporters/ncda-report-export'

describe('NCDA report Excel exporter', () => {
  it('exports national KPIs as a summary sheet', async () => {
    const spec = buildNcdaReportWorkbook({
      reportId: 'national',
      title: ncda.reports.nationalPerformance,
      periodLabel: 'Kanama 2026',
      districtLabel: ncda.reports.districtAll,
      district: {
        from: '2026-08-01',
        to: '2026-08-31',
        districtId: null,
        kpis: {
          centersInScope: 10,
          activeChildren: 400,
          newRegistrations: 12,
          dropouts: 3,
          attendanceRate: 81,
          nutritionScreenings: 90,
          severeNutrition: 4,
          pendingReferrals: 2,
          feedingDaysRecorded: 20,
          stedAssessments: 8,
        },
      },
    })
    expect(spec.sheets.map((sheet) => sheet.name)).toEqual([common.excelExport.sheetSummary])
    const workbook = await createWorkbook(spec)
    const sheet = workbook.getWorksheet(common.excelExport.sheetSummary)!
    let attendance: unknown
    sheet.eachRow((row) => {
      if (row.getCell(1).value === ncda.reports.attendanceRate) {
        attendance = row.getCell(2).value
      }
    })
    expect(attendance).toBe(0.81)
  })

  it('localizes center status and records the current page only', () => {
    const spec = buildNcdaReportWorkbook({
      reportId: 'centers',
      title: ncda.reports.centersTitle,
      periodLabel: 'Kanama 2026',
      districtLabel: 'Gasabo',
      centers: {
        from: '2026-08-01',
        to: '2026-08-31',
        districtId: 'd1',
        total: 40,
        page: 2,
        pageSize: 10,
        totalPages: 4,
        items: [
          {
            centerId: 'c1',
            centerCode: 'C1',
            centerName: 'Ikigo A',
            status: 'active',
            enrolledChildren: 32,
            attendance: { present: 20, absent: 4, rate: 83 },
            nutritionSevereScreenings: 1,
            feedingDaysRecorded: 10,
            referralsPending: 0,
            stedAssessmentsCompleted: 2,
          },
        ],
      },
    })
    expect(spec.sheets[0]?.rows).toHaveLength(1)
    expect(spec.sheets[0]?.rows[0]?.[1]).toBe(ncda.centers.statusActive)
    const pageMeta = spec.sheets[0]?.metadata?.find((row) => row.label === common.pagination.page)
    expect(String(pageMeta?.value)).toContain('2')
    expect(String(pageMeta?.value)).toContain('4')
  })

  it('keeps Excel unavailable until a report payload is loaded', () => {
    expect(
      ncdaExcelExportAvailable({
        reportId: null,
        loading: false,
      }),
    ).toBe(false)
    expect(
      ncdaExcelExportAvailable({
        reportId: 'enrollment',
        loading: true,
        enrollment: undefined,
      }),
    ).toBe(false)
    expect(
      ncdaExcelExportAvailable({
        reportId: 'enrollment',
        loading: false,
        enrollment: {
          from: '2026-08-01',
          to: '2026-08-31',
          districtId: null,
          centerId: null,
          summary: {
            totalEnrolled: 10,
            active: 8,
            archived: 1,
            transferred: 1,
            newRegistrations: 2,
          },
          trend: [],
        },
      }),
    ).toBe(true)
  })
})
