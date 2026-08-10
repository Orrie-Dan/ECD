import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { children, growth, monitoring, nutrition, referrals } from '@/api/query-keys'
import { useCurrentUser } from '@/features/auth'
import { createScreeningLocalFirst } from '@/features/nutrition/local-screenings'
import { getLocalStore } from '@/storage'
import { getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import type { GrowthMeasurementCreateInput } from '@/models/growth'

export async function invalidateGrowthQueries(
  queryClient: QueryClient,
  options?: { childId?: string },
) {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: growth.keys.all }),
    queryClient.invalidateQueries({ queryKey: nutrition.keys.all }),
    // Monitoring remains online-only; invalidate so reconnecting sessions refresh aggregates.
    queryClient.invalidateQueries({ queryKey: monitoring.keys.all }),
    queryClient.invalidateQueries({ queryKey: referrals.keys.all }),
  ]
  if (options?.childId) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: growth.keys.child(options.childId) }),
      queryClient.invalidateQueries({ queryKey: growth.keys.history(options.childId) }),
      queryClient.invalidateQueries({ queryKey: growth.keys.latest(options.childId) }),
      queryClient.invalidateQueries({ queryKey: nutrition.keys.child(options.childId) }),
      queryClient.invalidateQueries({ queryKey: nutrition.keys.history(options.childId) }),
      queryClient.invalidateQueries({ queryKey: nutrition.keys.latest(options.childId) }),
      queryClient.invalidateQueries({ queryKey: children.keys.detail(options.childId) }),
    )
  }
  await Promise.all(tasks)
}

/** Local-first create — same path as Growth repository (not direct REST). */
export function useCreateGrowthMeasurement() {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()
  return useMutation({
    mutationFn: async (input: GrowthMeasurementCreateInput) => {
      const recordedById = user?.id
      if (!recordedById) {
        throw new Error('authenticated user id is required to record a screening')
      }
      const store = getLocalStore()
      const centerId =
        user.centerId ?? (await store.getChild(input.childId))?.centerId
      if (!centerId) {
        throw new Error('centerId is required to record a screening')
      }
      const result = await createScreeningLocalFirst(store, {
        childId: input.childId,
        centerId,
        date: input.date,
        weightKg: input.weightKg,
        heightCm: input.heightCm,
        muacCm: input.muacCm,
        headCircumferenceCm: input.headCircumferenceCm,
        notes: input.notes,
        recordedById,
      })
      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }
      return {
        measurement: result.measurement,
        assessment: result.assessment,
      }
    },
    onSuccess: (data) => {
      void invalidateGrowthQueries(queryClient, { childId: data.measurement.childId })
    },
  })
}
