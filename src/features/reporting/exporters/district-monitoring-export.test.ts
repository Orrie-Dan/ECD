import { describe, expect, it } from 'vitest'
import { buildDistrictAttendanceMonitoringWorkbook } from './district-attendance-monitoring-export'
import { buildDistrictGrowthWorkbook } from './district-growth-export'
import { buildDistrictReferralsWorkbook } from './district-referrals-export'
import { createWorkbook } from '@/lib/export/excel'

describe('district monitoring Excel exporters', () => {
  it('builds attendance monitoring workbook from export dataset', async () => {
    const spec = buildDistrictAttendanceMonitoringWorkbook({
      input: {
        title: 'Gukurikirana Ubwitabire',
        districtName: 'Gasabo',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-01',
        isMock: true,
        filters: [{ label: 'Ikigo', value: 'Ibigo byose' }],
      },
      rows: [
        {
          date: '2026-08-01',
          centerName: 'Ikigo A',
          sector: 'Kimironko',
          registeredChildren: 40,
          present: 35,
          absent: 3,
          attendanceRate: 87.5,
        },
      ],
    })
    const workbook = await createWorkbook(spec)
    expect(workbook.worksheets).toHaveLength(1)
    expect(workbook.worksheets[0]?.name).toBeTruthy()
  })

  it('builds growth workbook with typed measurement columns', async () => {
    const spec = buildDistrictGrowthWorkbook({
      input: {
        title: 'Imikurire',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
        isMock: false,
      },
      rows: [
        {
          childName: 'Mwana A',
          centerName: 'Ikigo A',
          measurementDate: '2026-08-15',
          weightKg: 12.4,
          muacCm: 13.2,
          nutritionStatusLabel: 'Bisanzwe',
          measurementStatusLabel: 'Basabwa gupimwa',
          age: 4,
        },
      ],
    })
    const workbook = await createWorkbook(spec)
    expect(workbook.worksheets[0]?.rowCount).toBeGreaterThan(3)
  })

  it('builds referrals workbook without internal ids', async () => {
    const spec = buildDistrictReferralsWorkbook({
      input: {
        title: 'Ihererekanya',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
        isMock: true,
      },
      rows: [
        {
          childName: 'Mwana A',
          centerName: 'Ikigo A',
          referralDate: '2026-08-10',
          sourceLabel: 'Imikurire',
          reason: 'MUAC',
          statusLabel: 'Birategereje',
          followUpLabel: 'Ihererekanya itararangira',
          resolvedDate: null,
        },
      ],
    })
    const workbook = await createWorkbook(spec)
    const sheet = workbook.worksheets[0]
    const joined = JSON.stringify(sheet?.getSheetValues() ?? [])
    expect(joined).not.toContain('ref1')
    expect(joined).not.toContain('childId')
  })
})
