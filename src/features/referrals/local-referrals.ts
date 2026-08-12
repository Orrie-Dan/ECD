import { createUuid } from '@/lib/uuid'
import type { LocalStore } from '@/storage/local-store'
import type {
  LocalReferralRecord,
  OutboxStatus,
  SyncOperationKind,
  SyncOperationRecord,
} from '@/storage/types'
import { findUnsyncedChildCreateOp } from '@/sync/child-dependency'
import {
  buildReferralSyncPayload,
  buildReferralUpdateSyncPayload,
} from '@/sync/referral-sync-mapper'
import type {
  ReferralCreateInput,
  ReferralPatchInput,
  ReferralTerminalStatus,
  ReferralViewModel,
} from '@/models/referral'
import type { ReferralStatus } from '@/types'

const ACTIVE_MUTATION_STATUSES: OutboxStatus[] = ['pending', 'blocked', 'syncing']

export interface ReferralLocalResult {
  referral: ReferralViewModel
  record: LocalReferralRecord
  operationId: string
  savedOnDevice: boolean
}

/** Mirror backend canTransitionReferralStatus — UX safeguard only. */
export function canTransitionReferralStatus(
  from: string,
  to: string,
): boolean {
  if (from !== 'pending') return false
  return to === 'completed' || to === 'cancelled'
}

export function localReferralToViewModel(row: LocalReferralRecord): ReferralViewModel {
  return {
    id: row.id,
    childId: row.childId,
    centerId: row.centerId,
    assessmentId: row.sourceId,
    sourceType: row.sourceType === 'sted' ? 'sted' : 'nutrition',
    date: row.referralDate,
    reason: row.reason,
    status:
      row.status === 'completed' || row.status === 'cancelled' ? row.status : 'pending',
    destination: row.destination,
    implementedAt: row.implementedAt ?? undefined,
    notes: row.notes ?? undefined,
    version: row.version,
    recordedBy: row.recordedById,
  }
}

export async function listReferralsFromLocal(
  store: LocalStore,
  filter?: {
    centerId?: string
    childId?: string
    sourceId?: string
  },
): Promise<LocalReferralRecord[]> {
  return store.listReferrals(filter)
}

async function findActiveReferralMutation(
  store: LocalStore,
  entityId: string,
): Promise<SyncOperationRecord | null> {
  const ops = await store.listOperations({ status: ACTIVE_MUTATION_STATUSES })
  return (
    ops.find((op) => op.entityType === 'referral' && op.entityId === entityId) ?? null
  )
}

async function findActiveReferralCreateForSource(
  store: LocalStore,
  sourceId: string,
): Promise<SyncOperationRecord | null> {
  const ops = await store.listOperations({ status: ACTIVE_MUTATION_STATUSES })
  return (
    ops.find(
      (op) =>
        op.entityType === 'referral' &&
        op.operation === 'create' &&
        op.payload?.sourceId === sourceId,
    ) ?? null
  )
}

/**
 * Standalone local-first referral CREATE.
 * Dedupes by sourceId (local row or active create). Does not recreate
 * Nutrition/STED dependency referrals already present in LocalStore.
 */
export async function createReferralLocalFirst(
  store: LocalStore,
  input: ReferralCreateInput & { recordedById: string; deviceId?: string },
): Promise<ReferralLocalResult> {
  if (!input.centerId) {
    throw new Error('centerId is required to create a referral')
  }

  const existing = await store.getReferralBySourceId(input.assessmentId)
  if (existing) {
    const active = await findActiveReferralMutation(store, existing.id)
    return {
      referral: localReferralToViewModel(existing),
      record: existing,
      operationId: active?.clientOperationId ?? '',
      savedOnDevice: true,
    }
  }

  const activeForSource = await findActiveReferralCreateForSource(store, input.assessmentId)
  if (activeForSource) {
    const row = await store.getReferral(activeForSource.entityId)
    if (row) {
      return {
        referral: localReferralToViewModel(row),
        record: row,
        operationId: activeForSource.clientOperationId,
        savedOnDevice: true,
      }
    }
  }

  const now = new Date().toISOString()
  const referralId = createUuid()
  const opId = createUuid()
  const childDep = await findUnsyncedChildCreateOp(store, input.childId)

  const record: LocalReferralRecord = {
    id: referralId,
    childId: input.childId,
    centerId: input.centerId,
    sourceType: input.sourceType,
    sourceId: input.assessmentId,
    referralDate: input.date,
    reason: input.reason.trim(),
    destination: input.destination.trim(),
    status: 'pending',
    notes: input.notes?.trim() ? input.notes.trim() : null,
    implementedAt: null,
    recordedById: input.recordedById,
    version: 0,
    deletedAt: null,
    lastModifiedAt: now,
    lastModifiedByDeviceId: input.deviceId ?? null,
    _localStatus: 'dirty',
    _updatedAtLocal: now,
  }

  await store.runTransaction(['referrals', 'sync_operations'], 'rw', async (tx) => {
    await tx.putReferral(record)
    await tx.enqueueOperation({
      clientOperationId: opId,
      entityType: 'referral',
      operation: 'create',
      entityId: record.id,
      localId: record.id,
      payload: buildReferralSyncPayload(record),
      version: 0,
      status: childDep ? 'blocked' : 'pending',
      dependsOn: childDep ? [childDep] : [],
      lastError: childDep ? 'Waiting for dependency operations' : undefined,
    })
  })

  return {
    referral: localReferralToViewModel(record),
    record,
    operationId: opId,
    savedOnDevice: true,
  }
}

function resolveMutationOp(
  existing: LocalReferralRecord,
  active: SyncOperationRecord | null,
): { operation: SyncOperationKind; version: number; clientOperationId: string } {
  if (active?.operation === 'create') {
    return {
      operation: 'create',
      version: 0,
      clientOperationId: active.clientOperationId,
    }
  }
  if (active?.operation === 'update') {
    return {
      operation: 'update',
      version: active.version,
      clientOperationId: active.clientOperationId,
    }
  }
  return {
    operation: 'update',
    version: existing.version,
    clientOperationId: createUuid(),
  }
}

/**
 * Local-first terminal status transition (pending → completed | cancelled).
 * Uses CAS version for UPDATE; coalesces into pending CREATE when unsynced.
 */
export async function updateReferralStatusLocalFirst(
  store: LocalStore,
  input: {
    id: string
    status: ReferralTerminalStatus
    implementedAt?: string
    notes?: string
    deviceId?: string
  },
): Promise<ReferralLocalResult> {
  const existing = await store.getReferral(input.id)
  if (!existing || existing.deletedAt) {
    throw new Error(`Referral not found: ${input.id}`)
  }

  if (!canTransitionReferralStatus(existing.status, input.status)) {
    throw new Error(
      `Cannot transition referral from ${existing.status} to ${input.status}`,
    )
  }

  const active = await findActiveReferralMutation(store, existing.id)
  const resolved = resolveMutationOp(existing, active)
  const now = new Date().toISOString()

  const implementedAt =
    input.implementedAt !== undefined
      ? input.implementedAt
      : input.status === 'completed'
        ? existing.implementedAt ?? now.slice(0, 10)
        : existing.implementedAt

  const record: LocalReferralRecord = {
    ...existing,
    status: input.status,
    notes: input.notes !== undefined ? input.notes.trim() || null : existing.notes,
    implementedAt: implementedAt ?? null,
    lastModifiedAt: now,
    lastModifiedByDeviceId: input.deviceId ?? existing.lastModifiedByDeviceId ?? null,
    version: resolved.operation === 'create' ? 0 : existing.version,
    _localStatus: 'dirty',
    _updatedAtLocal: now,
  }

  const payload =
    resolved.operation === 'create'
      ? buildReferralSyncPayload(record)
      : buildReferralUpdateSyncPayload(record)

  await store.runTransaction(['referrals', 'sync_operations'], 'rw', async (tx) => {
    await tx.putReferral(record)
    await tx.enqueueOperation({
      clientOperationId: resolved.clientOperationId,
      entityType: 'referral',
      operation: resolved.operation,
      entityId: record.id,
      localId: record.id,
      payload,
      version: resolved.version,
      status: active?.status === 'blocked' ? 'blocked' : 'pending',
      dependsOn: active?.dependsOn,
      lastError: active?.status === 'blocked' ? active.lastError : undefined,
    })
  })

  return {
    referral: localReferralToViewModel(record),
    record,
    operationId: resolved.clientOperationId,
    savedOnDevice: true,
  }
}

/**
 * Patch notes / implementedAt while pending, or route terminal status via status helper.
 * Notes/implementedAt are SERVER_PERSISTED via sync UPDATE (or coalesced into CREATE).
 */
export async function patchReferralLocalFirst(
  store: LocalStore,
  id: string,
  patch: ReferralPatchInput & { deviceId?: string },
): Promise<ReferralLocalResult> {
  if (patch.status === 'completed' || patch.status === 'cancelled') {
    return updateReferralStatusLocalFirst(store, {
      id,
      status: patch.status,
      implementedAt: patch.implementedAt,
      notes: patch.notes,
      deviceId: patch.deviceId,
    })
  }

  const existing = await store.getReferral(id)
  if (!existing || existing.deletedAt) {
    throw new Error(`Referral not found: ${id}`)
  }

  if (existing.status !== 'pending') {
    throw new Error(`Cannot patch notes on terminal referral status ${existing.status}`)
  }

  const active = await findActiveReferralMutation(store, existing.id)
  const resolved = resolveMutationOp(existing, active)
  const now = new Date().toISOString()

  const record: LocalReferralRecord = {
    ...existing,
    notes: patch.notes !== undefined ? patch.notes.trim() || null : existing.notes,
    implementedAt:
      patch.implementedAt !== undefined ? patch.implementedAt : existing.implementedAt,
    lastModifiedAt: now,
    lastModifiedByDeviceId: patch.deviceId ?? existing.lastModifiedByDeviceId ?? null,
    version: resolved.operation === 'create' ? 0 : existing.version,
    _localStatus: 'dirty',
    _updatedAtLocal: now,
  }

  const payload =
    resolved.operation === 'create'
      ? buildReferralSyncPayload(record)
      : buildReferralUpdateSyncPayload(record)

  await store.runTransaction(['referrals', 'sync_operations'], 'rw', async (tx) => {
    await tx.putReferral(record)
    await tx.enqueueOperation({
      clientOperationId: resolved.clientOperationId,
      entityType: 'referral',
      operation: resolved.operation,
      entityId: record.id,
      localId: record.id,
      payload,
      version: resolved.version,
      status: active?.status === 'blocked' ? 'blocked' : 'pending',
      dependsOn: active?.dependsOn,
      lastError: active?.status === 'blocked' ? active.lastError : undefined,
    })
  })

  return {
    referral: localReferralToViewModel(record),
    record,
    operationId: resolved.clientOperationId,
    savedOnDevice: true,
  }
}

export type { ReferralStatus }
