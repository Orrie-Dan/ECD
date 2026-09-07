import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  resetOfflineDbForTests,
  resetLocalStoreForTests,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { createChildLocalFirst } from '@/features/children/local-children'
import { bindTestOwner, clearTestOwner } from '@/storage/test-owner'
import {
  filterSyncedChildIds,
  isLocalChildUnsyncedOnServer,
  listUnsyncedChildIds,
  shouldSkipRemoteChildHistory,
} from '@/sync/child-sync-state'

function childForm(name: string) {
  return {
    fullName: name,
    dateOfBirth: '2021-03-15',
    gender: 'Umukobwa',
    nationalId: '1199880012345678',
    specialNeeds: '',
    guardianName: 'Guardian',
    guardianPhone: '0780000000',
    guardianRelation: 'umubyeyi',
    guardian2Name: '',
    guardian2Phone: '',
    guardian2Relation: '',
    province: 'p',
    district: 'd',
    sector: 's',
    cell: 'c',
    village: 'v',
  } as never
}

describe('child-sync-state', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-sync-state-${createUuid()}`)
    store = resetLocalStoreForTests(db)
    await bindTestOwner(store)
  })

  afterEach(() => {
    clearTestOwner()
  })

  it('flags dirty version-0 children as unsynced', async () => {
    const created = await createChildLocalFirst(store, {
      form: childForm('Unsynced'),
      centerId: 'center-1',
      centerName: 'C',
      homeVillageId: createUuid(),
      villageResolved: true,
    })
    const child = await store.getChild(created.id)
    expect(child).toBeTruthy()
    expect(isLocalChildUnsyncedOnServer(child!)).toBe(true)
    expect(await shouldSkipRemoteChildHistory(store, created.id)).toBe(true)
  })

  it('excludes unsynced ids from remote roster fan-out', async () => {
    const unsynced = await createChildLocalFirst(store, {
      form: childForm('Local Only'),
      centerId: 'center-1',
      centerName: 'C',
      homeVillageId: null,
      villageResolved: false,
    })
    const syncedId = createUuid()
    expect(await filterSyncedChildIds(store, [unsynced.id, syncedId])).toEqual([syncedId])
    expect(await listUnsyncedChildIds(store, [unsynced.id, syncedId])).toEqual(
      new Set([unsynced.id]),
    )
  })
})
