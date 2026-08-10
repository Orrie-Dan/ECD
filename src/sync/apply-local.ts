import type { LocalStore } from '@/storage/local-store'
import type { SyncOperationRecord } from '@/storage/types'

/**
 * Infer post-apply server version when the push/session DTO does not return it.
 * create → max(1, clientVersion); update/delete → clientVersion + 1.
 */
export function inferAppliedVersion(op: SyncOperationRecord): number {
  if (op.operation === 'create') {
    return Math.max(1, op.version || 0)
  }
  return op.version + 1
}

/** Mark the matching local entity clean after an outbox op is applied. */
export async function markEntityApplied(
  store: LocalStore,
  op: SyncOperationRecord,
): Promise<void> {
  const version = inferAppliedVersion(op)
  if (op.entityType === 'child') {
    await store.markChildClean(op.entityId, version)
  } else if (op.entityType === 'attendance_record') {
    const row = await store.getAttendance(op.entityId)
    if (!row) return
    if (op.operation === 'delete') {
      await store.putAttendance({
        ...row,
        deletedAt: row.deletedAt ?? new Date().toISOString(),
        version,
        _localStatus: 'clean',
        _updatedAtLocal: new Date().toISOString(),
      })
      return
    }
    await store.markAttendanceClean(op.entityId, version)
  } else if (op.entityType === 'child_nutrition_screening') {
    const row = await store.getNutritionScreening(op.entityId)
    if (!row) return
    if (op.operation === 'delete') {
      await store.putNutritionScreening({
        ...row,
        deletedAt: row.deletedAt ?? new Date().toISOString(),
        version,
        _localStatus: 'clean',
        _updatedAtLocal: new Date().toISOString(),
      })
      return
    }
    await store.markNutritionScreeningClean(op.entityId, version)
  } else if (op.entityType === 'referral') {
    const row = await store.getReferral(op.entityId)
    if (!row) return
    if (op.operation === 'delete') {
      await store.putReferral({
        ...row,
        deletedAt: row.deletedAt ?? new Date().toISOString(),
        version,
        _localStatus: 'clean',
        _updatedAtLocal: new Date().toISOString(),
      })
      return
    }
    await store.markReferralClean(op.entityId, version)
  } else if (op.entityType === 'center_feeding_day') {
    const row = await store.getFeedingDay(op.entityId)
    if (!row) return
    if (op.operation === 'delete') {
      await store.putFeedingDay({
        ...row,
        deletedAt: row.deletedAt ?? new Date().toISOString(),
        version,
        _localStatus: 'clean',
        _updatedAtLocal: new Date().toISOString(),
      })
      return
    }
    await store.markFeedingDayClean(op.entityId, version)
  } else if (op.entityType === 'center_feeding_month_summary') {
    const row = await store.getFeedingMonthSummary(op.entityId)
    if (!row) return
    if (op.operation === 'delete') {
      await store.putFeedingMonthSummary({
        ...row,
        deletedAt: row.deletedAt ?? new Date().toISOString(),
        version,
        _localStatus: 'clean',
        _updatedAtLocal: new Date().toISOString(),
      })
      return
    }
    await store.markFeedingMonthSummaryClean(op.entityId, version)
  } else if (op.entityType === 'sted_assessment') {
    const row = await store.getStedAssessment(op.entityId)
    if (!row) return
    if (op.operation === 'delete') {
      await store.putStedAssessment({
        ...row,
        deletedAt: row.deletedAt ?? new Date().toISOString(),
        version,
        _localStatus: 'clean',
        _updatedAtLocal: new Date().toISOString(),
      })
      return
    }
    await store.markStedAssessmentClean(op.entityId, version)
  }
}

/**
 * Entity ids that have a retained conflict op — pull may overwrite dirty local
 * rows so server CAS state wins while the conflict remains visible in the outbox.
 */
export async function conflictedEntityIds(store: LocalStore): Promise<Set<string>> {
  const conflicts = await store.listOperations({ status: 'conflict' })
  return new Set(conflicts.map((op) => op.entityId))
}

export function shouldSkipDirtyPull(
  localStatus: string | undefined,
  entityId: string,
  conflictIds: Set<string>,
): boolean {
  if (localStatus !== 'dirty' && localStatus !== 'pending_delete') return false
  // Conflicted entities: allow server snapshot to replace local (server wins).
  if (conflictIds.has(entityId)) return false
  return true
}
