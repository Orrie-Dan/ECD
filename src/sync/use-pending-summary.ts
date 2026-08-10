import { useCallback, useEffect, useState } from 'react'
import { getLocalStore } from '@/storage'
import { getActiveOwnerUserId } from '@/storage/ownership'
import { useSyncStatus } from '@/sync/use-sync-status'
import type { SyncableEntityType } from '@/storage/types'
import { UNSYNCED_OUTBOX_STATUSES } from '@/sync/sync-types'
import { common } from '@/locales/rw/common'
import { acknowledgeConflictOperations } from '@/sync/acknowledge-conflicts'
import { getSyncEngine } from '@/sync/sync-engine'

export type PendingDomainBucket =
  | 'child'
  | 'attendance'
  | 'nutrition'
  | 'feeding'
  | 'sted'
  | 'referral'
  | 'other'

const DOMAIN_LABEL: Record<PendingDomainBucket, string> = {
  child: common.sync.domainChild,
  attendance: common.sync.domainAttendance,
  nutrition: common.sync.domainNutrition,
  feeding: common.sync.domainFeeding,
  sted: common.sync.domainSted,
  referral: common.sync.domainReferral,
  other: common.sync.domainOther,
}

function bucketFor(entityType: SyncableEntityType): PendingDomainBucket {
  switch (entityType) {
    case 'child':
      return 'child'
    case 'attendance_record':
      return 'attendance'
    case 'child_nutrition_screening':
      return 'nutrition'
    case 'center_feeding_day':
    case 'center_feeding_month_summary':
      return 'feeding'
    case 'sted_assessment':
      return 'sted'
    case 'referral':
      return 'referral'
    default:
      return 'other'
  }
}

export interface PendingDomainCount {
  key: PendingDomainBucket
  label: string
  count: number
}

/** Human-readable attention item (no raw outbox dump). */
export interface AttentionItem {
  clientOperationId: string
  entityType: SyncableEntityType
  entityId: string
  /** Child display name when resolvable; otherwise domain label. */
  label: string
  lastError?: string
}

/** @deprecated Use AttentionItem */
export type ConflictAttentionItem = AttentionItem

async function labelForOperation(
  store: ReturnType<typeof getLocalStore>,
  entityType: SyncableEntityType,
  entityId: string,
): Promise<string> {
  let label = DOMAIN_LABEL[bucketFor(entityType)]
  if (entityType === 'child') {
    const child = await store.getChild(entityId)
    if (child?.fullName) label = child.fullName
  } else if (
    entityType === 'attendance_record' ||
    entityType === 'child_nutrition_screening' ||
    entityType === 'sted_assessment' ||
    entityType === 'referral'
  ) {
    const childId =
      entityType === 'attendance_record'
        ? (await store.getAttendance(entityId))?.childId
        : entityType === 'child_nutrition_screening'
          ? (await store.getNutritionScreening(entityId))?.childId
          : entityType === 'sted_assessment'
            ? (await store.getStedAssessment(entityId))?.childId
            : (await store.getReferral(entityId))?.childId
    if (childId) {
      const child = await store.getChild(childId)
      if (child?.fullName) {
        label = `${child.fullName} (${DOMAIN_LABEL[bucketFor(entityType)]})`
      }
    }
  }
  return label
}

/**
 * Pending outbox summary for caretaker UX (no raw operation exposure).
 */
export function usePendingSyncSummary() {
  const sync = useSyncStatus()
  const [byDomain, setByDomain] = useState<PendingDomainCount[]>([])
  const [conflictItems, setConflictItems] = useState<AttentionItem[]>([])
  const [failedItems, setFailedItems] = useState<AttentionItem[]>([])
  const [blockedItems, setBlockedItems] = useState<AttentionItem[]>([])
  const [acknowledging, setAcknowledging] = useState(false)

  const refresh = useCallback(async () => {
    const store = getLocalStore()
    const owner = getActiveOwnerUserId() ?? undefined
    const ops = await store.listOperations({
      status: UNSYNCED_OUTBOX_STATUSES,
      ownerUserId: owner,
    })
    const counts = new Map<PendingDomainBucket, number>()
    for (const op of ops) {
      const key = bucketFor(op.entityType)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const rows: PendingDomainCount[] = [...counts.entries()]
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({ key, label: DOMAIN_LABEL[key], count }))
      .sort((a, b) => b.count - a.count)
    setByDomain(rows)

    async function mapOps(
      filtered: typeof ops,
    ): Promise<AttentionItem[]> {
      const items: AttentionItem[] = []
      for (const op of filtered.slice(0, 8)) {
        items.push({
          clientOperationId: op.clientOperationId,
          entityType: op.entityType,
          entityId: op.entityId,
          label: await labelForOperation(store, op.entityType, op.entityId),
          lastError: op.lastError,
        })
      }
      return items
    }

    setConflictItems(await mapOps(ops.filter((op) => op.status === 'conflict')))
    setFailedItems(await mapOps(ops.filter((op) => op.status === 'failed')))
    setBlockedItems(await mapOps(ops.filter((op) => op.status === 'blocked')))
  }, [])

  const acknowledgeConflicts = useCallback(async () => {
    setAcknowledging(true)
    try {
      const store = getLocalStore()
      await acknowledgeConflictOperations(store)
      await getSyncEngine().syncNow()
      await refresh()
    } finally {
      setAcknowledging(false)
    }
  }, [refresh])

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (!cancelled) void refresh()
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    refresh,
    sync.pendingCount,
    sync.status,
    sync.lastSyncedAt,
    sync.conflictCount,
    sync.failedCount,
    sync.blockedCount,
  ])

  return {
    ...sync,
    byDomain,
    conflictItems,
    failedItems,
    blockedItems,
    acknowledging,
    acknowledgeConflicts,
    refresh,
  }
}
