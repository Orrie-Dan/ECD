import type { LocalStore } from '@/storage/local-store'
import type {
  LocalAttendanceRecord,
  LocalFeedingDayRecord,
  LocalFeedingMonthSummaryRecord,
  SyncableEntityType,
  SyncOperationRecord,
} from '@/storage/types'

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
  if (conflictIds.has(entityId)) return false
  return true
}

type NaturalKeySibling = {
  id: string
  version: number
  lastModifiedAt: string
  _localStatus: string
}

/**
 * Device B has a dirty local UUID that collides with a server row on the same
 * domain natural key. Adopt the server identity. Keep newer field values.
 * Do not delete the outbox; retarget it or mark create as applied.
 */
export async function reconcileDirtyNaturalKeySibling<T extends NaturalKeySibling>(
  store: LocalStore,
  sibling: T,
  server: T,
  options: {
    entityType: SyncableEntityType
    conflictReason: string
    softDelete: (id: string, deletedAt: string) => Promise<void>
  },
): Promise<T> {
  const ops = await store.listOperations({
    status: ['pending', 'blocked', 'syncing', 'failed'],
  })
  const related = ops.filter(
    (op) => op.entityType === options.entityType && op.entityId === sibling.id,
  )

  const localTs = Date.parse(String(sibling.lastModifiedAt))
  const serverTs = Date.parse(server.lastModifiedAt)
  const localNewer = Number.isFinite(localTs) && localTs > serverTs

  if (localNewer) {
    const merged: T = {
      ...sibling,
      id: server.id,
      version: server.version,
      _localStatus: 'dirty',
    }
    for (const op of related) {
      await store.updateOperation(op.clientOperationId, {
        entityId: server.id,
        localId: server.id,
        operation: op.operation === 'create' ? 'update' : op.operation,
        version: server.version,
        status: op.status === 'failed' ? 'pending' : op.status,
        payload: op.payload ? { ...op.payload } : op.payload,
      })
    }
    await options.softDelete(sibling.id, server.lastModifiedAt)
    return merged
  }

  for (const op of related) {
    if (op.operation === 'create') {
      await store.updateOperation(op.clientOperationId, {
        status: 'applied',
        lastError: undefined,
        entityId: server.id,
      })
    } else {
      await store.updateOperation(op.clientOperationId, {
        entityId: server.id,
        localId: server.id,
        version: server.version,
        status: 'conflict',
        lastError: options.conflictReason,
      })
    }
  }
  await options.softDelete(sibling.id, server.lastModifiedAt)
  return { ...server, _localStatus: 'clean' }
}

/** Attendance natural key: (childId, date). */
export async function reconcileDirtyAttendanceSibling(
  store: LocalStore,
  sibling: LocalAttendanceRecord,
  server: LocalAttendanceRecord,
): Promise<LocalAttendanceRecord> {
  return reconcileDirtyNaturalKeySibling(store, sibling, server, {
    entityType: 'attendance_record',
    conflictReason: 'Cross-device attendance natural-key conflict',
    softDelete: (id, deletedAt) => store.softDeleteAttendance(id, deletedAt, 'clean'),
  })
}

/** Feeding day natural key: (centerId, date) ↔ @@unique([centerId, recordedDate]). */
export async function reconcileDirtyFeedingDaySibling(
  store: LocalStore,
  sibling: LocalFeedingDayRecord,
  server: LocalFeedingDayRecord,
): Promise<LocalFeedingDayRecord> {
  return reconcileDirtyNaturalKeySibling(store, sibling, server, {
    entityType: 'center_feeding_day',
    conflictReason: 'Cross-device feeding-day natural-key conflict',
    softDelete: (id, deletedAt) => store.softDeleteFeedingDay(id, deletedAt, 'clean'),
  })
}

/** Feeding month natural key: (centerId, yearMonth). */
export async function reconcileDirtyFeedingMonthSibling(
  store: LocalStore,
  sibling: LocalFeedingMonthSummaryRecord,
  server: LocalFeedingMonthSummaryRecord,
): Promise<LocalFeedingMonthSummaryRecord> {
  return reconcileDirtyNaturalKeySibling(store, sibling, server, {
    entityType: 'center_feeding_month_summary',
    conflictReason: 'Cross-device feeding-month natural-key conflict',
    softDelete: (id, deletedAt) =>
      store.softDeleteFeedingMonthSummary(id, deletedAt, 'clean'),
  })
}
