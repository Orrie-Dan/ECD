import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { isEcdCenterUser } from '@/api/roles'
import { useAuth, useData } from '@/contexts/AppContext'
import { invalidateAttendanceQueries } from '@/features/attendance/mutations'
import {
  runAttendanceAutoAbsentIfDue,
  runMockAttendanceAutoAbsentIfDue,
} from '@/features/attendance/auto-absent'
import { getLocalStore } from '@/storage'
import { getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import type { User } from '@/types'

const CHECK_INTERVAL_MS = 60_000

async function runForUser(
  user: User,
  deps: {
    children: ReturnType<typeof useData>['children']
    attendance: ReturnType<typeof useData>['attendance']
    recordAttendance: ReturnType<typeof useData>['recordAttendance']
    queryClient: ReturnType<typeof useQueryClient>
  },
): Promise<void> {
  if (!user.centerId) return

  if (env.isMock) {
    const result = await runMockAttendanceAutoAbsentIfDue({
      centerId: user.centerId,
      recordedBy: user.name,
      children: deps.children,
      attendance: deps.attendance,
      recordAttendance: deps.recordAttendance,
    })
    if (result.markedCount > 0) {
      await invalidateAttendanceQueries(deps.queryClient)
    }
    return
  }

  const result = await runAttendanceAutoAbsentIfDue(getLocalStore(), {
    centerId: user.centerId,
    recordedByUserId: user.id,
  })

  if (result.markedCount === 0) return

  await invalidateAttendanceQueries(deps.queryClient)
  if (networkState.getSnapshot().isOnline) {
    void getSyncEngine().syncNow()
  }
}

/**
 * Periodically marks unrecorded children as absent after the daily cutoff.
 * Runs for caretakers and ECD directors at their centre.
 */
export function useAttendanceAutoAbsent(): void {
  const { user } = useAuth()
  const { children, attendance, recordAttendance } = useData()
  const queryClient = useQueryClient()
  const running = useRef(false)

  useEffect(() => {
    if (!user || !isEcdCenterUser(user)) return

    const tick = async () => {
      if (running.current) return
      running.current = true
      try {
        await runForUser(user, { children, attendance, recordAttendance, queryClient })
      } finally {
        running.current = false
      }
    }

    void tick()
    const interval = window.setInterval(() => {
      void tick()
    }, CHECK_INTERVAL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user, children, attendance, recordAttendance, queryClient])
}
