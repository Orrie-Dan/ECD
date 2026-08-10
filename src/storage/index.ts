export type { LocalStore, OutboxEnqueueInput, PullCursor } from '@/storage/local-store'
export {
  getLocalStore,
  getDexieLocalStore,
  ensureLocalStoreInitialized,
  DexieLocalStore,
  resetLocalStoreForTests,
  rebindLocalStore,
} from '@/storage/dexie-local-store'
export {
  getOfflineDb,
  getOfflineDbName,
  openOfflineDb,
  resetOfflineDbForTests,
  closeOfflineDb,
  deleteOfflineDb,
} from '@/storage/db'
export * from '@/storage/types'
export { DB_NAME, DB_VERSION } from '@/storage/schema'
export {
  getActiveOwnerUserId,
  getActiveOwnerCenterId,
  bindActiveOwner,
  unbindActiveOwner,
  claimLegacyOwnership,
  userOfflineDbName,
  LEGACY_UNOWNED,
  assertOwnerMatches,
} from '@/storage/ownership'
export {
  activateLocalWorkspace,
  deactivateLocalWorkspace,
  clearUserLocalData,
  deleteUserLocalDatabase,
  migrateLegacySharedDbIfNeeded,
} from '@/storage/local-workspace'
export {
  LocalWriteError,
  isLocalWriteError,
  toLocalWriteError,
  rethrowAsLocalWriteError,
} from '@/storage/local-write-error'
export type { LocalWriteErrorCode } from '@/storage/local-write-error'
