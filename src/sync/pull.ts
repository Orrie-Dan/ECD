import { syncControllerPull } from '@/api/generated/endpoints/sync/sync'
import type { LocalStore } from '@/storage/local-store'
import { META_KEYS } from '@/storage/types'
import { mapPullChildToLocal } from '@/sync/child-sync-mapper'
import { mapPullAttendanceToLocal } from '@/sync/attendance-sync-mapper'
import { mapPullNutritionScreeningToLocal } from '@/sync/nutrition-sync-mapper'
import { mapPullReferralToLocal } from '@/sync/referral-sync-mapper'
import {
  mapPullFeedingDayToLocal,
  mapPullFeedingMonthSummaryToLocal,
} from '@/sync/feeding-sync-mapper'
import { mapPullStedAssessmentToLocal } from '@/sync/sted-sync-mapper'
import {
  conflictedEntityIds,
  shouldSkipDirtyPull,
  reconcileDirtyAttendanceSibling,
  reconcileDirtyFeedingDaySibling,
  reconcileDirtyFeedingMonthSibling,
} from '@/sync/apply-local'

/**
 * Pull one page and apply entity buckets into LocalStore.
 * Cursor advances only after successful local persistence of that page.
 */
export async function pullOnce(
  store: LocalStore,
  options?: { deviceId?: string; limit?: number },
): Promise<{ hasMore: boolean }> {
  const cursor = await store.getPullCursor()
  const response = await syncControllerPull({
    cursor: cursor.lastModifiedAt ?? undefined,
    cursorId: cursor.id ?? undefined,
    limit: options?.limit ?? 500,
    deviceId: options?.deviceId,
  })

  const conflictIds = await conflictedEntityIds(store)

  const childRows = [
    ...response.created.child,
    ...response.updated.child,
  ] as Array<Record<string, unknown>>

  const attendanceRows = [
    ...response.created.attendance_record,
    ...response.updated.attendance_record,
  ] as Array<Record<string, unknown>>

  const screeningRows = [
    ...response.created.child_nutrition_screening,
    ...response.updated.child_nutrition_screening,
  ] as Array<Record<string, unknown>>

  const referralRows = [
    ...response.created.referral,
    ...response.updated.referral,
  ] as Array<Record<string, unknown>>

  const feedingDayRows = [
    ...response.created.center_feeding_day,
    ...response.updated.center_feeding_day,
  ] as Array<Record<string, unknown>>

  const feedingMonthRows = [
    ...response.created.center_feeding_month_summary,
    ...response.updated.center_feeding_month_summary,
  ] as Array<Record<string, unknown>>

  const stedRows = [
    ...response.created.sted_assessment,
    ...response.updated.sted_assessment,
  ] as Array<Record<string, unknown>>

  await store.runTransaction(
    [
      'children',
      'attendance',
      'nutrition_screenings',
      'referrals',
      'feeding_days',
      'feeding_month_summaries',
      'sted_assessments',
      'sync_operations',
      'meta',
    ],
    'rw',
    async (tx) => {
      for (const row of childRows) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getChild(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        await tx.putChild(mapPullChildToLocal(row, existing))
      }

      for (const row of response.deleted.child as Array<Record<string, unknown>>) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getChild(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        const deletedAt =
          typeof row.deletedAt === 'string'
            ? row.deletedAt
            : new Date().toISOString()
        if (existing) {
          await tx.softDeleteChild(id, deletedAt, 'clean')
        }
      }

      for (const row of attendanceRows) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getAttendance(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        const mapped = mapPullAttendanceToLocal(row, existing)
        if (mapped.childId && mapped.date) {
          const byKey = await tx.getAttendanceByNaturalKey(mapped.childId, mapped.date)
          if (byKey && byKey.id !== mapped.id) {
            if (shouldSkipDirtyPull(byKey._localStatus, byKey.id, conflictIds)) {
              const reconciled = await reconcileDirtyAttendanceSibling(tx, byKey, mapped)
              await tx.putAttendance(reconciled)
              continue
            }
            await tx.softDeleteAttendance(byKey.id, mapped.lastModifiedAt, 'clean')
          }
        }
        await tx.putAttendance(mapped)
      }

      for (const row of response.deleted.attendance_record as Array<
        Record<string, unknown>
      >) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getAttendance(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        const deletedAt =
          typeof row.deletedAt === 'string'
            ? row.deletedAt
            : new Date().toISOString()
        if (existing) {
          await tx.softDeleteAttendance(id, deletedAt, 'clean')
        }
      }

      for (const row of screeningRows) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getNutritionScreening(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        await tx.putNutritionScreening(mapPullNutritionScreeningToLocal(row, existing))
      }

      for (const row of response.deleted.child_nutrition_screening as Array<
        Record<string, unknown>
      >) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getNutritionScreening(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        const deletedAt =
          typeof row.deletedAt === 'string'
            ? row.deletedAt
            : new Date().toISOString()
        if (existing) {
          await tx.softDeleteNutritionScreening(id, deletedAt, 'clean')
        }
      }

      for (const row of referralRows) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getReferral(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        await tx.putReferral(mapPullReferralToLocal(row, existing))
      }

      for (const row of response.deleted.referral as Array<Record<string, unknown>>) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getReferral(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        const deletedAt =
          typeof row.deletedAt === 'string'
            ? row.deletedAt
            : new Date().toISOString()
        if (existing) {
          await tx.softDeleteReferral(id, deletedAt, 'clean')
        }
      }

      for (const row of feedingDayRows) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getFeedingDay(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        const mapped = mapPullFeedingDayToLocal(row, existing)
        if (mapped.centerId && mapped.date) {
          const byKey = await tx.getFeedingDayByNaturalKey(mapped.centerId, mapped.date)
          if (byKey && byKey.id !== mapped.id) {
            if (shouldSkipDirtyPull(byKey._localStatus, byKey.id, conflictIds)) {
              const reconciled = await reconcileDirtyFeedingDaySibling(tx, byKey, mapped)
              await tx.putFeedingDay(reconciled)
              continue
            }
            await tx.softDeleteFeedingDay(byKey.id, mapped.lastModifiedAt, 'clean')
          }
        }
        await tx.putFeedingDay(mapped)
      }

      for (const row of response.deleted.center_feeding_day as Array<
        Record<string, unknown>
      >) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getFeedingDay(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        const deletedAt =
          typeof row.deletedAt === 'string'
            ? row.deletedAt
            : new Date().toISOString()
        if (existing) {
          await tx.softDeleteFeedingDay(id, deletedAt, 'clean')
        }
      }

      for (const row of feedingMonthRows) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getFeedingMonthSummary(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        const mapped = mapPullFeedingMonthSummaryToLocal(row, existing)
        if (mapped.centerId && mapped.yearMonth) {
          const byKey = await tx.getFeedingMonthSummaryByNaturalKey(
            mapped.centerId,
            mapped.yearMonth,
          )
          if (byKey && byKey.id !== mapped.id) {
            if (shouldSkipDirtyPull(byKey._localStatus, byKey.id, conflictIds)) {
              const reconciled = await reconcileDirtyFeedingMonthSibling(tx, byKey, mapped)
              await tx.putFeedingMonthSummary(reconciled)
              continue
            }
            await tx.softDeleteFeedingMonthSummary(
              byKey.id,
              mapped.lastModifiedAt,
              'clean',
            )
          }
        }
        await tx.putFeedingMonthSummary(mapped)
      }

      for (const row of response.deleted.center_feeding_month_summary as Array<
        Record<string, unknown>
      >) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getFeedingMonthSummary(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        const deletedAt =
          typeof row.deletedAt === 'string'
            ? row.deletedAt
            : new Date().toISOString()
        if (existing) {
          await tx.softDeleteFeedingMonthSummary(id, deletedAt, 'clean')
        }
      }

      for (const row of stedRows) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getStedAssessment(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        await tx.putStedAssessment(mapPullStedAssessmentToLocal(row, existing))
      }

      for (const row of response.deleted.sted_assessment as Array<
        Record<string, unknown>
      >) {
        const id = typeof row.id === 'string' ? row.id : null
        if (!id) continue
        const existing = await tx.getStedAssessment(id)
        if (shouldSkipDirtyPull(existing?._localStatus, id, conflictIds)) continue
        const deletedAt =
          typeof row.deletedAt === 'string'
            ? row.deletedAt
            : new Date().toISOString()
        if (existing) {
          await tx.softDeleteStedAssessment(id, deletedAt, 'clean')
        }
      }

      const next = response.nextCursor
      if (next?.lastModifiedAt && next.id) {
        await tx.setPullCursor({
          lastModifiedAt: next.lastModifiedAt,
          id: next.id,
        })
      }

      await tx.setMeta(META_KEYS.hasLocalSnapshot, 'true')
    },
  )

  return { hasMore: response.hasMore }
}

/** Pull until hasMore is false (bounded pages for safety). */
export async function pullAll(
  store: LocalStore,
  options?: {
    deviceId?: string
    maxPages?: number
    /** Return false to abort between pages (e.g. owner/db identity drift). */
    shouldContinue?: () => boolean
  },
): Promise<void> {
  const maxPages = options?.maxPages ?? 50
  for (let page = 0; page < maxPages; page += 1) {
    if (options?.shouldContinue && !options.shouldContinue()) {
      throw new Error('Local owner changed during sync')
    }
    const { hasMore } = await pullOnce(store, { deviceId: options?.deviceId })
    if (!hasMore) return
    // Guard against hasMore without a usable nextCursor spinning forever.
    if (hasMore && page === maxPages - 1) {
      throw new Error('Pull pagination exceeded max pages')
    }
  }
}
