import { describe, expect, it } from 'vitest'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { createWorkbook } from '@/lib/export/excel'
import {
  attendanceStatusLabel,
  buildAttendanceWorkbook,
  mapSingleDayAttendanceRows,
} from '@/features/reporting/exporters/attendance-export'
import type { AttendanceRecord, Child } from '@/types'

function child(id: string, name: string): Child {
  return {
    id,
    fullName: name,
    dateOfBirth: '2022-01-01',
    gender: 'Umukobwa',
    guardianName: 'Mama',
    guardianPhone: '0780000000',
    guardianRelation: 'umubyeyi_mama',
    province: 'p',
    district: 'd',
    sector: 's',
    cell: 'c',
    village: 'v',
    registeredAt: '2026-01-01',
    status: 'active',
    registrationNumber: id,
    centerId: 'ctr',
    centerName: 'Ikigo Test',
  }
}

describe('attendance Excel exporter', () => {
  const rows = mapSingleDayAttendanceRows([
    {
      child: child('a', 'Ange'),
      status: 'present',
      record: {
        id: '1',
        childId: 'a',
        date: '2026-08-05',
        present: true,
        arrivedAt: '2026-08-05T08:10:00',
        recordedBy: 'Umurezi',
      } satisfies AttendanceRecord,
    },
    { child: child('b', 'Bosco'), status: 'unrecorded', record: null },
  ])

  const spec = buildAttendanceWorkbook({
    title: caretaker.report.title,
    centerName: 'Ikigo Test',
    dateFrom: '2026-08-05',
    dateTo: '2026-08-05',
    generatedAt: new Date(2026, 7, 26, 9, 0, 0),
    isMock: true,
    summary: {
      total: 2,
      present: 1,
      absent: 0,
      unrecorded: 1,
      rate: 50,
      lateArrivals: 0,
    },
    summaryLabels: {
      total: caretaker.report.registered,
      present: caretaker.report.present,
      absent: caretaker.report.absent,
      rate: caretaker.report.rate,
    },
    mode: 'single-day',
    rows,
  })

  it('uses localized sheet names and headers', () => {
    expect(spec.sheets.map((sheet) => sheet.name)).toEqual([
      common.excelExport.sheetSummary,
      common.excelExport.sheetAttendance,
    ])
    expect(spec.sheets[1]?.columns.map((column) => column.header)).toEqual([
      common.labels.child,
      common.labels.parent,
      common.labels.status,
      caretaker.attendance.arrivalTime,
      caretaker.report.reason,
    ])
    expect(attendanceStatusLabel('present')).toBe(caretaker.attendance.statusPresent)
    expect(attendanceStatusLabel('absent')).toBe(caretaker.attendance.statusAbsent)
  })

  it('exports the full row count and numeric attendance rate', async () => {
    expect(spec.sheets[1]?.rows).toHaveLength(2)
    const workbook = await createWorkbook(spec)
    const summary = workbook.getWorksheet(common.excelExport.sheetSummary)!
    let rateCell: unknown
    summary.eachRow((row) => {
      if (row.getCell(1).value === caretaker.report.rate) {
        rateCell = row.getCell(2).value
      }
    })
    expect(rateCell).toBe(0.5)
  })

  it('keeps a mock-mode indicator and survives an empty roster', async () => {
    const mockRow = spec.sheets[0]?.metadata?.find(
      (row) => row.label === common.excelExport.dataSource,
    )
    expect(mockRow?.value).toBe(common.excelExport.mockDataNote)
    const empty = buildAttendanceWorkbook({
      title: caretaker.report.title,
      dateFrom: '2026-08-05',
      dateTo: '2026-08-05',
      isMock: false,
      summary: {
        total: 0,
        present: 0,
        absent: 0,
        unrecorded: 0,
        rate: 0,
        lateArrivals: null,
      },
      summaryLabels: {
        total: caretaker.report.registered,
        present: caretaker.report.present,
        absent: caretaker.report.absent,
        rate: caretaker.report.rate,
      },
      mode: 'single-day',
      rows: [],
    })
    await expect(createWorkbook(empty)).resolves.toBeDefined()
    expect(empty.sheets[1]?.rows).toHaveLength(0)
    expect(
      empty.sheets[0]?.metadata?.find((row) => row.label === common.excelExport.dataSource)?.value,
    ).toBe(common.excelExport.sourceLive)
  })
})
