import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { referrals, sted } from '@/api/query-keys'
import { useCurrentUser } from '@/features/auth'
import { createStedLocalFirst } from '@/features/sted/local-sted'
import { getLocalStore } from '@/storage'
import { getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { tokenStorage } from '@/api/token-storage'
import type { StedAssessmentCreateInput } from '@/models/sted'

/**
 * Invalidate STED caches after local create / pull.
 * When a referral was enqueued with the assessment, also refresh referrals.
 */
export async function invalidateStedQueries(
  queryClient: QueryClient,
  options?: { childId?: string; assessmentId?: string; withReferrals?: boolean },
) {
  const tasks = [queryClient.invalidateQueries({ queryKey: sted.keys.all })]
  if (options?.withReferrals) {
    tasks.push(queryClient.invalidateQueries({ queryKey: referrals.keys.all }))
  }
  if (options?.childId) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: sted.keys.historyWindow(options.childId),
      }),
      queryClient.invalidateQueries({
        queryKey: sted.keys.latest(options.childId),
      }),
    )
  }
  if (options?.assessmentId) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: sted.keys.detail(options.assessmentId),
      }),
    )
  }
  await Promise.all(tasks)
}

/** Local-first create — same path as STED repository (not direct REST). */
export function useCreateStedAssessment() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()
  return useMutation({
    mutationFn: async (input: StedAssessmentCreateInput) => {
      const assessedById = user?.id
      if (!assessedById) {
        throw new Error('authenticated user id is required to create a STED assessment')
      }
      const store = getLocalStore()
      const centerId =
        input.centerId || user.centerId || (await store.getChild(input.childId))?.centerId
      if (!centerId) {
        throw new Error('centerId is required to create a STED assessment')
      }
      const result = await createStedLocalFirst(store, {
        ...input,
        centerId,
        assessedById,
        deviceId: input.deviceId ?? tokenStorage.getDeviceId() ?? undefined,
      })
      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }
      return result
    },
    onSuccess: (data) => {
      void invalidateStedQueries(queryClient, {
        childId: data.assessment.childId,
        assessmentId: data.assessment.id,
        withReferrals: Boolean(data.referral),
      })
    },
  })
}
