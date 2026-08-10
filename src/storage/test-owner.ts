import type { LocalStore } from '@/storage/local-store'
import { bindActiveOwner, clearActiveOwnerMemory } from '@/storage/ownership'
import { ensureLocalStoreInitialized } from '@/storage/dexie-local-store'

/** Standard test owner used across LocalStore / sync unit tests. */
export const TEST_OWNER_USER_ID = 'test-owner-user'

/**
 * Bind an active local owner on the current test store.
 * Call after resetOfflineDbForTests / resetLocalStoreForTests.
 */
export async function bindTestOwner(
  store: LocalStore,
  userId = TEST_OWNER_USER_ID,
  centerId = 'test-center',
): Promise<void> {
  await ensureLocalStoreInitialized(store)
  await bindActiveOwner(store, userId, centerId)
}

export function clearTestOwner(): void {
  clearActiveOwnerMemory()
}
