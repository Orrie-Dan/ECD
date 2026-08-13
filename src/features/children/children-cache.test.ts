/**
 * Sprint 5.9 — children list must refresh after sync pull writes LocalStore.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  resetOfflineDbForTests,
  resetLocalStoreForTests,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { META_KEYS } from '@/storage/types'
import { listChildrenFromLocal } from '@/features/children/local-children'
import { bindTestOwner, clearTestOwner } from '@/storage/test-owner'
import { children } from '@/api/query-keys'
import { queryClient } from '@/api/query-client'

describe('Sprint 5.9 children UI/API cache', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-children-cache-${createUuid()}`)
    store = resetLocalStoreForTests(db)
    await bindTestOwner(store)
    queryClient.clear()
  })

  afterEach(() => {
    clearTestOwner()
    queryClient.clear()
  })

  it('after pull writes children, invalidating children.keys.all allows list to leave empty cache', async () => {
    const centerId = createUuid()
    const childId = createUuid()
    const now = new Date().toISOString()

    // Simulate UI having cached an empty list before pull finished.
    queryClient.setQueryData(children.keys.list({ centerId, page: 1, pageSize: 100 }), {
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
      totalPages: 0,
    })
    expect(
      (queryClient.getQueryData(children.keys.list({ centerId, page: 1, pageSize: 100 })) as { total: number })
        ?.total,
    ).toBe(0)

    await store.putChild({
      id: childId,
      registrationNumber: 'REG-1',
      firstName: 'E2E',
      lastName: 'Child',
      fullName: 'E2E Child',
      centerId,
      centerName: 'Center',
      dateOfBirth: '2022-01-01',
      gender: 'female',
      status: 'active',
      guardianName: 'G',
      guardianPhone: '07',
      guardianRelation: 'mother',
      homeVillageId: createUuid(),
      registeredAt: now,
      province: '',
      district: '',
      sector: '',
      cell: '',
      village: '',
      version: 1,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean',
    })
    await store.setMeta(META_KEYS.hasLocalSnapshot, 'true')

    const local = await listChildrenFromLocal(store, centerId)
    expect(local).toHaveLength(1)

    await queryClient.invalidateQueries({ queryKey: children.keys.all })
    // After invalidation the stale empty cache is marked stale; a refetch would
    // read LocalStore. Assert LocalStore+invalidation contract used by sync-engine.
    expect(queryClient.getQueryState(children.keys.list({ centerId, page: 1, pageSize: 100 }) )?.isInvalidated).toBe(true)
    expect(local[0]?.id).toBe(childId)
  })
})
