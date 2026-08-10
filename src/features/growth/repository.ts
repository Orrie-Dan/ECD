import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { useGrowthRoster } from '@/features/growth/queries'
import { invalidateGrowthQueries } from '@/features/growth/mutations'
import { buildAssessmentFromMeasurement } from '@/features/growth/utils/calculations'
import {
  appendScreeningCorrectionLocalFirst,
  createScreeningLocalFirst,
} from '@/features/nutrition/local-screenings'
import { MOCK_GROWTH_MEASUREMENTS } from '@/lib/mock-data'
import { getLocalStore } from '@/storage'
import { getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import type { GrowthMeasurement, NutritionAssessment, User } from '@/types'

/**
 * Mode-aware growth measurements for DataProvider.
 * Assessments are owned by `useNutritionRepository` (synced on MOCK writes).
 *
 * LIVE: LocalStore + outbox (append-only child_nutrition_screening).
 * Backend has no update/delete for screenings.
 * LIVE update appends a new screening; LIVE delete is a local/UI no-op (no DELETE enqueue).
 * Never falls back to MOCK_GROWTH_MEASUREMENTS when LIVE.
 */
export function useGrowthRepository(childIds: string[], user: User | null = null) {
  const queryClient = useQueryClient()
  const [mockMeasurements, setMockMeasurements] =
    useState<GrowthMeasurement[]>(MOCK_GROWTH_MEASUREMENTS)

  const liveQuery = useGrowthRoster(childIds, env.isLive && childIds.length > 0)

  const growthMeasurements: GrowthMeasurement[] = useMemo(() => {
    if (!env.isLive) return mockMeasurements
    return liveQuery.data ?? []
  }, [liveQuery.data, mockMeasurements])

  const growthLoading = env.isLive && liveQuery.isLoading
  const growthError = env.isLive && liveQuery.isError

  const recordMeasurement = useCallback(
    async (
      record: Omit<GrowthMeasurement, 'id'>,
    ): Promise<{ measurement: GrowthMeasurement; assessment: NutritionAssessment }> => {
      if (env.isMock) {
        const id = `g${Date.now()}`
        const next: GrowthMeasurement = {
          ...record,
          id,
          notes: record.notes?.trim() ? record.notes.trim() : undefined,
        }
        const assessment = buildAssessmentFromMeasurement(next, `na${Date.now()}`)
        setMockMeasurements((prev) => [...prev, next])
        return { measurement: next, assessment }
      }

      const recordedById = user?.id
      if (!recordedById) {
        throw new Error('authenticated user id is required to record a screening')
      }
      const centerId =
        user?.centerId ??
        (await getLocalStore().getChild(record.childId))?.centerId
      if (!centerId) {
        throw new Error('centerId is required to record a screening')
      }

      const store = getLocalStore()
      const result = await createScreeningLocalFirst(store, {
        childId: record.childId,
        centerId,
        date: record.date,
        weightKg: record.weightKg,
        heightCm: record.heightCm,
        muacCm: record.muacCm,
        headCircumferenceCm: record.headCircumferenceCm,
        notes: record.notes,
        recordedById,
      })

      await invalidateGrowthQueries(queryClient, { childId: record.childId })

      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }

      return {
        measurement: result.measurement,
        assessment: result.assessment,
      }
    },
    [queryClient, user?.centerId, user?.id],
  )

  /**
   * Append-only correction: creates a NEW screening (new UUID).
   * Does NOT enqueue UPDATE / mutate the previous screening id.
   */
  const updateMeasurement = useCallback(
    async (
      id: string,
      data: Partial<Omit<GrowthMeasurement, 'id' | 'childId'>>,
    ): Promise<{ assessment: NutritionAssessment } | undefined> => {
      if (env.isMock) {
        const current = mockMeasurements.find((m) => m.id === id)
        if (!current) return undefined
        const next: GrowthMeasurement = {
          ...current,
          ...data,
          notes: data.notes !== undefined ? data.notes.trim() || undefined : current.notes,
        }
        const assessment = buildAssessmentFromMeasurement(next, `na${Date.now()}`)
        setMockMeasurements((prev) => prev.map((m) => (m.id === id ? next : m)))
        return { assessment }
      }

      const recordedById = user?.id
      if (!recordedById) {
        throw new Error('authenticated user id is required to record a screening')
      }
      const existing = growthMeasurements.find((m) => m.id === id)
      const centerId =
        user?.centerId ??
        (existing
          ? (await getLocalStore().getNutritionScreening(existing.id))?.centerId
          : undefined) ??
        (existing
          ? (await getLocalStore().getChild(existing.childId))?.centerId
          : undefined)
      if (!centerId) {
        throw new Error('centerId is required to record a screening')
      }

      const store = getLocalStore()
      const result = await appendScreeningCorrectionLocalFirst(store, id, {
        centerId,
        recordedById,
        date: data.date,
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        muacCm: data.muacCm,
        headCircumferenceCm: data.headCircumferenceCm,
        notes: data.notes,
      })

      await invalidateGrowthQueries(queryClient, { childId: result.measurement.childId })

      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }

      return { assessment: result.assessment }
    },
    [growthMeasurements, mockMeasurements, queryClient, user?.centerId, user?.id],
  )

  const deleteMeasurement = useCallback(
    async (id: string): Promise<{ measurementId: string } | undefined> => {
      if (env.isMock) {
        setMockMeasurements((prev) => prev.filter((m) => m.id !== id))
        return { measurementId: id }
      }
      // Backend has no screening DELETE via product REST; do not invent offline delete.
      const existing = growthMeasurements.find((m) => m.id === id)
      if (existing) {
        await invalidateGrowthQueries(queryClient, { childId: existing.childId })
        return { measurementId: id }
      }
      return undefined
    },
    [growthMeasurements, queryClient],
  )

  const getChildMeasurements = useCallback(
    (childId: string) => growthMeasurements.filter((m) => m.childId === childId),
    [growthMeasurements],
  )

  return {
    growthMeasurements,
    growthLoading,
    growthError,
    recordMeasurement,
    updateMeasurement,
    deleteMeasurement,
    getChildMeasurements,
  }
}
