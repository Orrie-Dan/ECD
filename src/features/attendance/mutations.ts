import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { attendance, children } from '@/api/query-keys'
import {
  softDeleteAttendanceRequest,
  upsertAttendanceRequest,
} from '@/api/resources/attendance'
import type { AttendanceUpsertInput, AttendanceViewModel } from '@/models/attendance'

/** Shared invalidation for attendance lists + optional child scope. */
export async function invalidateAttendanceQueries(
  queryClient: QueryClient,
  options?: { childId?: string },
) {
  const tasks = [queryClient.invalidateQueries({ queryKey: attendance.keys.all })]
  if (options?.childId) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: attendance.keys.child(options.childId) }),
      queryClient.invalidateQueries({ queryKey: children.keys.detail(options.childId) }),
    )
  }
  await Promise.all(tasks)
}

export function useUpsertAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      record: AttendanceUpsertInput
      centerId?: string
    }) => upsertAttendanceRequest(input.record, { centerId: input.centerId }),
    onSuccess: (data) => {
      void invalidateAttendanceQueries(queryClient, { childId: data.childId })
    },
  })
}

export function useSoftDeleteAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (record: AttendanceViewModel) => softDeleteAttendanceRequest(record),
    onSuccess: (data) => {
      void invalidateAttendanceQueries(queryClient, { childId: data.childId })
    },
  })
}
