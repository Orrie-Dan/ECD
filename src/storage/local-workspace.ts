/**
 * Per-user LocalStore workspace lifecycle (Sprint 4.8.6).
 *
 * Physical browser → shared deviceUuid / ecd_device_id (localStorage)
 *                 → isolated IndexedDB per authenticated user
 */

import { DB_NAME } from '@/storage/schema'
import {
  EcdOfflineDatabase,
  openOfflineDb,
  deleteOfflineDb,
  getOfflineDbName,
} from '@/storage/db'
import {
  ensureLocalStoreInitialized,
  getDexieLocalStore,
  getLocalStore,
  rebindLocalStore,
} from '@/storage/dexie-local-store'
import type { LocalStore } from '@/storage/local-store'
import {
  bindActiveOwner,
  bumpWorkspaceGeneration,
  claimLegacyOwnership,
  clearActiveOwnerMemory,
  getActiveOwnerUserId,
  getWorkspaceGeneration,
  LEGACY_MIGRATION_FLAG,
  LEGACY_UNOWNED,
  unbindActiveOwner,
  userOfflineDbName,
} from '@/storage/ownership'
import { META_KEYS } from '@/storage/types'
import { queryClient } from '@/api/query-client'
import { tokenStorage } from '@/api/token-storage'

async function tableHasRows(db: EcdOfflineDatabase): Promise<boolean> {
  const counts = await Promise.all([
    db.children.count(),
    db.attendance.count(),
    db.nutrition_screenings.count(),
    db.referrals.count(),
    db.feeding_days.count(),
    db.feeding_month_summaries.count(),
    db.sted_assessments.count(),
    db.sync_operations.count(),
  ])
  return counts.some((n) => n > 0)
}

async function copyTable<T>(
  source: EcdOfflineDatabase,
  target: EcdOfflineDatabase,
  tableName: string,
): Promise<void> {
  const rows = await source.table(tableName).toArray()
  if (rows.length === 0) return
  await target.table(tableName).bulkPut(rows as T[])
}

/**
 * One-time adoption of the pre-4.8.6 shared `ecd-offline` database into a
 * per-user workspace. Never migrates into a mismatched userId.
 */
export async function migrateLegacySharedDbIfNeeded(userId: string): Promise<boolean> {
  if (typeof localStorage !== 'undefined') {
    const already = localStorage.getItem(LEGACY_MIGRATION_FLAG)
    if (already && already !== userId) {
      // Legacy already claimed by another account — leave it until that user returns.
      return false
    }
    if (already === userId) return false
  }

  const legacy = new EcdOfflineDatabase(DB_NAME)
  try {
    await legacy.open()
    const hasData = await tableHasRows(legacy)
    if (!hasData) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LEGACY_MIGRATION_FLAG, userId)
      }
      return false
    }

    const legacyUser = (await legacy.meta.get(META_KEYS.userId))?.value ?? null
    if (legacyUser && legacyUser !== 'unknown' && legacyUser !== userId) {
      // Owned by someone else — do not leak into this workspace.
      return false
    }

    const target = await openOfflineDb(userOfflineDbName(userId))
    const tables = [
      'meta',
      'device',
      'sync_operations',
      'sync_sessions',
      'children',
      'attendance',
      'nutrition_screenings',
      'referrals',
      'feeding_days',
      'feeding_month_summaries',
      'sted_assessments',
      'village_cache',
    ]
    for (const name of tables) {
      await copyTable(legacy, target, name)
    }

    // Stamp unowned outbox after copy.
    const ops = await target.sync_operations.toArray()
    for (const op of ops) {
      if (!op.ownerUserId || op.ownerUserId === LEGACY_UNOWNED) {
        await target.sync_operations.put({ ...op, ownerUserId: userId })
      }
    }
    await target.meta.put({ key: META_KEYS.userId, value: userId })

    // Clear legacy domain data so it cannot be read from the shared name again.
    await Promise.all([
      legacy.sync_operations.clear(),
      legacy.sync_sessions.clear(),
      legacy.children.clear(),
      legacy.attendance.clear(),
      legacy.nutrition_screenings.clear(),
      legacy.referrals.clear(),
      legacy.feeding_days.clear(),
      legacy.feeding_month_summaries.clear(),
      legacy.sted_assessments.clear(),
      legacy.village_cache.clear(),
      legacy.meta.clear(),
      legacy.device.clear(),
    ])

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LEGACY_MIGRATION_FLAG, userId)
    }
    return true
  } finally {
    legacy.close()
  }
}

export interface ActivateLocalWorkspaceResult {
  store: LocalStore
  userId: string
  migratedLegacy: boolean
  dbName: string
}

/**
 * Open (or switch to) the authenticated user's isolated LocalStore workspace.
 * Clears React Query projections so prior-user cache cannot flash.
 *
 * Generation-guarded: a stale activate that loses the race to a newer login
 * must not rebind the singleton store / active owner.
 */
export async function activateLocalWorkspace(
  userId: string,
  centerId?: string | null,
): Promise<ActivateLocalWorkspaceResult> {
  const generation = bumpWorkspaceGeneration()

  const previousOwner = getActiveOwnerUserId()
  if (previousOwner && previousOwner !== userId) {
    // Drop ephemeral projections before binding the next owner.
    void queryClient.clear()
  }

  const migratedLegacy = await migrateLegacySharedDbIfNeeded(userId)
  if (generation !== getWorkspaceGeneration()) {
    throw new Error('Stale workspace activation superseded')
  }

  const dbName = userOfflineDbName(userId)
  const db = await openOfflineDb(dbName)
  if (generation !== getWorkspaceGeneration()) {
    throw new Error('Stale workspace activation superseded')
  }

  const store = rebindLocalStore(db)
  await ensureLocalStoreInitialized(store)
  if (generation !== getWorkspaceGeneration()) {
    throw new Error('Stale workspace activation superseded')
  }

  await bindActiveOwner(store, userId, centerId)
  await claimLegacyOwnership(store, userId)

  // Mirror shared device registry id into this workspace meta when present.
  const registryId = tokenStorage.getDeviceId()
  if (registryId && !(await store.getMeta(META_KEYS.deviceId))) {
    await store.setMeta(META_KEYS.deviceId, registryId)
  }

  return { store, userId, migratedLegacy, dbName }
}

/**
 * End the active local session without deleting durable user data.
 * Used on logout keep_on_device and auth expiry.
 */
export async function deactivateLocalWorkspace(): Promise<void> {
  const store = getLocalStore()
  await unbindActiveOwner(store)
  clearActiveOwnerMemory()
  void queryClient.clear()
}

/**
 * Explicit discard for one user's local workspace.
 * Does not delete unrelated users' databases or shared device localStorage keys.
 */
export async function clearUserLocalData(userId: string): Promise<void> {
  const active = getActiveOwnerUserId()
  const dbName = userOfflineDbName(userId)

  if (active === userId && getOfflineDbName() === dbName) {
    await getLocalStore().clearUserLocalData(userId)
    await unbindActiveOwner(getLocalStore())
  } else {
    const previousName = getOfflineDbName()
    const previousOwner = active

    const targetDb = await openOfflineDb(dbName)
    const store = rebindLocalStore(targetDb)
    await store.clearUserLocalData(userId)

    if (previousName && previousOwner) {
      const db = await openOfflineDb(previousName)
      rebindLocalStore(db)
      await bindActiveOwner(getLocalStore(), previousOwner, null)
    } else {
      await unbindActiveOwner()
    }
  }

  // If discarding the account that claimed legacy migration, allow re-migration later.
  if (typeof localStorage !== 'undefined') {
    if (localStorage.getItem(LEGACY_MIGRATION_FLAG) === userId) {
      localStorage.removeItem(LEGACY_MIGRATION_FLAG)
    }
  }

  void queryClient.clear()
}

/** Full delete of a user's IndexedDB (destructive reset for that account only). */
export async function deleteUserLocalDatabase(userId: string): Promise<void> {
  const dbName = userOfflineDbName(userId)
  if (getActiveOwnerUserId() === userId) {
    await unbindActiveOwner(getLocalStore())
  }
  await deleteOfflineDb(dbName)
  void queryClient.clear()
}

export function getActiveLocalStoreOrThrow(): LocalStore {
  const owner = getActiveOwnerUserId()
  if (!owner) {
    throw new Error('No active local owner — call activateLocalWorkspace after login')
  }
  return getDexieLocalStore()
}
