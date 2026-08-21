import { fetchChildDetail } from '@/api/resources/children'
import { TransferStatus } from '@/api/generated/models/transferStatus'
import type { TransferResponseDto } from '@/api/generated/models/transferResponseDto'
import type { LocalStore } from '@/storage/local-store'
import type { LocalChildRecord } from '@/storage/types'
import { mapChildListItemToLocalSeed } from '@/features/children/seed-from-rest'

/** Source centre: child is leaving — stop counting them locally until sync confirms. */
export async function markChildPendingTransferLocal(
  store: LocalStore,
  childId: string,
): Promise<void> {
  const existing = await store.getChild(childId)
  if (!existing || existing.status !== 'active') return
  const now = new Date().toISOString()
  await store.putChild({
    ...existing,
    status: 'transferred',
    lastModifiedAt: now,
    _localStatus: 'clean',
  })
}

/** Origin centre: accepted transfer — child must not remain enrolled locally. */
export async function markChildTransferredOutLocal(
  store: LocalStore,
  childId: string,
): Promise<void> {
  const existing = await store.getChild(childId)
  if (!existing || existing.deletedAt) return
  if (existing.status === 'transferred') return
  const now = new Date().toISOString()
  await store.putChild({
    ...existing,
    status: 'transferred',
    classroomId: undefined,
    classroomGrade: undefined,
    lastModifiedAt: now,
    _localStatus: 'clean',
  })
}

/** Pending transfer cancelled — restore active enrollment at source centre. */
export async function revertChildPendingTransferLocal(
  store: LocalStore,
  childId: string,
): Promise<void> {
  const existing = await store.getChild(childId)
  if (!existing || existing.status !== 'transferred') return
  const now = new Date().toISOString()
  await store.putChild({
    ...existing,
    status: 'active',
    lastModifiedAt: now,
    _localStatus: 'clean',
  })
}

/** Refresh a child row from REST after transfer accept/cancel (both centres). */
export async function refreshChildFromApiLocal(
  store: LocalStore,
  childId: string,
): Promise<void> {
  const detail = await fetchChildDetail(childId)
  await mapChildListItemToLocalSeed(store, [detail])
}

/**
 * Keep origin LocalStore aligned with outgoing transfer outcomes.
 * Destination accept refreshes the dest device; origin often keeps a stale `active` row.
 */
export async function reconcileOutgoingTransfersLocal(
  store: LocalStore,
  transfers: ReadonlyArray<Pick<TransferResponseDto, 'childId' | 'status' | 'fromCenterId'>>,
): Promise<boolean> {
  let changed = false

  for (const transfer of transfers) {
    const existing = await store.getChild(transfer.childId)
    if (!existing || existing.deletedAt) continue

    if (transfer.status === TransferStatus.pending) {
      if (existing.status === 'active') {
        await markChildPendingTransferLocal(store, transfer.childId)
        changed = true
      }
      continue
    }

    if (transfer.status !== TransferStatus.accepted) continue

    // Still looks enrolled at the origin after an accepted outbound transfer.
    if (existing.status !== 'active' || existing.centerId !== transfer.fromCenterId) {
      continue
    }

    try {
      await refreshChildFromApiLocal(store, transfer.childId)
    } catch {
      await markChildTransferredOutLocal(store, transfer.childId)
    }
    changed = true
  }

  return changed
}

/**
 * Adjust a pulled child so origin devices do not keep dual enrollment after a move,
 * and so a local pending `transferred` mark is not overwritten by server `active`.
 */
export function adjustPulledChildForLocalCenter(
  mapped: LocalChildRecord,
  existing: LocalChildRecord | null | undefined,
  localCenterId: string | null,
): LocalChildRecord {
  if (
    localCenterId &&
    existing &&
    !existing.deletedAt &&
    existing.centerId === localCenterId &&
    mapped.centerId &&
    mapped.centerId !== localCenterId
  ) {
    return {
      ...mapped,
      centerId: existing.centerId,
      centerName: existing.centerName,
      status: 'transferred',
      classroomId: undefined,
      classroomGrade: undefined,
    }
  }

  if (
    existing &&
    !existing.deletedAt &&
    existing.status === 'transferred' &&
    mapped.status === 'active' &&
    mapped.centerId === existing.centerId
  ) {
    return {
      ...mapped,
      status: 'transferred',
      centerName: existing.centerName || mapped.centerName,
    }
  }

  return mapped
}

/**
 * Apply an opaque sync `child_transfer` snapshot onto a local child row (origin devices).
 * Returns null when no local write is needed.
 */
export function applyPulledTransferToLocalChild(
  existing: LocalChildRecord,
  row: Record<string, unknown>,
  localCenterId: string | null,
): LocalChildRecord | null {
  if (existing.deletedAt) return null

  const status = typeof row.status === 'string' ? row.status : null
  const fromCenterId = typeof row.fromCenterId === 'string' ? row.fromCenterId : null
  if (!status) return null

  // Only adjust children that still belong to this device's centre.
  if (localCenterId && existing.centerId !== localCenterId) return null
  if (fromCenterId && existing.centerId !== fromCenterId) return null

  const now =
    typeof row.lastModifiedAt === 'string' && row.lastModifiedAt
      ? row.lastModifiedAt
      : new Date().toISOString()

  if (status === TransferStatus.pending && existing.status === 'active') {
    return {
      ...existing,
      status: 'transferred',
      lastModifiedAt: now,
      _localStatus: 'clean',
    }
  }

  if (status === TransferStatus.accepted && existing.status === 'active') {
    return {
      ...existing,
      status: 'transferred',
      classroomId: undefined,
      classroomGrade: undefined,
      lastModifiedAt: now,
      _localStatus: 'clean',
    }
  }

  if (status === TransferStatus.cancelled && existing.status === 'transferred') {
    return {
      ...existing,
      status: 'active',
      lastModifiedAt: now,
      _localStatus: 'clean',
    }
  }

  return null
}
