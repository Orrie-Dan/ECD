/**
 * Local ownership & multi-account isolation (Sprint 4.8.6).
 *
 * One physical browser may host multiple authenticated users. Each user gets an
 * isolated IndexedDB workspace (`ecd-offline-u-{userId}`). Device UUID / registry
 * id remain shared in localStorage. Outbox rows are stamped with ownerUserId and
 * must never push under another user's JWT.
 */

import type { LocalStore } from '@/storage/local-store'
import { META_KEYS } from '@/storage/types'
import { DB_NAME } from '@/storage/schema'

export const LEGACY_UNOWNED = '__legacy_unowned__'
export const LEGACY_MIGRATION_FLAG = 'ecd_legacy_db_migrated_to'

/** In-memory active owner for the current JS session (not durable alone). */
let activeOwnerUserId: string | null = null
let activeOwnerCenterId: string | null = null

/**
 * Monotonic workspace activation generation.
 * Stale activate completions must not rebind after a newer activation started.
 */
let workspaceGeneration = 0

export function getWorkspaceGeneration(): number {
  return workspaceGeneration
}

export function bumpWorkspaceGeneration(): number {
  workspaceGeneration += 1
  return workspaceGeneration
}

export function userOfflineDbName(userId: string): string {
  return `${DB_NAME}-u-${userId}`
}

export function getActiveOwnerUserId(): string | null {
  return activeOwnerUserId
}

export function getActiveOwnerCenterId(): string | null {
  return activeOwnerCenterId
}

export function setActiveOwnerMemory(userId: string | null, centerId?: string | null): void {
  activeOwnerUserId = userId
  activeOwnerCenterId = centerId ?? null
}

export function clearActiveOwnerMemory(): void {
  activeOwnerUserId = null
  activeOwnerCenterId = null
}

export interface SyncIdentityContext {
  userId: string
  centerId: string | null
  deviceId: string | null
}

/** Meta keys scoped per user (used when a shared DB still holds multi-user meta). */
export function userMetaKey(base: string, userId: string): string {
  return `${base}:${userId}`
}

export const USER_SCOPED_META = {
  lastPullCursor: 'lastPullCursor',
  lastPullCursorId: 'lastPullCursorId',
  lastSyncedAt: 'lastSyncedAt',
  hasLocalSnapshot: 'hasLocalSnapshot',
} as const

/**
 * Persist active owner onto the store and memory.
 * Does not open/close databases — caller switches LocalStore backing DB first.
 */
export async function bindActiveOwner(
  store: LocalStore,
  userId: string,
  centerId?: string | null,
): Promise<void> {
  setActiveOwnerMemory(userId, centerId)
  await store.setMeta(META_KEYS.userId, userId)
  await store.setMeta(META_KEYS.activeOwnerUserId, userId)
  if (centerId) {
    await store.setMeta(META_KEYS.centerId, centerId)
  }
}

/** Clear session ownership pointer without deleting durable user data. */
export async function unbindActiveOwner(store?: LocalStore | null): Promise<void> {
  clearActiveOwnerMemory()
  if (store) {
    await store.deleteMeta(META_KEYS.activeOwnerUserId)
  }
}

/**
 * Claim pre-ownership outbox / domain rows created before Sprint 4.8.6.
 * Never rebinds rows already owned by a different user.
 */
export async function claimLegacyOwnership(
  store: LocalStore,
  userId: string,
): Promise<{ claimedOperations: number }> {
  const ops = await store.listOperations({ includeAllOwners: true })
  let claimedOperations = 0
  for (const op of ops) {
    const owner = op.ownerUserId
    if (!owner || owner === LEGACY_UNOWNED) {
      await store.updateOperation(op.clientOperationId, { ownerUserId: userId })
      claimedOperations += 1
    }
  }
  return { claimedOperations }
}

export function assertOwnerMatches(
  operationOwner: string | undefined | null,
  authenticatedUserId: string,
): boolean {
  if (!operationOwner || operationOwner === LEGACY_UNOWNED) return false
  return operationOwner === authenticatedUserId
}
