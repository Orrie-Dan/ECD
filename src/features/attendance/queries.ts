import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { attendance, localFirstQueryOptions, queryStaleTimes } from '@/api/query-keys'
import { fetchAllAttendance, fetchAttendanceList } from '@/api/resources/attendance'
import { getLocalStore } from '@/storage'
import {
  listAttendanceFromLocal,
} from '@/features/attendance/local-attendance'
import { mapAttendanceListItemToLocalSeed } from '@/features/attendance/seed-from-rest'
import { networkState } from '@/network/network-state'
import type { AttendanceListFilters, AttendanceViewModel } from '@/models/attendance'

/**
 * LIVE attendance list hydrates from LocalStore (durable).
 * Falls back to REST only when the local snapshot is empty (pre-first-sync).
 * Never falls back to MOCK_ATTENDANCE.
 */
export function useAttendanceList(filters: AttendanceListFilters = {}, enabled = true) {
  return useQuery({
    queryKey: attendance.keys.list(filters),
    queryFn: async () => {
      const store = getLocalStore()
      const localItems = await listAttendanceFromLocal(store, {
        centerId: filters.centerId,
        childId: filters.childId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
      if (localItems.length > 0) {
        return {
          items: localItems,
          total: localItems.length,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? localItems.length,
          totalPages: 1,
        }
      }

      if (!networkState.getSnapshot().isOnline) {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: filters.pageSize ?? 200,
          totalPages: 0,
        }
      }

      try {
        const remote = await fetchAttendanceList(filters)
        await mapAttendanceListItemToLocalSeed(store, remote.items)
        return remote
      } catch {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: filters.pageSize ?? 200,
          totalPages: 0,
        }
      }
    },
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.attendanceList,
    ...localFirstQueryOptions,
  })
}

/** Full window fetch — LocalStore first; REST bootstrap when empty + online. */
export function useAttendanceWindow(
  filters: Omit<AttendanceListFilters, 'page' | 'pageSize'> = {},
  enabled = true,
) {
  return useQuery({
    queryKey: attendance.keys.window(filters),
    queryFn: async (): Promise<AttendanceViewModel[]> => {
      const store = getLocalStore()
      const localItems = await listAttendanceFromLocal(store, filters)
      if (localItems.length > 0) {
        return localItems
      }

      if (!networkState.getSnapshot().isOnline) {
        return []
      }

      try {
        const remote = await fetchAllAttendance(filters)
        await mapAttendanceListItemToLocalSeed(store, remote)
        return remote
      } catch {
        return []
      }
    },
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.attendanceList,
    ...localFirstQueryOptions,
  })
}

export function useChildAttendance(
  childId: string | undefined,
  filters: Omit<AttendanceListFilters, 'childId' | 'page' | 'pageSize'> = {},
  enabled = true,
) {
  return useQuery({
    queryKey: attendance.keys.child(childId ?? '', filters),
    queryFn: async () => {
      if (!childId) return []
      const store = getLocalStore()
      const localItems = await listAttendanceFromLocal(store, { ...filters, childId })
      if (localItems.length > 0) return localItems
      if (!networkState.getSnapshot().isOnline) return []
      try {
        const remote = await fetchAllAttendance({ ...filters, childId })
        await mapAttendanceListItemToLocalSeed(store, remote)
        return remote
      } catch {
        return []
      }
    },
    enabled: env.isLive && enabled && !!childId,
    staleTime: queryStaleTimes.attendanceChild,
    ...localFirstQueryOptions,
  })
}
