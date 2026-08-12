import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  resetOfflineDbForTests,
  resetLocalStoreForTests,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import {
  createChildLocalFirst,
  unblockChildCreatesNeedingVillage,
} from '@/features/children/local-children'
import { refreshBlockedOperations, selectPushBatch } from '@/sync/outbox'
import {
  VILLAGE_REFERENCE_BLOCKED_ERROR,
  classifyBlockedReason,
  isVillageReferenceBlocked,
} from '@/sync/failure-class'
import { common } from '@/locales/rw/common'
import { bindTestOwner, clearTestOwner } from '@/storage/test-owner'

function childForm(name: string) {
  return {
    fullName: name,
    dateOfBirth: '2021-03-15',
    gender: 'Umukobwa',
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

describe('Village-blocked child create', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-village-${createUuid()}`)
    store = resetLocalStoreForTests(db)
    await bindTestOwner(store)
  })

  afterEach(() => {
    clearTestOwner()
  })

  it('saves the child locally and keeps the create blocked until village resolves', async () => {
    const created = await createChildLocalFirst(store, {
      form: childForm('Village Blocked'),
      centerId: 'center-1',
      centerName: 'C',
      homeVillageId: null,
      villageResolved: false,
    })

    expect(created.id).toBeTruthy()
    expect(await store.getChild(created.id)).toBeTruthy()
    const ops = await store.listOperations({ status: 'blocked' })
    expect(ops).toHaveLength(1)
    expect(ops[0]?.entityType).toBe('child')
    expect(ops[0]?.lastError).toBe(VILLAGE_REFERENCE_BLOCKED_ERROR)
    expect(isVillageReferenceBlocked(ops[0]?.lastError)).toBe(true)
    expect(classifyBlockedReason(ops[0]?.lastError)).toBe('village_reference')

    await refreshBlockedOperations(store)
    expect((await store.getOperation(ops[0]!.clientOperationId))?.status).toBe('blocked')
    const batch = await selectPushBatch(store)
    expect(batch).toHaveLength(0)
  })

  it('becomes pending and pushable after village reference data is available', async () => {
    const created = await createChildLocalFirst(store, {
      form: childForm('Village Later'),
      centerId: 'center-1',
      centerName: 'C',
      homeVillageId: null,
      villageResolved: false,
    })
    const villageId = createUuid()
    await unblockChildCreatesNeedingVillage(store, async () => villageId)

    const child = await store.getChild(created.id)
    expect(child?.homeVillageId).toBe(villageId)
    const ops = await store.listOperations({ status: 'pending' })
    expect(ops).toHaveLength(1)
    expect(ops[0]?.lastError).toBeUndefined()
    const batch = await selectPushBatch(store)
    expect(batch.map((o) => o.entityId)).toContain(created.id)
  })

  it('stays durable and blocked when village lookup fails', async () => {
    const created = await createChildLocalFirst(store, {
      form: childForm('Missing Village'),
      centerId: 'center-1',
      centerName: 'C',
      homeVillageId: null,
      villageResolved: false,
    })
    await unblockChildCreatesNeedingVillage(store, async () => {
      throw new Error('Village not found')
    })

    expect(await store.getChild(created.id)).toBeTruthy()
    const ops = await store.listOperations({ status: 'blocked' })
    expect(ops).toHaveLength(1)
    expect(isVillageReferenceBlocked(ops[0]?.lastError)).toBe(true)
    expect(ops[0]?.lastError).toMatch(/village not found/i)
    expect(await selectPushBatch(store)).toHaveLength(0)
  })

  it('exposes distinct village-blocked UX copy', () => {
    expect(common.sync.blockedVillageCount).toContain('{count}')
    expect(common.sync.blockedVillageItem).toContain('{label}')
    expect(common.sync.blockedVillageHint).toMatch(/gikoresho/i)
    expect(common.sync.blockedVillageHint).not.toMatch(/Byahujwe na seriveri/)
  })
})
