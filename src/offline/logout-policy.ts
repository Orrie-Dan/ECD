import type { LocalStore } from '@/storage/local-store'
import { getLocalStore } from '@/storage'
import { UNSYNCED_OUTBOX_STATUSES } from '@/sync/sync-types'
import { getActiveOwnerUserId } from '@/storage/ownership'
import {
  clearUserLocalData,
  deactivateLocalWorkspace,
} from '@/storage/local-workspace'
import { getSyncEngine } from '@/sync/sync-engine'

export type LogoutAction = 'sync_then_logout' | 'keep_on_device' | 'discard_local' | 'cancel'

export type LogoutPolicyDecision =
  | { allowed: true; action: Exclude<LogoutAction, 'cancel'> }
  | { allowed: false; action: 'cancel'; pendingCount: number; reason: string }

/**
 * Logout must never silently destroy pending offline work.
 * Default: BLOCK while unsynced operations exist for the *active* owner.
 *
 * Semantics:
 * A. No pending → safe logout (keep_on_device by default)
 * B. Pending → require explicit keep_on_device | discard_local | sync_then_logout
 * C. Offline logout → never silently delete (same as B)
 * D. keep_on_device → data stays owned by user, unavailable to other accounts
 * E. discard_local → scoped wipe of that user only
 * F. sync_then_logout → sync first; logout only when pending clears
 */
export async function evaluateLogoutPolicy(
  requested: LogoutAction,
  store: LocalStore = getLocalStore(),
  ownerUserId: string | null = getActiveOwnerUserId(),
): Promise<LogoutPolicyDecision> {
  const pendingCount = await store.countOperations(
    UNSYNCED_OUTBOX_STATUSES,
    ownerUserId ? { ownerUserId } : undefined,
  )

  if (pendingCount === 0) {
    return { allowed: true, action: requested === 'cancel' ? 'keep_on_device' : requested }
  }

  if (requested === 'cancel') {
    return {
      allowed: false,
      action: 'cancel',
      pendingCount,
      reason: 'Logout cancelled',
    }
  }

  if (requested === 'keep_on_device') {
    return { allowed: true, action: 'keep_on_device' }
  }

  if (requested === 'discard_local') {
    return { allowed: true, action: 'discard_local' }
  }

  if (requested === 'sync_then_logout') {
    return { allowed: true, action: 'sync_then_logout' }
  }

  return {
    allowed: false,
    action: 'cancel',
    pendingCount,
    reason: `${pendingCount} unsynced change(s). Sync, keep on device, or discard explicitly.`,
  }
}

export async function applyLogoutDataPolicy(
  action: Exclude<LogoutAction, 'cancel'>,
  options?: {
    store?: LocalStore
    userId?: string | null
  },
): Promise<void> {
  // Explicit null must not fall through to the active owner (?? would).
  const userId =
    options && 'userId' in options ? options.userId : getActiveOwnerUserId()

  if (action === 'discard_local') {
    if (!userId) {
      // Never wipe an ambiguous workspace — refuse rather than clearAllDomainData().
      throw new Error('discard_local requires an explicit userId')
    }
    await clearUserLocalData(userId)
    return
  }

  if (action === 'sync_then_logout') {
    await getSyncEngine().syncNow()
    // Caller must re-evaluate pending before clearing session.
    return
  }

  // keep_on_device: leave IndexedDB intact; deactivate active owner pointer.
  await deactivateLocalWorkspace()
}
