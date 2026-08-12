import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('@/api/generated/endpoints/monitoring/monitoring', () => ({
  monitoringControllerAttendance: vi.fn(),
}))

import { monitoringControllerAttendance } from '@/api/generated/endpoints/monitoring/monitoring'
import { fetchMonitoringAttendance } from '@/api/resources/monitoring'
import { dayToMonitoringRange } from '@/features/monitoring/utils/filters'

describe('District AttendanceMonitoringPage (Sprint 5.2)', () => {
  it('LIVE wrapper does not hydrate caregiver attendance via useData()', () => {
    const filePath = path.resolve(__dirname, 'AttendanceMonitoringPage.tsx')
    const content = fs.readFileSync(filePath, 'utf8')

    expect(content).toContain(
      '<DistrictAttendancePageShared children={[]} attendance={[]} />',
    )
    expect(content).toContain('const { children, attendance } = useData()')
    expect(content).toContain('function DistrictAttendancePageMock()')
    expect(content).toContain('useDistrictCenterDayAttendanceRoster')
  })

  it('fetchMonitoringAttendance passes scoped from/to + centerId to generated client', async () => {
    const date = '2026-08-10'
    const range = dayToMonitoringRange(date)

    vi.mocked(monitoringControllerAttendance).mockResolvedValue({
      from: range.from!,
      to: range.to!,
      districtId: null,
      centerId: 'center-1',
      sectorId: null,
      summary: {
        enrolledChildren: 10,
        present: 7,
        absent: 3,
        totalRecords: 10,
        attendanceRate: 70,
      },
      trend: [],
      items: [
        {
          centerId: 'center-1',
          centerName: 'Center 1',
          enrolledChildren: 10,
          present: 7,
          absent: 3,
          rate: 70,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    })

    await fetchMonitoringAttendance({
      centerId: 'center-1',
      from: range.from,
      to: range.to,
      page: 2,
      pageSize: 25,
    })

    expect(monitoringControllerAttendance).toHaveBeenCalledTimes(1)
    expect(monitoringControllerAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        centerId: 'center-1',
        from: range.from,
        to: range.to,
        page: 2,
        pageSize: 25,
      }),
    )
  })
})
