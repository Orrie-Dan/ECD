import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  resetOfflineDbForTests,
  resetLocalStoreForTests,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { bindTestOwner, clearTestOwner } from '@/storage/test-owner'
import { TransferStatus } from '@/api/generated/models/transferStatus'
import {
  adjustPulledChildForLocalCenter,
  applyPulledTransferToLocalChild,
  markChildPendingTransferLocal,
  markChildTransferredOutLocal,
  reconcileOutgoingTransfersLocal,
} from '@/features/children/transfer-local'
import type { LocalChildRecord } from '@/storage/types'

vi.mock('@/api/resources/children', () => ({
  fetchChildDetail: vi.fn(),
}))

import { fetchChildDetail } from '@/api/resources/children'

function baseChild(overrides: Partial<LocalChildRecord> = {}): LocalChildRecord {
  const now = new Date().toISOString()
  return {
    id: createUuid(),
    registrationNumber: 'REG-1',
    firstName: 'Aline',
    lastName: 'Uwase',
    fullName: 'Aline Uwase',
    centerId: 'origin-center',
    centerName: 'Origin ECD',
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
    ...overrides,
  }
}

describe('transfer-local', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-transfer-local-${createUuid()}`)
    store = resetLocalStoreForTests(db)
    await bindTestOwner(store, undefined, 'origin-center')
    vi.mocked(fetchChildDetail).mockReset()
  })

  afterEach(() => {
    clearTestOwner()
  })

  it('marks pending transfer as transferred locally', async () => {
    const child = baseChild()
    await store.putChild(child)
    await markChildPendingTransferLocal(store, child.id)
    expect((await store.getChild(child.id))?.status).toBe('transferred')
  })

  it('reconcile marks accepted outbound that is still active at origin', async () => {
    const child = baseChild()
    await store.putChild(child)

    vi.mocked(fetchChildDetail).mockRejectedValueOnce(new Error('offline'))

    const changed = await reconcileOutgoingTransfersLocal(store, [
      {
        childId: child.id,
        status: TransferStatus.accepted,
        fromCenterId: 'origin-center',
      },
    ])

    expect(changed).toBe(true)
    expect((await store.getChild(child.id))?.status).toBe('transferred')
  })

  it('reconcile refreshes accepted outbound from API when online', async () => {
    const child = baseChild()
    await store.putChild(child)

    vi.mocked(fetchChildDetail).mockResolvedValueOnce({
      id: child.id,
      registrationNumber: child.registrationNumber,
      fullName: child.fullName,
      firstName: child.firstName,
      lastName: child.lastName,
      centerId: 'dest-center',
      centerName: 'Dest ECD',
      dateOfBirth: child.dateOfBirth,
      gender: 'Umukobwa',
      status: 'active',
      guardianName: child.guardianName,
      guardianPhone: child.guardianPhone,
      guardianRelation: 'umubyeyi_mama',
      homeVillageId: child.homeVillageId,
      registeredAt: child.registeredAt,
      province: '',
      district: '',
      sector: '',
      cell: '',
      village: '',
      version: 2,
    })

    const changed = await reconcileOutgoingTransfersLocal(store, [
      {
        childId: child.id,
        status: TransferStatus.accepted,
        fromCenterId: 'origin-center',
      },
    ])

    expect(changed).toBe(true)
    const updated = await store.getChild(child.id)
    expect(updated?.centerId).toBe('dest-center')
    expect(updated?.status).toBe('active')
  })

  it('reconcile does not re-transfer a child already moved off origin', async () => {
    const child = baseChild({ centerId: 'dest-center', status: 'active' })
    await store.putChild(child)

    const changed = await reconcileOutgoingTransfersLocal(store, [
      {
        childId: child.id,
        status: TransferStatus.accepted,
        fromCenterId: 'origin-center',
      },
    ])

    expect(changed).toBe(false)
    expect(fetchChildDetail).not.toHaveBeenCalled()
  })

  it('adjustPulledChild keeps origin transferred when centre moves', () => {
    const existing = baseChild()
    const mapped = baseChild({
      id: existing.id,
      centerId: 'dest-center',
      status: 'active',
      version: 2,
    })

    const result = adjustPulledChildForLocalCenter(mapped, existing, 'origin-center')
    expect(result.centerId).toBe('origin-center')
    expect(result.status).toBe('transferred')
  })

  it('adjustPulledChild preserves local pending transferred over server active', () => {
    const existing = baseChild({ status: 'transferred' })
    const mapped = baseChild({
      id: existing.id,
      status: 'active',
      version: 2,
    })

    const result = adjustPulledChildForLocalCenter(mapped, existing, 'origin-center')
    expect(result.status).toBe('transferred')
  })

  it('applyPulledTransfer marks accepted outbound as transferred', async () => {
    const existing = baseChild()
    const next = applyPulledTransferToLocalChild(
      existing,
      {
        childId: existing.id,
        status: TransferStatus.accepted,
        fromCenterId: 'origin-center',
      },
      'origin-center',
    )
    expect(next?.status).toBe('transferred')
    expect(next?.centerId).toBe('origin-center')
  })

  it('applyPulledTransfer ignores transfers for other centres', () => {
    const existing = baseChild({ centerId: 'other-center' })
    const next = applyPulledTransferToLocalChild(
      existing,
      {
        childId: existing.id,
        status: TransferStatus.accepted,
        fromCenterId: 'origin-center',
      },
      'origin-center',
    )
    expect(next).toBeNull()
  })
})
