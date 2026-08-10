import { createUuid } from '@/lib/uuid'
import { emptyComposition, isBalancedComposition } from '@/lib/feeding-utils'
import type { LocalStore } from '@/storage/local-store'
import type {
  LocalFeedingDayRecord,
  LocalFeedingMonthSummaryRecord,
  OutboxStatus,
  SyncOperationKind,
  SyncOperationRecord,
} from '@/storage/types'
import {
  buildFeedingDaySyncPayload,
  buildFeedingMonthSummarySyncPayload,
} from '@/sync/feeding-sync-mapper'
import type {
  FeedingDayUpsertInput,
  FeedingDayViewModel,
  FeedingMonthSummaryUpsertInput,
  FeedingMonthSummaryViewModel,
} from '@/models/feeding'
import type { BalancedMealComposition } from '@/types'

const ACTIVE_MUTATION_STATUSES: OutboxStatus[] = ['pending', 'blocked', 'syncing']

export interface UpsertFeedingLocalResult<T> {
  record: T
  savedOnDevice: boolean
}

function compositionFromRow(row: LocalFeedingDayRecord): BalancedMealComposition | undefined {
  const composition: BalancedMealComposition = {
    cerealsOrTubers: row.cerealsOrTubers,
    legumes: row.legumes,
    dairy: row.dairy,
    animalProducts: row.animalProducts,
    fruitsVegetables: row.fruitsVegetables,
    addedFat: row.addedFat,
  }
  const anyTrue = Object.values(composition).some(Boolean)
  if (!anyTrue && !row.balancedMealServed) return undefined
  return composition
}

export function localFeedingDayToViewModel(row: LocalFeedingDayRecord): FeedingDayViewModel {
  return {
    id: row.id,
    centerId: row.centerId,
    date: row.date,
    milkServed: row.milkServed,
    porridgeServed: row.porridgeServed,
    balancedMealServed: row.balancedMealServed,
    composition: compositionFromRow(row),
    recordedBy: row.recordedById,
    version: row.version,
  }
}

export function localFeedingMonthSummaryToViewModel(
  row: LocalFeedingMonthSummaryRecord,
): FeedingMonthSummaryViewModel {
  return {
    id: row.id,
    centerId: row.centerId,
    yearMonth: row.yearMonth,
    milkLiters: row.milkLiters,
    flourKg: row.flourKg,
    foodSource: row.foodSource,
    updatedAt: row.lastModifiedAt.slice(0, 10),
    updatedBy: row.updatedById ?? undefined,
    version: row.version,
  }
}

export async function listFeedingDaysFromLocal(
  store: LocalStore,
  filter?: {
    centerId?: string
    startDate?: string
    endDate?: string
    yearMonth?: string
  },
): Promise<FeedingDayViewModel[]> {
  const rows = await store.listFeedingDays(filter)
  return rows.map(localFeedingDayToViewModel)
}

export async function listFeedingMonthSummariesFromLocal(
  store: LocalStore,
  filter?: { centerId?: string; yearMonth?: string },
): Promise<FeedingMonthSummaryViewModel[]> {
  const rows = await store.listFeedingMonthSummaries(filter)
  return rows.map(localFeedingMonthSummaryToViewModel)
}

async function findActiveMutation(
  store: LocalStore,
  entityType: 'center_feeding_day' | 'center_feeding_month_summary',
  entityId: string,
): Promise<SyncOperationRecord | null> {
  const ops = await store.listOperations({ status: ACTIVE_MUTATION_STATUSES })
  return (
    ops.find((op) => op.entityType === entityType && op.entityId === entityId) ?? null
  )
}

/**
 * Decide create vs update for outbox (mirrors attendance):
 * - No prior local row → create (version 0)
 * - Active unsynced create → keep create + version 0 (coalesce payload)
 * - Existing row → update with server version
 */
function resolveUpsertOp(
  existing: { id: string; version: number } | null,
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
 * Local-first feeding day upsert with natural-key uniqueness (centerId + date).
 * Atomically writes the entity + outbox op; reuses clientOperationId when coalescing.
 *
 * REST delete is unsupported — this module does not expose delete.
 */
export async function upsertFeedingDayLocalFirst(
  store: LocalStore,
  input: FeedingDayUpsertInput & { recordedById: string },
): Promise<UpsertFeedingLocalResult<FeedingDayViewModel>> {
  const now = new Date().toISOString()
  const composition = input.composition ?? emptyComposition()
  const balanced =
    input.balancedMealServed && isBalancedComposition(composition) ? true : false
  const groups = balanced ? composition : emptyComposition()

  const existing = await store.getFeedingDayByNaturalKey(input.centerId, input.date)
  const active = existing
    ? await findActiveMutation(store, 'center_feeding_day', existing.id)
    : null
  const resolved = resolveUpsertOp(existing, active)
  const clientOperationId = active?.clientOperationId ?? createUuid()

  const row: LocalFeedingDayRecord = {
    id: resolved.entityId,
    centerId: input.centerId,
    date: input.date,
    milkServed: input.milkServed,
    porridgeServed: input.porridgeServed,
    balancedMealServed: balanced,
    cerealsOrTubers: groups.cerealsOrTubers,
    legumes: groups.legumes,
    dairy: groups.dairy,
    animalProducts: groups.animalProducts,
    fruitsVegetables: groups.fruitsVegetables,
    addedFat: groups.addedFat,
    recordedById: input.recordedById,
    version: resolved.operation === 'create' ? 0 : existing!.version,
    deletedAt: null,
    lastModifiedAt: now,
    _localStatus: 'dirty',
    _updatedAtLocal: now,
  }

  await store.runTransaction(['feeding_days', 'sync_operations'], 'rw', async (tx) => {
    await tx.putFeedingDay(row)
    await tx.enqueueOperation({
      clientOperationId,
      entityType: 'center_feeding_day',
      operation: resolved.operation,
      entityId: row.id,
      localId: row.id,
      payload: buildFeedingDaySyncPayload(row),
      version: resolved.version,
      status: 'pending',
      lastError: undefined,
    })
  })

  const saved = await store.getFeedingDay(row.id)
  return {
    record: localFeedingDayToViewModel(saved ?? row),
    savedOnDevice: true,
  }
}

/**
 * Local-first feeding month summary upsert with natural-key uniqueness (centerId + yearMonth).
 */
export async function upsertFeedingMonthSummaryLocalFirst(
  store: LocalStore,
  input: FeedingMonthSummaryUpsertInput & { updatedById: string },
): Promise<UpsertFeedingLocalResult<FeedingMonthSummaryViewModel>> {
  const now = new Date().toISOString()
  const existing = await store.getFeedingMonthSummaryByNaturalKey(
    input.centerId,
    input.yearMonth,
  )
  const active = existing
    ? await findActiveMutation(store, 'center_feeding_month_summary', existing.id)
    : null
  const resolved = resolveUpsertOp(existing, active)
  const clientOperationId = active?.clientOperationId ?? createUuid()

  const row: LocalFeedingMonthSummaryRecord = {
    id: resolved.entityId,
    centerId: input.centerId,
    yearMonth: input.yearMonth,
    milkLiters: input.milkLiters,
    flourKg: input.flourKg,
    foodSource: input.foodSource.trim(),
    updatedById: input.updatedById,
    version: resolved.operation === 'create' ? 0 : existing!.version,
    deletedAt: null,
    lastModifiedAt: now,
    _localStatus: 'dirty',
    _updatedAtLocal: now,
  }

  await store.runTransaction(
    ['feeding_month_summaries', 'sync_operations'],
    'rw',
    async (tx) => {
      await tx.putFeedingMonthSummary(row)
      await tx.enqueueOperation({
        clientOperationId,
        entityType: 'center_feeding_month_summary',
        operation: resolved.operation,
        entityId: row.id,
        localId: row.id,
        payload: buildFeedingMonthSummarySyncPayload(row),
        version: resolved.version,
        status: 'pending',
        lastError: undefined,
      })
    },
  )

  const saved = await store.getFeedingMonthSummary(row.id)
  return {
    record: localFeedingMonthSummaryToViewModel(saved ?? row),
    savedOnDevice: true,
  }
}
