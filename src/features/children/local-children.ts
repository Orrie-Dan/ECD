import { createUuid } from '@/lib/uuid'
import { buildRegistrationNumber } from '@/lib/mock-data'
import type { LocalStore } from '@/storage/local-store'
import type { LocalChildRecord, OutboxStatus, SyncOperationRecord } from '@/storage/types'
import {
  buildChildCreateSyncPayload,
  buildChildUpdateSyncPayload,
  splitFullName,
  villageCacheKey,
} from '@/sync/child-sync-mapper'
import { VILLAGE_REFERENCE_BLOCKED_ERROR } from '@/sync/failure-class'
import type { ArchiveChildInput, Child, ChildRegistrationForm } from '@/types'
import type { ChildViewModel } from '@/models/child'

const ACTIVE_MUTATION_STATUSES: OutboxStatus[] = ['pending', 'blocked', 'syncing']

/** Thrown when an offline edit needs fields that sync CAS cannot apply yet. */
export class ChildUpdateRequiresOnlineError extends Error {
  constructor(message = 'CHILD_UPDATE_REQUIRES_ONLINE') {
    super(message)
    this.name = 'ChildUpdateRequiresOnlineError'
  }
}

export interface ChildLocalMutationResult {
  child: ChildViewModel
  operationId: string
  savedOnDevice: boolean
}

export function localChildToViewModel(row: LocalChildRecord): ChildViewModel {
  return {
    id: row.id,
    fullName: row.fullName,
    dateOfBirth: row.dateOfBirth,
    gender: row.gender as Child['gender'],
    specialNeeds: row.specialNeeds,
    guardianName: row.guardianName,
    guardianPhone: row.guardianPhone,
    guardianRelation: row.guardianRelation as Child['guardianRelation'],
    guardian2Name: row.guardian2Name,
    guardian2Phone: row.guardian2Phone,
    guardian2Relation: row.guardian2Relation as Child['guardian2Relation'],
    province: row.province,
    district: row.district,
    sector: row.sector,
    cell: row.cell,
    village: row.village,
    registeredAt: row.registeredAt,
    status: row.status,
    registrationNumber: row.registrationNumber,
    centerId: row.centerId,
    centerName: row.centerName,
    archivedAt: row.archivedAt,
    archiveReason: row.archiveReason,
    version: row.version,
    homeVillageId: row.homeVillageId,
    notes: row.notes,
    firstName: row.firstName,
    middleName: row.middleName ?? undefined,
    lastName: row.lastName ?? undefined,
    classroomId: row.classroomId,
    classroomGrade: row.classroomGrade as Child['classroomGrade'],
  }
}

export interface CreateLocalChildInput {
  form: ChildRegistrationForm
  centerId: string
  centerName: string
  homeVillageId: string | null
  /** When false, enqueue as blocked until village resolved. */
  villageResolved: boolean
}

/**
 * Atomically persist a new child + outbox create operation.
 * Uses client-generated UUID as entityId (no Date.now() identity).
 */
export async function createChildLocalFirst(
  store: LocalStore,
  input: CreateLocalChildInput,
): Promise<ChildViewModel> {
  const id = createUuid()
  const clientOperationId = createUuid()
  const registeredAt = new Date().toISOString().slice(0, 10)
  const names = splitFullName(input.form.fullName)
  const registrationNumber = buildRegistrationNumber(id.replace(/-/g, '').slice(-4), registeredAt)
  const homeVillageId = input.homeVillageId ?? ''
  const now = new Date().toISOString()

  const child: LocalChildRecord = {
    id,
    version: 0,
    deletedAt: null,
    lastModifiedAt: now,
    _localStatus: 'dirty',
    registrationNumber,
    firstName: names.firstName,
    middleName: names.middleName,
    lastName: names.lastName,
    fullName: input.form.fullName.trim(),
    centerId: input.centerId,
    centerName: input.centerName,
    dateOfBirth: input.form.dateOfBirth,
    gender: input.form.gender,
    status: 'active',
    specialNeeds: input.form.specialNeeds.trim() || undefined,
    guardianName: input.form.guardianName.trim(),
    guardianPhone: input.form.guardianPhone.trim(),
    guardianRelation: input.form.guardianRelation || 'ikindi',
    guardian2Name: input.form.guardian2Name.trim() || undefined,
    guardian2Phone: input.form.guardian2Phone.trim() || undefined,
    guardian2Relation: input.form.guardian2Relation || undefined,
    homeVillageId,
    registeredAt,
    province: input.form.province,
    district: input.form.district,
    sector: input.form.sector,
    cell: input.form.cell,
    village: input.form.village,
  }

  const payload = buildChildCreateSyncPayload(child)
  const opStatus = input.villageResolved && homeVillageId ? 'pending' : 'blocked'

  await store.runTransaction(['children', 'sync_operations', 'village_cache'], 'rw', async (tx) => {
    await tx.putChild(child)
    await tx.enqueueOperation({
      clientOperationId,
      entityType: 'child',
      operation: 'create',
      entityId: id,
      localId: id,
      payload,
      version: 0,
      status: opStatus,
      lastError: opStatus === 'blocked' ? VILLAGE_REFERENCE_BLOCKED_ERROR : undefined,
    })

    if (homeVillageId) {
      await tx.putVillageCache({
        key: villageCacheKey({
          district: input.form.district,
          sector: input.form.sector,
          cell: input.form.cell,
          village: input.form.village,
        }),
        homeVillageId,
        updatedAt: now,
      })
    }
  })

  return localChildToViewModel(child)
}

async function findActiveChildMutation(
  store: LocalStore,
  entityId: string,
): Promise<SyncOperationRecord | null> {
  const ops = await store.listOperations({ status: ACTIVE_MUTATION_STATUSES })
  return ops.find((op) => op.entityType === 'child' && op.entityId === entityId) ?? null
}

function resolveChildMutationOp(
  existing: LocalChildRecord,
  active: SyncOperationRecord | null,
): {
  operation: 'create' | 'update'
  version: number
  clientOperationId: string
  status: OutboxStatus
  dependsOn?: string[]
  lastError?: string
} {
  if (active?.operation === 'create') {
    return {
      operation: 'create',
      version: 0,
      clientOperationId: active.clientOperationId,
      status: active.status,
      dependsOn: active.dependsOn,
      lastError: active.lastError,
    }
  }
  if (active?.operation === 'update') {
    return {
      operation: 'update',
      version: active.version,
      clientOperationId: active.clientOperationId,
      status: active.status === 'blocked' ? 'blocked' : 'pending',
      dependsOn: active.dependsOn,
      lastError: active.status === 'blocked' ? active.lastError : undefined,
    }
  }
  return {
    operation: 'update',
    version: existing.version,
    clientOperationId: createUuid(),
    status: 'pending',
  }
}

/**
 * Fields the sync CAS child update applies. Edits outside this set need online REST.
 */
export function childPatchRequiresOnlineRest(
  existing: LocalChildRecord,
  patch: Partial<Child> & { homeVillageId?: string },
): boolean {
  if (patch.dateOfBirth !== undefined && patch.dateOfBirth !== existing.dateOfBirth) return true
  if (patch.gender !== undefined && patch.gender !== existing.gender) return true
  if (patch.homeVillageId !== undefined && patch.homeVillageId !== existing.homeVillageId) return true
  // Location display fields imply village re-resolution (not in sync CAS).
  if (patch.district !== undefined && patch.district !== existing.district) return true
  if (patch.sector !== undefined && patch.sector !== existing.sector) return true
  if (patch.cell !== undefined && patch.cell !== existing.cell) return true
  if (patch.village !== undefined && patch.village !== existing.village) return true
  return false
}

function applyChildPatchToLocal(
  existing: LocalChildRecord,
  patch: Partial<Child> & { homeVillageId?: string; notes?: string },
): LocalChildRecord {
  const fullName = patch.fullName?.trim() ?? existing.fullName
  const names =
    patch.fullName !== undefined ? splitFullName(fullName) : {
      firstName: existing.firstName,
      middleName: existing.middleName,
      lastName: existing.lastName,
    }

  return {
    ...existing,
    fullName,
    firstName: names.firstName || existing.firstName,
    middleName: names.middleName,
    lastName: names.lastName,
    dateOfBirth: patch.dateOfBirth ?? existing.dateOfBirth,
    gender: patch.gender ?? existing.gender,
    specialNeeds:
      patch.specialNeeds !== undefined
        ? patch.specialNeeds.trim() || undefined
        : existing.specialNeeds,
    guardianName: patch.guardianName?.trim() ?? existing.guardianName,
    guardianPhone: patch.guardianPhone?.trim() ?? existing.guardianPhone,
    guardianRelation: (patch.guardianRelation as string | undefined) ?? existing.guardianRelation,
    guardian2Name:
      patch.guardian2Name !== undefined
        ? patch.guardian2Name.trim() || undefined
        : existing.guardian2Name,
    guardian2Phone:
      patch.guardian2Phone !== undefined
        ? patch.guardian2Phone.trim() || undefined
        : existing.guardian2Phone,
    guardian2Relation:
      patch.guardian2Relation !== undefined
        ? (patch.guardian2Relation as string | undefined) || undefined
        : existing.guardian2Relation,
    province: patch.province ?? existing.province,
    district: patch.district ?? existing.district,
    sector: patch.sector ?? existing.sector,
    cell: patch.cell ?? existing.cell,
    village: patch.village ?? existing.village,
    homeVillageId: patch.homeVillageId ?? existing.homeVillageId,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    status: patch.status ?? existing.status,
    archivedAt:
      patch.archivedAt !== undefined
        ? patch.archivedAt || undefined
        : existing.archivedAt,
    archiveReason:
      patch.archiveReason !== undefined
        ? patch.archiveReason || undefined
        : existing.archiveReason,
  }
}

/**
 * Local-first child UPDATE (names, guardians, special needs, status/archive).
 * Coalesces into pending CREATE when the child has never reached the server.
 * Throws ChildUpdateRequiresOnlineError when DOB/gender/village must change offline.
 */
export async function updateChildLocalFirst(
  store: LocalStore,
  id: string,
  patch: Partial<Child> & { homeVillageId?: string; notes?: string },
  options?: { allowOnlineOnlyFields?: boolean },
): Promise<ChildLocalMutationResult> {
  const existing = await store.getChild(id)
  if (!existing || existing.deletedAt) {
    throw new Error(`Child not found: ${id}`)
  }

  if (!options?.allowOnlineOnlyFields && childPatchRequiresOnlineRest(existing, patch)) {
    throw new ChildUpdateRequiresOnlineError()
  }

  const active = await findActiveChildMutation(store, existing.id)
  const resolved = resolveChildMutationOp(existing, active)
  const now = new Date().toISOString()
  const next = applyChildPatchToLocal(existing, patch)
  const record: LocalChildRecord = {
    ...next,
    version: resolved.operation === 'create' ? 0 : existing.version,
    lastModifiedAt: now,
    _localStatus: 'dirty',
  }

  const payload =
    resolved.operation === 'create'
      ? buildChildCreateSyncPayload(record)
      : buildChildUpdateSyncPayload(record)

  await store.runTransaction(['children', 'sync_operations'], 'rw', async (tx) => {
    await tx.putChild(record)
    await tx.enqueueOperation({
      clientOperationId: resolved.clientOperationId,
      entityType: 'child',
      operation: resolved.operation,
      entityId: record.id,
      localId: record.id,
      payload,
      version: resolved.version,
      status: resolved.status === 'blocked' ? 'blocked' : 'pending',
      dependsOn: resolved.dependsOn,
      lastError: resolved.status === 'blocked' ? resolved.lastError : undefined,
    })
  })

  return {
    child: localChildToViewModel(record),
    operationId: resolved.clientOperationId,
    savedOnDevice: true,
  }
}

export async function archiveChildLocalFirst(
  store: LocalStore,
  id: string,
  input: ArchiveChildInput,
): Promise<ChildLocalMutationResult> {
  const archivedAt = new Date().toISOString().slice(0, 10)
  const archiveReason = input.notes ? `${input.reason}: ${input.notes}` : input.reason
  return updateChildLocalFirst(
    store,
    id,
    {
      status: 'archived',
      archivedAt,
      archiveReason,
    },
    { allowOnlineOnlyFields: true },
  )
}

export async function reactivateChildLocalFirst(
  store: LocalStore,
  id: string,
): Promise<ChildLocalMutationResult> {
  return updateChildLocalFirst(
    store,
    id,
    {
      status: 'active',
      archivedAt: '',
      archiveReason: '',
    },
    { allowOnlineOnlyFields: true },
  )
}

export async function listChildrenFromLocal(
  store: LocalStore,
  centerId?: string,
): Promise<ChildViewModel[]> {
  const rows = await store.listChildren({ centerId })
  return rows.map(localChildToViewModel)
}

/** After reconnect: resolve village for blocked child creates and unblock. */
export async function unblockChildCreatesNeedingVillage(
  store: LocalStore,
  resolveVillage: (loc: {
    district: string
    sector: string
    cell: string
    village: string
  }) => Promise<string>,
): Promise<void> {
  const ops = await store.listOperations({ status: 'blocked' })
  for (const op of ops) {
    if (op.entityType !== 'child' || op.operation !== 'create') continue
    const child = await store.getChild(op.entityId)
    if (!child) continue
    if (child.homeVillageId) {
      await store.updateOperation(op.clientOperationId, {
        status: 'pending',
        payload: buildChildCreateSyncPayload(child),
        lastError: undefined,
      })
      continue
    }
    try {
      const homeVillageId = await resolveVillage({
        district: child.district,
        sector: child.sector,
        cell: child.cell,
        village: child.village,
      })
      const updated: LocalChildRecord = { ...child, homeVillageId }
      await store.runTransaction(['children', 'sync_operations', 'village_cache'], 'rw', async (tx) => {
        await tx.putChild(updated)
        await tx.updateOperation(op.clientOperationId, {
          status: 'pending',
          payload: buildChildCreateSyncPayload(updated),
          lastError: undefined,
        })
        await tx.putVillageCache({
          key: villageCacheKey({
            district: child.district,
            sector: child.sector,
            cell: child.cell,
            village: child.village,
          }),
          homeVillageId,
          updatedAt: new Date().toISOString(),
        })
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'village not found'
      await store.updateOperation(op.clientOperationId, {
        status: 'blocked',
        lastError: `${VILLAGE_REFERENCE_BLOCKED_ERROR}: ${detail}`.slice(0, 240),
      })
    }
  }
}
