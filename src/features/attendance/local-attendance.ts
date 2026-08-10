import { createUuid } from '@/lib/uuid'
import type { LocalStore } from '@/storage/local-store'
import type { LocalAttendanceRecord, OutboxStatus, SyncOperationKind, SyncOperationRecord } from '@/storage/types'
import { buildAttendanceSyncPayload } from '@/sync/attendance-sync-mapper'
import type { AttendanceUpsertInput, AttendanceViewModel } from '@/models/attendance'
import type { AbsentReason, BroughtBy } from '@/types'

const ACTIVE_MUTATION_STATUSES: OutboxStatus[] = ['pending', 'blocked', 'syncing']

export function localAttendanceToViewModel(row: LocalAttendanceRecord): AttendanceViewModel {
  return {
    id: row.id,
    childId: row.childId,
    date: row.date,
    present: row.present,
    absentReason: (row.absentReason as AbsentReason | null) ?? undefined,
    notes: row.notes ?? undefined,
    recordedBy: row.recordedBy,
    version: row.version,
    centerId: row.centerId,
    broughtBy: (row.broughtBy as BroughtBy | null) ?? undefined,
    broughtByOther: row.broughtByOther ?? undefined,
    arrivedAt: row.arrivedAt ?? undefined,
  }
}

export async function listAttendanceFromLocal(
  store: LocalStore,
  filter?: {
    centerId?: string
    childId?: string
    startDate?: string
    endDate?: string
  },
): Promise<AttendanceViewModel[]> {
  const rows = await store.listAttendance(filter)
  return rows.map(localAttendanceToViewModel)
}

async function findActiveMutation(
  store: LocalStore,
  entityId: string,
): Promise<SyncOperationRecord | null> {
  const ops = await store.listOperations({ status: ACTIVE_MUTATION_STATUSES })
  return (
    ops.find(
      (op) => op.entityType === 'attendance_record' && op.entityId === entityId,
    ) ?? null
  )
}

export interface UpsertAttendanceLocalResult {
  record: AttendanceViewModel
  /** True when the write is durable locally and may still be pending sync. */
  savedOnDevice: boolean
}

/**
 * Decide create vs update for outbox:
 * - No prior local row → create (version 0)
 * - Existing row (including soft-deleted occupying natural key) → update with server version
 * - Active unsynced create → keep create + version 0 (coalesce payload)
 */
function resolveUpsertOp(
  existing: LocalAttendanceRecord | null,
  active: SyncOperationRecord | null,
): { operation: SyncOperationKind; version: number; entityId: string } {
  if (!existing) {
    return { operation: 'create', version: 0, entityId: createUuid() }
  }
  if (active?.operation === 'create') {
    return { operation: 'create', version: 0, entityId: existing.id }
  }
  return {
    operation: 'update',
    version: existing.version,
    entityId: existing.id,
  }
}

/**
 * Local-first attendance upsert with natural-key uniqueness (childId + date).
 * Atomically writes the entity + outbox op; reuses clientOperationId when coalescing.
 */
export async function upsertAttendanceLocalFirst(
  store: LocalStore,
  input: AttendanceUpsertInput & { centerId: string; recordedBy: string },
): Promise<UpsertAttendanceLocalResult> {
  const now = new Date().toISOString()
  const existing = await store.getAttendanceByNaturalKey(input.childId, input.date)
  const active = existing ? await findActiveMutation(store, existing.id) : null
  const resolved = resolveUpsertOp(existing, active)
  const clientOperationId = active?.clientOperationId ?? createUuid()

  let arrivedAt: string | null | undefined = input.arrivedAt
  if (input.present) {
    arrivedAt = input.arrivedAt ?? existing?.arrivedAt ?? now
  } else {
    arrivedAt = null
  }

  const row: LocalAttendanceRecord = {
    id: resolved.entityId,
    childId: input.childId,
    centerId: input.centerId,
    date: input.date,
    present: input.present,
    absentReason: input.present ? null : (input.absentReason ?? 'other'),
    notes: input.notes?.trim() ? input.notes.trim() : null,
    recordedBy: input.recordedBy,
    broughtBy: input.present ? (input.broughtBy ?? null) : null,
    broughtByOther: input.present ? (input.broughtByOther ?? null) : null,
    arrivedAt: arrivedAt ?? null,
    version: resolved.operation === 'create' ? 0 : existing!.version,
    deletedAt: null,
    lastModifiedAt: now,
    _localStatus: 'dirty',
    _updatedAtLocal: now,
  }

  const payload = buildAttendanceSyncPayload(row)

  await store.runTransaction(['attendance', 'sync_operations'], 'rw', async (tx) => {
    await tx.putAttendance(row)
    await tx.enqueueOperation({
      clientOperationId,
      entityType: 'attendance_record',
      operation: resolved.operation,
      entityId: row.id,
      localId: row.id,
      payload,
      version: resolved.version,
      status: 'pending',
      lastError: undefined,
    })
  })

  const saved = await store.getAttendance(row.id)
  return {
    record: localAttendanceToViewModel(saved ?? row),
    savedOnDevice: true,
  }
}

/**
 * Soft-delete attendance locally + enqueue delete (row retained for CAS sync).
 * UI filters hide pending_delete / deletedAt rows.
 */
export async function softDeleteAttendanceLocalFirst(
  store: LocalStore,
  childId: string,
  date: string,
): Promise<AttendanceViewModel | null> {
  const existing = await store.getAttendanceByNaturalKey(childId, date)
  if (!existing || existing.deletedAt) return null

  const now = new Date().toISOString()
  const active = await findActiveMutation(store, existing.id)

  // Unsynced create never reached the server — cancel outbox + hide locally.
  if (active?.operation === 'create' && active.status !== 'syncing') {
    await store.runTransaction(['attendance', 'sync_operations'], 'rw', async (tx) => {
      await tx.softDeleteAttendance(existing.id, now, 'pending_delete')
      await tx.updateOperation(active.clientOperationId, {
        status: 'applied',
        lastError: 'Cancelled locally before sync (create never pushed)',
      })
    })
    return localAttendanceToViewModel({
      ...existing,
      deletedAt: now,
      _localStatus: 'pending_delete',
      _updatedAtLocal: now,
    })
  }

  const clientOperationId = active?.clientOperationId ?? createUuid()

  await store.runTransaction(['attendance', 'sync_operations'], 'rw', async (tx) => {
    await tx.softDeleteAttendance(existing.id, now, 'pending_delete')
    await tx.enqueueOperation({
      clientOperationId,
      entityType: 'attendance_record',
      operation: 'delete',
      entityId: existing.id,
      localId: existing.id,
      payload: { id: existing.id },
      version: existing.version,
      status: 'pending',
      lastError: undefined,
    })
  })

  return localAttendanceToViewModel({
    ...existing,
    deletedAt: now,
    _localStatus: 'pending_delete',
    _updatedAtLocal: now,
  })
}
