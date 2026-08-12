import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { useStedRoster } from '@/features/sted/queries'
import { invalidateStedQueries } from '@/features/sted/mutations'
import { createStedLocalFirst } from '@/features/sted/local-sted'
import { isPhysicalClear } from '@/lib/sted-utils'
import { MOCK_STED_ASSESSMENTS } from '@/lib/mock-data'
import { getLocalStore } from '@/storage'
import { getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { assertLiveApiWritesAvailable } from '@/lib/live-api-guard'
import { tokenStorage } from '@/api/token-storage'
import type { StedAssessmentCreateInput } from '@/models/sted'
import type { StedAssessment, User } from '@/types'

/**
 * Mode-aware STED data access used by DataProvider.
 * MOCK → MOCK_STED_ASSESSMENTS; LIVE → LocalStore (append-only sted_assessment).
 *
 * LIVE never falls back to MOCK_STED_ASSESSMENTS.
 * Referral CREATE (when outcome.referred) is atomic with STED in LocalStore
 * via dependsOn — AppContext must not REST-create a second referral on LIVE.
 */
export function useStedRepository(childIds: string[], user: User | null = null) {
  const queryClient = useQueryClient()
  const [mockAssessments, setMockAssessments] =
    useState<StedAssessment[]>(MOCK_STED_ASSESSMENTS)

  const liveQuery = useStedRoster(childIds, env.isLive && childIds.length > 0)

  const stedAssessments: StedAssessment[] = useMemo(() => {
    if (!env.isLive) return mockAssessments
    return liveQuery.data ?? []
  }, [liveQuery.data, mockAssessments])

  const stedLoading = env.isLive && childIds.length > 0 && liveQuery.isLoading
  const stedError = env.isLive && childIds.length > 0 && liveQuery.isError

  const createStedAssessment = useCallback(
    async (input: StedAssessmentCreateInput): Promise<StedAssessment> => {
      assertLiveApiWritesAvailable()
      const noProblem =
        input.noProblem ?? isPhysicalClear(input.physical)

      if (env.isMock) {
        const next: StedAssessment = {
          ...input,
          id: `sted${Date.now()}`,
          noProblem,
          notes: input.notes?.trim() ? input.notes.trim() : undefined,
        }
        setMockAssessments((prev) => [...prev, next])
        return next
      }

      const assessedById = user?.id
      if (!assessedById) {
        throw new Error('authenticated user id is required to create a STED assessment')
      }

      const store = getLocalStore()
      const centerId =
        input.centerId ||
        user?.centerId ||
        (await store.getChild(input.childId))?.centerId
      if (!centerId) {
        throw new Error('centerId is required to create a STED assessment')
      }

      const deviceId = input.deviceId ?? tokenStorage.getDeviceId() ?? undefined

      const result = await createStedLocalFirst(store, {
        ...input,
        centerId,
        noProblem,
        assessedById,
        deviceId,
      })

      await invalidateStedQueries(queryClient, {
        childId: input.childId,
        assessmentId: result.assessment.id,
        withReferrals: Boolean(result.referral),
      })

      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }

      return result.assessment
    },
    [queryClient, user?.centerId, user?.id],
  )

  const getChildStedAssessments = useCallback(
    (childId: string) => stedAssessments.filter((a) => a.childId === childId),
    [stedAssessments],
  )

  return {
    stedAssessments,
    stedLoading,
    stedError,
    createStedAssessment,
    getChildStedAssessments,
  }
}
