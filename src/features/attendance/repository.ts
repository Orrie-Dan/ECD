import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { asAttendanceViewModel } from '@/api/mappers/attendance.mapper'
import { useAttendanceWindow } from '@/features/attendance/queries'
import { invalidateAttendanceQueries } from '@/features/attendance/mutations'
import {
  softDeleteAttendanceLocalFirst,
  upsertAttendanceLocalFirst,
} from '@/features/attendance/local-attendance'
import { isCaretaker } from '@/api/roles'
import { MOCK_ATTENDANCE } from '@/lib/mock-data'
import { getLocalStore } from '@/storage'
import { getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { assertLiveApiWritesAvailable } from '@/lib/live-api-guard'
import type { AttendanceViewModel } from '@/models/attendance'
import type { AttendanceRecord, User } from '@/types'

const LIVE_LOOKBACK_DAYS = 40

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

/**
 * Mode-aware attendance data access used by DataProvider.
 * MOCK → in-memory mock list (unchanged).
 * LIVE → LocalStore durable reads/writes + outbox; React Query is UI projection.
 * Never falls back to MOCK_ATTENDANCE when LIVE (online or offline).
 */
export function useAttendanceRepository(user: User | null) {
  const queryClient = useQueryClient()
  const [mockAttendance, setMockAttendance] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE)

  const listFilters = useMemo(
    () => ({
      centerId: isCaretaker(user) ? user?.centerId : undefined,
      startDate: daysAgoIso(LIVE_LOOKBACK_DAYS),
      endDate: todayIso(),
    }),
    [user],
  )

  // District LIVE must not pull district-wide attendance windows into LocalStore.
  const liveQuery = useAttendanceWindow(
    listFilters,
    env.isLive && !!user && isCaretaker(user),
  )

  const attendance: AttendanceRecord[] = useMemo(() => {
    if (!env.isLive) return mockAttendance
    return liveQuery.data ?? []
  }, [liveQuery.data, mockAttendance])

  const attendanceLoading = env.isLive && liveQuery.isLoading
  const attendanceError = env.isLive && liveQuery.isError

  const findCached = useCallback(
    (childId: string, date: string): AttendanceViewModel | undefined => {
      const found = attendance.find((a) => a.childId === childId && a.date === date)
      return found ? asAttendanceViewModel(found) : undefined
    },
    [attendance],
  )

  const recordAttendance = useCallback(
    async (record: Omit<AttendanceRecord, 'id'>) => {
      assertLiveApiWritesAvailable()
      if (env.isMock) {
        setMockAttendance((prev) => {
          const filtered = prev.filter(
            (a) => !(a.childId === record.childId && a.date === record.date),
          )
          const existing = prev.find(
            (a) => a.childId === record.childId && a.date === record.date,
          )

          let arrivedAt: string | undefined
          if (record.present) {
            arrivedAt = record.arrivedAt ?? existing?.arrivedAt ?? new Date().toISOString()
          } else {
            arrivedAt = undefined
          }

          const next: AttendanceRecord = {
            ...record,
            id: String(Date.now()),
            arrivedAt,
            broughtBy: record.present ? record.broughtBy : undefined,
            broughtByOther: record.present ? record.broughtByOther : undefined,
            absentReason: record.present ? undefined : record.absentReason,
            notes: record.notes?.trim() ? record.notes.trim() : undefined,
          }

          return [...filtered, next]
        })
        return
      }

      const existing = findCached(record.childId, record.date)
      const centerId = user?.centerId ?? existing?.centerId
      if (!centerId) throw new Error('centerId is required to record attendance')
      // Sync apply requires recordedById (UUID). UI may pass a display name — ignore for LIVE.
      const recordedById = user?.id
      if (!recordedById) throw new Error('authenticated user id is required to record attendance')

      const store = getLocalStore()
      await upsertAttendanceLocalFirst(store, {
        ...record,
        centerId,
        recordedBy: recordedById,
        version: existing?.version,
      })

      await invalidateAttendanceQueries(queryClient, { childId: record.childId })

      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }
    },
    [findCached, queryClient, user?.centerId, user?.id],
  )

  const clearTodayAttendance = useCallback(
    async (childId: string) => {
      assertLiveApiWritesAvailable()
      const today = todayIso()

      if (env.isMock) {
        setMockAttendance((prev) =>
          prev.filter((a) => !(a.childId === childId && a.date === today)),
        )
        return
      }

      const store = getLocalStore()
      await softDeleteAttendanceLocalFirst(store, childId, today)
      await invalidateAttendanceQueries(queryClient, { childId })

      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }
    },
    [queryClient],
  )

  const getTodayRecord = useCallback(
    (childId: string) => {
      const today = todayIso()
      return attendance.find((a) => a.childId === childId && a.date === today)
    },
    [attendance],
  )

  const getChildAttendance = useCallback(
    (childId: string) => attendance.filter((a) => a.childId === childId),
    [attendance],
  )

  const isPresentToday = useCallback(
    (childId: string) => {
      const today = todayIso()
      return attendance.some((a) => a.childId === childId && a.date === today && a.present)
    },
    [attendance],
  )

  return {
    attendance,
    attendanceLoading,
    attendanceError,
    recordAttendance,
    clearTodayAttendance,
    getChildAttendance,
    getTodayRecord,
    isPresentToday,
  }
}
