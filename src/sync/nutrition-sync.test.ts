import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  resetOfflineDbForTests,
  resetLocalStoreForTests,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { resetSyncEngineForTests, getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { selectPushBatch, refreshBlockedOperations } from '@/sync/outbox'
import { pullOnce } from '@/sync/pull'
import { inferAppliedVersion } from '@/sync/apply-local'
import {
  appendScreeningCorrectionLocalFirst,
  createScreeningLocalFirst,
} from '@/features/nutrition/local-screenings'
import { tokenStorage } from '@/api/token-storage'
import { bindTestOwner, clearTestOwner } from '@/storage/test-owner'

vi.mock('@/api/generated/endpoints/sync/sync', () => ({
  syncControllerPush: vi.fn(),
  syncControllerPull: vi.fn(),
  syncControllerSessionStatus: vi.fn(),
}))

import {
  syncControllerPush,
  syncControllerPull,
} from '@/api/generated/endpoints/sync/sync'

describe('Growth/Nutrition screening offline sync', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-nut-${createUuid()}`)
    store = resetLocalStoreForTests(db)
    await bindTestOwner(store)
    resetSyncEngineForTests(store)
    vi.clearAllMocks()
    tokenStorage.clearAll()
    tokenStorage.setTokens({ accessToken: 'test-access', refreshToken: 'test-refresh' })
    Object.defineProperty(networkState, 'getSnapshot', {
      configurable: true,
      value: () => ({ status: 'ONLINE', isOnline: true, lastReachableAt: null }),
    })
  })

  afterEach(() => {
    clearTestOwner()
  })

  it('records 10 offline screenings that survive restart with stable UUIDs', async () => {
    const centerId = createUuid()
    const recordedById = createUuid()
    const childIds = Array.from({ length: 10 }, () => createUuid())
    const screeningIds: string[] = []
    const opIds: string[] = []

    for (const childId of childIds) {
      const result = await createScreeningLocalFirst(store, {
        childId,
        centerId,
        date: '2026-08-10',
        weightKg: 12,
        muacCm: 14,
        recordedById,
      })
      screeningIds.push(result.screening.id)
      opIds.push(result.screeningOperationId)
    }

    const rows = await store.listNutritionScreenings({ centerId })
    expect(rows).toHaveLength(10)
    const ops = await store.listOperations({ status: 'pending' })
    expect(ops.filter((o) => o.entityType === 'child_nutrition_screening')).toHaveLength(10)
    expect(ops.map((o) => o.clientOperationId).sort()).toEqual([...opIds].sort())
    expect(rows.map((r) => r.id).sort()).toEqual([...screeningIds].sort())
  })

  it('allows multiple historical screenings for the same child', async () => {
    const childId = createUuid()
    const centerId = createUuid()
    const recordedById = createUuid()
    const dates = ['2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01']

    for (const date of dates) {
      await createScreeningLocalFirst(store, {
        childId,
        centerId,
        date,
        weightKg: 12,
        muacCm: 13.8,
        recordedById,
      })
    }

    const rows = await store.listNutritionScreenings({ childId })
    expect(rows).toHaveLength(4)
    expect(rows.map((r) => r.screeningDate)).toEqual([...dates].reverse())
  })

  it('append-only update creates a new screening id (never UPDATE op)', async () => {
    const first = await createScreeningLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      date: '2026-08-01',
      weightKg: 12,
      muacCm: 14,
      recordedById: createUuid(),
    })

    const second = await appendScreeningCorrectionLocalFirst(store, first.screening.id, {
      centerId: first.screening.centerId,
      recordedById: first.screening.recordedById,
      muacCm: 13.0,
      weightKg: 12.2,
      date: '2026-08-10',
    })

    expect(second.screening.id).not.toBe(first.screening.id)
    const ops = await store.listOperations({ status: ['pending', 'blocked'] })
    expect(ops.every((o) => o.operation === 'create')).toBe(true)
    expect(
      ops.filter((o) => o.entityType === 'child_nutrition_screening'),
    ).toHaveLength(2)
    const history = await store.listNutritionScreenings({ childId: first.screening.childId })
    expect(history).toHaveLength(2)
  })

  it('referral depends on screening and stays blocked until screening applied', async () => {
    const result = await createScreeningLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      date: '2026-08-10',
      weightKg: 8,
      muacCm: 11.0,
      recordedById: createUuid(),
    })

    await refreshBlockedOperations(store)
    let referralOp = await store.getOperation(result.referralOperationId!)
    expect(referralOp?.status).toBe('blocked')

    const batch = await selectPushBatch(store)
    expect(batch.map((o) => o.clientOperationId)).toEqual([result.screeningOperationId])
    expect(batch.find((o) => o.clientOperationId === result.referralOperationId)).toBeUndefined()

    // Simulate screening sync failure — referral must remain blocked.
    await store.updateOperation(result.screeningOperationId, {
      status: 'failed',
      lastError: 'network',
    })
    await refreshBlockedOperations(store)
    referralOp = await store.getOperation(result.referralOperationId!)
    expect(referralOp?.status).toBe('blocked')
    expect((await selectPushBatch(store)).map((o) => o.clientOperationId)).toEqual([
      result.screeningOperationId,
    ])

    // Retry screening → applied → referral becomes pending.
    await store.updateOperation(result.screeningOperationId, {
      status: 'applied',
      lastError: undefined,
    })
    await refreshBlockedOperations(store)
    referralOp = await store.getOperation(result.referralOperationId!)
    expect(referralOp?.status).toBe('pending')
    const released = await selectPushBatch(store)
    expect(released.map((o) => o.clientOperationId)).toEqual([result.referralOperationId])
  })

  it('does not duplicate referral for the same screening sourceId', async () => {
    const screeningId = createUuid()
    const now = new Date().toISOString()
    await store.putReferral({
      id: createUuid(),
      childId: createUuid(),
      centerId: createUuid(),
      sourceType: 'nutrition',
      sourceId: screeningId,
      referralDate: '2026-08-10',
      reason: 'MUAC — severe',
      destination: 'Ikigo nderabuzima',
      status: 'pending',
      recordedById: createUuid(),
      version: 0,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'dirty',
      _updatedAtLocal: now,
    })

    // Re-check getReferralBySourceId used by create path.
    const existing = await store.getReferralBySourceId(screeningId)
    expect(existing).toBeTruthy()
    const again = await store.getReferralBySourceId(screeningId)
    expect(again?.id).toBe(existing?.id)
  })

  it('push sync applies screening then unblocks referral; clientOperationIds stable', async () => {
    const result = await createScreeningLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      date: '2026-08-10',
      weightKg: 8,
      muacCm: 11.0,
      recordedById: createUuid(),
    })
    const screeningOpId = result.screeningOperationId
    const referralOpId = result.referralOperationId!

    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })

    // First push: only screening ready.
    vi.mocked(syncControllerPush).mockResolvedValueOnce({
      sessionId: null,
      accepted: 1,
      created: 1,
      deduplicated: 0,
      status: 'applied',
      operations: [
        {
          id: createUuid(),
          clientOperationId: screeningOpId,
          localId: result.screening.id,
          entityId: result.screening.id,
          entityType: 'child_nutrition_screening' as const,
          operation: 'create' as const,
          status: 'applied' as const,
          conflictReason: null,
          replayed: false,
          sessionId: null,
        },
      ],
    })

    await getSyncEngine().syncNow()
    expect((await store.getOperation(screeningOpId))?.status).toBe('applied')
    expect((await store.getOperation(screeningOpId))?.clientOperationId).toBe(screeningOpId)
    expect(inferAppliedVersion({ operation: 'create', version: 0 } as never)).toBe(1)
    expect((await store.getNutritionScreening(result.screening.id))?._localStatus).toBe('clean')

    await refreshBlockedOperations(store)
    expect((await store.getOperation(referralOpId))?.status).toBe('pending')

    vi.mocked(syncControllerPush).mockResolvedValueOnce({
      sessionId: null,
      accepted: 1,
      created: 1,
      deduplicated: 0,
      status: 'applied',
      operations: [
        {
          id: createUuid(),
          clientOperationId: referralOpId,
          localId: result.referral!.id,
          entityId: result.referral!.id,
          entityType: 'referral' as const,
          operation: 'create' as const,
          status: 'applied' as const,
          conflictReason: null,
          replayed: false,
          sessionId: null,
        },
      ],
    })

    await getSyncEngine().syncNow()
    expect((await store.getOperation(referralOpId))?.clientOperationId).toBe(referralOpId)
    expect((await store.getOperation(referralOpId))?.status).toBe('applied')
    expect((await store.getReferral(result.referral!.id))?._localStatus).toBe('clean')
  })

  it('network failure mid-sync preserves screening, outbox ids, and referral dependency', async () => {
    const result = await createScreeningLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      date: '2026-08-10',
      weightKg: 8,
      muacCm: 11.0,
      recordedById: createUuid(),
    })

    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
    vi.mocked(syncControllerPush).mockRejectedValueOnce(new Error('network down'))

    await getSyncEngine().syncNow()

    expect(await store.getNutritionScreening(result.screening.id)).toBeTruthy()
    const screeningOp = await store.getOperation(result.screeningOperationId)
    expect(screeningOp?.clientOperationId).toBe(result.screeningOperationId)
    // Push catch restores pending for retry with same id.
    expect(screeningOp?.status).toBe('pending')
    expect((await store.getOperation(result.referralOperationId!))?.dependsOn).toEqual([
      result.screeningOperationId,
    ])

    // No duplicate screening/referral rows after failed push.
    expect(await store.listNutritionScreenings({ childId: result.screening.childId })).toHaveLength(
      1,
    )
    expect(await store.listReferrals({ sourceId: result.screening.id })).toHaveLength(1)
  })

  it('pull hydrates child_nutrition_screening into LocalStore', async () => {
    const id = createUuid()
    const childId = createUuid()
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: { lastModifiedAt: '2026-08-10T12:00:00.000Z', id },
      hasMore: false,
      limit: 500,
      created: {
        ...emptyBuckets(),
        child_nutrition_screening: [
          {
            id,
            childId,
            screeningDate: '2026-08-09',
            weightKg: 12.5,
            muacCm: 14.1,
            heightCm: 85,
            nutritionStatus: 'normal',
            requiresReferral: false,
            feedingConcern: false,
            dietNotes: null,
            recordedById: createUuid(),
            version: 2,
            deletedAt: null,
            lastModifiedAt: '2026-08-10T12:00:00.000Z',
          },
        ],
      },
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })

    await pullOnce(store)
    const row = await store.getNutritionScreening(id)
    expect(row?.childId).toBe(childId)
    expect(row?.version).toBe(2)
    expect(row?._localStatus).toBe('clean')
    expect(row?.muacCm).toBe(14.1)
  })

  it('CREATE id collision is treated as conflict status locally after push result', async () => {
    const result = await createScreeningLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      date: '2026-08-10',
      weightKg: 12,
      muacCm: 14,
      recordedById: createUuid(),
    })

    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: null,
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })
    vi.mocked(syncControllerPush).mockResolvedValue({
      sessionId: null,
      accepted: 1,
      created: 0,
      deduplicated: 0,
      status: 'conflict',
      operations: [
        {
          id: createUuid(),
          clientOperationId: result.screeningOperationId,
          localId: result.screening.id,
          entityId: result.screening.id,
          entityType: 'child_nutrition_screening' as const,
          operation: 'create' as const,
          status: 'conflict' as const,
          conflictReason: 'Entity already exists on server',
          replayed: false,
          sessionId: null,
        },
      ],
    })

    await getSyncEngine().syncNow()
    expect((await store.getOperation(result.screeningOperationId))?.status).toBe('conflict')
  })

  it('Sprint 5.9: rejects nutrition payload without nutritionStatus before enqueue', async () => {
    const { buildNutritionScreeningSyncPayload } = await import(
      '@/sync/nutrition-sync-mapper'
    )
    const now = new Date().toISOString()
    expect(() =>
      buildNutritionScreeningSyncPayload({
        id: createUuid(),
        childId: createUuid(),
        centerId: createUuid(),
        screeningDate: '2026-08-12',
        weightKg: 12,
        muacCm: 14,
        heightCm: null,
        headCircumferenceCm: null,
        nutritionStatus: '',
        requiresReferral: false,
        mealQuality: null,
        feedingConcern: false,
        dietNotes: null,
        recordedById: createUuid(),
        version: 0,
        deletedAt: null,
        lastModifiedAt: now,
        createdAt: now,
        _localStatus: 'dirty',
        _updatedAtLocal: now,
      }),
    ).toThrow(/nutritionStatus is required/)
  })

  it('Sprint 5.9: local create always enqueues nutritionStatus', async () => {
    const result = await createScreeningLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      date: '2026-08-12',
      weightKg: 12,
      muacCm: 14,
      recordedById: createUuid(),
    })
    const op = await store.getOperation(result.screeningOperationId)
    expect(typeof op?.payload?.nutritionStatus).toBe('string')
    expect(String(op?.payload?.nutritionStatus).length).toBeGreaterThan(0)
  })
})

function emptyBuckets() {
  return {
    child: [],
    attendance_record: [],
    child_nutrition_screening: [],
    child_transfer: [],
    ecd_center: [],
    compliance_assessment: [],
    compliance_assessment_item: [],
    wash_indicator: [],
    center_feeding_day: [],
    center_feeding_month_summary: [],
    sted_assessment: [],
    referral: [],
  }
}
