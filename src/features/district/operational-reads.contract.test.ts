import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('@/api/generated/endpoints/attendance/attendance', () => ({
  attendanceControllerFindAll: vi.fn(),
}))

vi.mock('@/api/generated/endpoints/children/children', () => ({
  childrenControllerFindAll: vi.fn(),
}))

vi.mock('@/api/generated/endpoints/referrals/referrals', () => ({
  referralsControllerFindAll: vi.fn(),
}))

vi.mock('@/api/generated/endpoints/reports/reports', () => ({
  reportsControllerEnrollment: vi.fn(),
  reportsControllerDropouts: vi.fn(),
}))

vi.mock('@/api/generated/endpoints/nutrition/nutrition', () => ({
  nutritionControllerGetAlerts: vi.fn(),
}))

import { attendanceControllerFindAll } from '@/api/generated/endpoints/attendance/attendance'
import { childrenControllerFindAll } from '@/api/generated/endpoints/children/children'
import { referralsControllerFindAll } from '@/api/generated/endpoints/referrals/referrals'
import {
  reportsControllerDropouts,
  reportsControllerEnrollment,
} from '@/api/generated/endpoints/reports/reports'
import { nutritionControllerGetAlerts } from '@/api/generated/endpoints/nutrition/nutrition'
import { fetchAttendanceList } from '@/api/resources/attendance'
import { fetchReferralList } from '@/api/resources/referrals'
import { fetchEnrollmentReport, fetchDropoutsReport } from '@/api/resources/reporting'
import { fetchNutritionAlerts } from '@/api/resources/nutrition'

describe('Sprint 5.2 District operational read contracts', () => {
  describe('Attendance', () => {
    it('LIVE page does not use useData() for primary attendance state', () => {
      const filePath = path.resolve(__dirname, '../../pages/district/AttendanceMonitoringPage.tsx')
      const content = fs.readFileSync(filePath, 'utf8')
      expect(content).toContain(
        '<DistrictAttendancePageShared children={[]} attendance={[]} />',
      )
      expect(content).toContain('function DistrictAttendancePageMock()')
      expect(content).toContain('useDistrictCenterDayAttendanceRoster')
      expect(content).not.toMatch(/if\s*\(\s*!data\s*\)\s*return\s+MOCK/)
    })

    it('fetchAttendanceList forwards pagination and server-side filters', async () => {
      vi.mocked(attendanceControllerFindAll).mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        pageSize: 25,
        totalPages: 0,
      })

      await fetchAttendanceList({
        centerId: 'center-1',
        childId: 'child-1',
        startDate: '2026-08-01',
        endDate: '2026-08-10',
        page: 2,
        pageSize: 25,
      })

      expect(attendanceControllerFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          centerId: 'center-1',
          childId: 'child-1',
          startDate: '2026-08-01',
          endDate: '2026-08-10',
          page: 2,
          pageSize: 25,
        }),
      )
    })

    it('center-day roster joins children + attendance without inventing records', async () => {
      vi.mocked(childrenControllerFindAll).mockResolvedValue({
        items: [
          {
            id: 'child-1',
            firstName: 'A',
            lastName: 'B',
            fullName: 'A B',
            dateOfBirth: '2022-01-01',
            sex: 'female',
            status: 'active',
            centerId: 'center-1',
            guardianName: 'G',
            version: 1,
            homeVillageId: 'v1',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          } as never,
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      })
      vi.mocked(attendanceControllerFindAll).mockResolvedValue({
        items: [
          {
            id: 'att-1',
            childId: 'child-1',
            centerId: 'center-1',
            date: '2026-08-10',
            present: true,
            absentReason: null,
            notes: null,
            recordedBy: 'u1',
            version: 1,
            createdAt: '2026-08-10T08:00:00.000Z',
            updatedAt: '2026-08-10T08:00:00.000Z',
          } as never,
        ],
        total: 1,
        page: 1,
        pageSize: 200,
        totalPages: 1,
      })

      const { fetchChildrenList } = await import('@/api/resources/children')
      const { fetchAllAttendance } = await import('@/api/resources/attendance')
      const children = await fetchChildrenList({
        centerId: 'center-1',
        status: 'active',
        page: 1,
        pageSize: 50,
      })
      const attendance = await fetchAllAttendance({
        centerId: 'center-1',
        startDate: '2026-08-10',
        endDate: '2026-08-10',
      })

      expect(children.items).toHaveLength(1)
      expect(attendance).toHaveLength(1)
      expect(attendance[0]?.present).toBe(true)
    })
  })

  describe('Referrals', () => {
    it('LIVE page wires operational GET /referrals (not LiveUnavailable placeholder only)', () => {
      const filePath = path.resolve(__dirname, '../../pages/district/ReferralMonitoringPage.tsx')
      const content = fs.readFileSync(filePath, 'utf8')
      expect(content).toContain('useDistrictReferralList')
      expect(content).toContain('function ReferralMonitoringPageMock()')
      expect(content).toContain(
        'children={[] as Child[]}',
      )
    })

    it('fetchReferralList forwards status, sourceType, pagination', async () => {
      vi.mocked(referralsControllerFindAll).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      })

      await fetchReferralList({
        page: 1,
        pageSize: 50,
        status: 'pending',
        sourceType: 'nutrition',
        centerId: 'c1',
      })

      expect(referralsControllerFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 50,
          status: 'pending',
          sourceType: 'nutrition',
          centerId: 'c1',
        }),
      )
    })
  })

  describe('Dashboard registrations/dropouts', () => {
    it('repository wires reports APIs (not hardcoded null gap)', () => {
      const filePath = path.resolve(__dirname, '../monitoring/repository.ts')
      const content = fs.readFileSync(filePath, 'utf8')
      expect(content).toContain('useEnrollmentReport')
      expect(content).toContain('useDropoutsReport')
      expect(content).toContain('liveEnrollment.data?.summary.newRegistrations')
      expect(content).toContain('liveDropouts.data?.summary.dropouts')
      expect(content).not.toContain('newRegistrations: null as number | null')
    })

    it('enrollment/dropouts report resources call generated clients', async () => {
      vi.mocked(reportsControllerEnrollment).mockResolvedValue({
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-31T23:59:59.999Z',
        districtId: null,
        centerId: null,
        summary: {
          totalEnrolled: 10,
          active: 8,
          archived: 1,
          transferred: 1,
          newRegistrations: 3,
        },
        trend: [],
      } as never)
      vi.mocked(reportsControllerDropouts).mockResolvedValue({
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-31T23:59:59.999Z',
        districtId: null,
        interpretation: {
          dropoutDefinition: 'archived',
          excluded: 'transfers',
          note: '',
        },
        summary: { dropouts: 2, transfersOut: 1 },
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      } as never)

      const enrollment = await fetchEnrollmentReport({
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-31T23:59:59.999Z',
      })
      const dropouts = await fetchDropoutsReport({
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-31T23:59:59.999Z',
      })

      expect(enrollment.summary.newRegistrations).toBe(3)
      expect(dropouts.summary.dropouts).toBe(2)
    })
  })

  describe('Growth / nutrition alerts', () => {
    it('Growth LIVE wires nutrition alerts and screening list', () => {
      const filePath = path.resolve(__dirname, '../../pages/district/GrowthMonitoringPage.tsx')
      const content = fs.readFileSync(filePath, 'utf8')
      expect(content).toContain('useDistrictNutritionAlerts')
      expect(content).toContain('useDistrictNutritionScreenings')
      expect(content).toContain('yearMonthToMonitoringRange')
      expect(content).toContain('function GrowthMonitoringPageMock()')
    })

    it('fetchNutritionAlerts forwards center filter', async () => {
      vi.mocked(nutritionControllerGetAlerts).mockResolvedValue({
        items: [],
        total: 0,
      } as never)

      await fetchNutritionAlerts({ centerId: 'c1', status: 'severe_nutrition' })

      expect(nutritionControllerGetAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          centerId: 'c1',
          status: 'severe_nutrition',
        }),
      )
    })
  })

  describe('Architecture', () => {
    it('District feature hooks do not import LocalStore or useData', () => {
      const root = path.resolve(__dirname)
      const files = [
        'attendance/queries.ts',
        'referrals/queries.ts',
        'nutrition/queries.ts',
        'children/queries.ts',
        'index.ts',
      ]
      for (const rel of files) {
        const content = fs.readFileSync(path.join(root, rel), 'utf8')
        expect(content).not.toMatch(/from ['"]@\/contexts\/AppContext['"]/)
        expect(content).not.toMatch(/from ['"]@\/storage/)
        expect(content).not.toMatch(/\bMOCK_DATA\b/)
        expect(content).not.toMatch(/import\s*\{[^}]*\buseData\b/)
      }
    })
  })
})
