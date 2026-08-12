import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  resetOfflineDbForTests,
  resetLocalStoreForTests,
  type LocalStore,
} from '@/storage'
import { createUuid } from '@/lib/uuid'
import { resetSyncEngineForTests, getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { MAX_PUSH_BATCH } from '@/sync/sync-types'
import { selectPushBatch } from '@/sync/outbox'
import { pullOnce } from '@/sync/pull'
import { inferAppliedVersion } from '@/sync/apply-local'
import {
  upsertFeedingDayLocalFirst,
  upsertFeedingMonthSummaryLocalFirst,
} from '@/features/feeding/local-feeding'
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

describe('Feeding offline sync integration', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-feed-${createUuid()}`)
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

  it('records offline feeding days that survive restart with stable ids', async () => {
    const centerId = createUuid()
    const recordedById = createUuid()
    const dates = Array.from({ length: 10 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`)
    const entityIds: string[] = []
    const opIds: string[] = []

    for (const date of dates) {
      const result = await upsertFeedingDayLocalFirst(store, {
        centerId,
        date,
        milkServed: true,
        porridgeServed: true,
        balancedMealServed: false,
        recordedById,
      })
      entityIds.push(result.record.id)
      const ops = await store.listOperations({ status: 'pending' })
      const op = ops.find((o) => o.entityId === result.record.id)
      expect(op).toBeTruthy()
      opIds.push(op!.clientOperationId)
    }

    const rows = await store.listFeedingDays({ centerId })
    expect(rows).toHaveLength(10)
    expect(rows.map((r) => r.id).sort()).toEqual([...entityIds].sort())

    const pending = await store.listOperations({ status: 'pending' })
    expect(pending.filter((o) => o.entityType === 'center_feeding_day')).toHaveLength(10)
    expect(pending.map((o) => o.clientOperationId).sort()).toEqual([...opIds].sort())
  })

  it('coalesces repeated edits on same day without duplicate natural-key rows', async () => {
    const centerId = createUuid()
    const recordedById = createUuid()
    const first = await upsertFeedingDayLocalFirst(store, {
      centerId,
      date: '2026-08-10',
      milkServed: true,
      porridgeServed: false,
      balancedMealServed: false,
      recordedById,
    })
    const opId = (await store.listOperations({ status: 'pending' }))[0].clientOperationId

    await store.updateOperation(opId, { attempts: 2 })
    const second = await upsertFeedingDayLocalFirst(store, {
      centerId,
      date: '2026-08-10',
      milkServed: true,
      porridgeServed: true,
      balancedMealServed: false,
      recordedById,
    })

    expect(second.record.id).toBe(first.record.id)
    const ops = await store.listOperations({ status: 'pending' })
    expect(ops).toHaveLength(1)
    expect(ops[0].clientOperationId).toBe(opId)
    expect(ops[0].attempts).toBe(2)
    expect(ops[0].operation).toBe('create')
    expect(ops[0].payload?.porridgeServed).toBe(true)
  })

  it('uses UPDATE with server version after clean local row', async () => {
    const now = new Date().toISOString()
    const id = createUuid()
    const centerId = createUuid()
    await store.putFeedingDay({
      id,
      centerId,
      date: '2026-08-09',
      milkServed: false,
      porridgeServed: false,
      balancedMealServed: false,
      cerealsOrTubers: false,
      legumes: false,
      dairy: false,
      animalProducts: false,
      fruitsVegetables: false,
      addedFat: false,
      recordedById: createUuid(),
      version: 3,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean',
      _updatedAtLocal: now,
    })

    await upsertFeedingDayLocalFirst(store, {
      centerId,
      date: '2026-08-09',
      milkServed: true,
      porridgeServed: true,
      balancedMealServed: false,
      recordedById: createUuid(),
    })

    const op = (await store.listOperations({ status: 'pending' }))[0]
    expect(op.operation).toBe('update')
    expect(op.version).toBe(3)
    expect(op.entityId).toBe(id)
  })

  it('month summary natural-key upsert + sync apply', async () => {
    const centerId = createUuid()
    const updatedById = createUuid()
    const result = await upsertFeedingMonthSummaryLocalFirst(store, {
      centerId,
      yearMonth: '2026-08',
      milkLiters: 20,
      flourKg: 8,
      foodSource: 'Ikigo',
      updatedById,
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
      created: 1,
      deduplicated: 0,
      status: 'applied',
      operations: [
        {
          id: createUuid(),
          clientOperationId: (await store.listOperations({ status: 'pending' }))[0]
            .clientOperationId,
          localId: result.record.id,
          entityId: result.record.id,
          entityType: 'center_feeding_month_summary' as const,
          operation: 'create' as const,
          status: 'applied' as const,
          conflictReason: null,
          replayed: false,
          sessionId: null,
        },
      ],
    })

    await getSyncEngine().syncNow()
    expect((await store.getFeedingMonthSummary(result.record.id))?._localStatus).toBe(
      'clean',
    )
    expect(inferAppliedVersion({ operation: 'create', version: 0 } as never)).toBe(1)
  })

  it('network failure preserves feeding day + clientOperationId', async () => {
    const result = await upsertFeedingDayLocalFirst(store, {
      centerId: createUuid(),
      date: '2026-08-10',
      milkServed: true,
      porridgeServed: false,
      balancedMealServed: false,
      recordedById: createUuid(),
    })
    const opId = (await store.listOperations({ status: 'pending' }))[0].clientOperationId

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

    expect(await store.getFeedingDay(result.record.id)).toBeTruthy()
    const op = await store.getOperation(opId)
    expect(op?.clientOperationId).toBe(opId)
    expect(op?.status).toBe('pending')
  })

  it('stale version conflict marks op conflict (server-wins via pull)', async () => {
    const now = new Date().toISOString()
    const id = createUuid()
    const centerId = createUuid()
    await store.putFeedingDay({
      id,
      centerId,
      date: '2026-08-08',
      milkServed: true,
      porridgeServed: false,
      balancedMealServed: false,
      cerealsOrTubers: false,
      legumes: false,
      dairy: false,
      animalProducts: false,
      fruitsVegetables: false,
      addedFat: false,
      recordedById: createUuid(),
      version: 1,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean',
      _updatedAtLocal: now,
    })

    await upsertFeedingDayLocalFirst(store, {
      centerId,
      date: '2026-08-08',
      milkServed: false,
      porridgeServed: true,
      balancedMealServed: false,
      recordedById: createUuid(),
    })
    const op = (await store.listOperations({ status: 'pending' }))[0]

    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: { lastModifiedAt: '2026-08-10T12:00:00.000Z', id },
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: {
        ...emptyBuckets(),
        center_feeding_day: [
          {
            id,
            centerId,
            recordedDate: '2026-08-08',
            milkServed: true,
            porridgeServed: false,
            balancedMealServed: false,
            cerealsOrTubers: false,
            legumes: false,
            dairy: false,
            animalProducts: false,
            fruitsVegetables: false,
            addedFat: false,
            recordedById: createUuid(),
            version: 4,
            deletedAt: null,
            lastModifiedAt: '2026-08-10T12:00:00.000Z',
          },
        ],
      },
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
          clientOperationId: op.clientOperationId,
          localId: id,
          entityId: id,
          entityType: 'center_feeding_day' as const,
          operation: 'update' as const,
          status: 'conflict' as const,
          conflictReason: 'Version mismatch',
          replayed: false,
          sessionId: null,
        },
      ],
    })

    await getSyncEngine().syncNow()
    expect((await store.getOperation(op.clientOperationId))?.status).toBe('conflict')
    // Server-wins: pull overwrites dirty local after conflict.
    const local = await store.getFeedingDay(id)
    expect(local?.version).toBe(4)
    expect(local?.milkServed).toBe(true)
    expect(local?._localStatus).toBe('clean')
  })

  it('pull hydrates feeding day + month summary', async () => {
    const dayId = createUuid()
    const monthId = createUuid()
    const centerId = createUuid()
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: { lastModifiedAt: '2026-08-10T12:00:00.000Z', id: dayId },
      hasMore: false,
      limit: 500,
      created: {
        ...emptyBuckets(),
        center_feeding_day: [
          {
            id: dayId,
            centerId,
            recordedDate: '2026-08-09',
            milkServed: true,
            porridgeServed: true,
            balancedMealServed: false,
            cerealsOrTubers: false,
            legumes: false,
            dairy: false,
            animalProducts: false,
            fruitsVegetables: false,
            addedFat: false,
            recordedById: createUuid(),
            version: 2,
            deletedAt: null,
            lastModifiedAt: '2026-08-10T11:00:00.000Z',
          },
        ],
        center_feeding_month_summary: [
          {
            id: monthId,
            centerId,
            yearMonth: '2026-08',
            milkLiters: 15,
            flourKg: 4,
            foodSource: 'Source',
            updatedById: createUuid(),
            version: 1,
            deletedAt: null,
            lastModifiedAt: '2026-08-10T12:00:00.000Z',
          },
        ],
      },
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })

    await pullOnce(store)
    expect((await store.getFeedingDay(dayId))?._localStatus).toBe('clean')
    expect((await store.getFeedingMonthSummary(monthId))?.milkLiters).toBe(15)
  })

  it('push batch never exceeds MAX_PUSH_BATCH', async () => {
    expect(MAX_PUSH_BATCH).toBeLessThanOrEqual(500)
    const centerId = createUuid()
    const recordedById = createUuid()
    for (let i = 0; i < 12; i += 1) {
      await upsertFeedingDayLocalFirst(store, {
        centerId,
        date: `2026-07-${String(i + 1).padStart(2, '0')}`,
        milkServed: true,
        porridgeServed: false,
        balancedMealServed: false,
        recordedById,
      })
    }
    const batch = await selectPushBatch(store, MAX_PUSH_BATCH)
    expect(batch.length).toBeLessThanOrEqual(MAX_PUSH_BATCH)
    expect(batch.length).toBe(12)
  })

  it('pull reconciles dirty feeding-day sibling with different UUID for same center+date', async () => {
    const centerId = createUuid()
    const localId = createUuid()
    const serverId = createUuid()
    const now = '2026-08-12T08:00:00.000Z'
    const serverNewer = '2026-08-12T12:00:00.000Z'
    await store.putFeedingDay({
      id: localId,
      centerId,
      date: '2026-08-12',
      milkServed: false,
      porridgeServed: true,
      balancedMealServed: false,
      cerealsOrTubers: false,
      legumes: false,
      dairy: false,
      animalProducts: false,
      fruitsVegetables: false,
      addedFat: false,
      recordedById: createUuid(),
      version: 0,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'dirty',
      _updatedAtLocal: now,
    })
    await store.enqueueOperation({
      clientOperationId: createUuid(),
      entityType: 'center_feeding_day',
      operation: 'create',
      entityId: localId,
      version: 0,
      payload: { centerId, recordedDate: '2026-08-12' },
    })
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: { lastModifiedAt: serverNewer, id: serverId },
      hasMore: false,
      limit: 500,
      created: {
        ...emptyBuckets(),
        center_feeding_day: [
          {
            id: serverId,
            centerId,
            recordedDate: '2026-08-12',
            milkServed: true,
            porridgeServed: false,
            balancedMealServed: false,
            cerealsOrTubers: false,
            legumes: false,
            dairy: false,
            animalProducts: false,
            fruitsVegetables: false,
            addedFat: false,
            recordedById: createUuid(),
            version: 2,
            lastModifiedAt: serverNewer,
            deletedAt: null,
          },
        ],
      },
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })

    await pullOnce(store, { deviceId: tokenStorage.getDeviceId()! })
    const adopted = await store.getFeedingDay(serverId)
    expect(adopted).toBeTruthy()
    expect(adopted?._localStatus).toBe('clean')
    expect(adopted?.milkServed).toBe(true)
    const sibling = await store.getFeedingDay(localId)
    expect(sibling?.deletedAt || sibling?._localStatus === 'clean').toBeTruthy()
  })

  it('pull keeps newer local feeding-day fields when dirty sibling is newer than server', async () => {
    const centerId = createUuid()
    const localId = createUuid()
    const serverId = createUuid()
    const localNewer = '2026-08-12T14:00:00.000Z'
    const serverTs = '2026-08-12T08:00:00.000Z'
    const opId = createUuid()
    await store.putFeedingDay({
      id: localId,
      centerId,
      date: '2026-08-12',
      milkServed: true,
      porridgeServed: true,
      balancedMealServed: true,
      cerealsOrTubers: true,
      legumes: false,
      dairy: false,
      animalProducts: false,
      fruitsVegetables: false,
      addedFat: false,
      recordedById: createUuid(),
      version: 0,
      deletedAt: null,
      lastModifiedAt: localNewer,
      _localStatus: 'dirty',
      _updatedAtLocal: localNewer,
    })
    await store.enqueueOperation({
      clientOperationId: opId,
      entityType: 'center_feeding_day',
      operation: 'create',
      entityId: localId,
      version: 0,
      payload: { centerId, recordedDate: '2026-08-12', milkServed: true },
    })
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: { lastModifiedAt: serverTs, id: serverId },
      hasMore: false,
      limit: 500,
      created: {
        ...emptyBuckets(),
        center_feeding_day: [
          {
            id: serverId,
            centerId,
            recordedDate: '2026-08-12',
            milkServed: false,
            porridgeServed: false,
            balancedMealServed: false,
            cerealsOrTubers: false,
            legumes: false,
            dairy: false,
            animalProducts: false,
            fruitsVegetables: false,
            addedFat: false,
            recordedById: createUuid(),
            version: 3,
            lastModifiedAt: serverTs,
            deletedAt: null,
          },
        ],
      },
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })

    await pullOnce(store, { deviceId: tokenStorage.getDeviceId()! })
    const adopted = await store.getFeedingDay(serverId)
    expect(adopted?._localStatus).toBe('dirty')
    expect(adopted?.milkServed).toBe(true)
    expect(adopted?.balancedMealServed).toBe(true)
    expect(adopted?.version).toBe(3)
    const op = await store.getOperation(opId)
    expect(op?.entityId).toBe(serverId)
    expect(op?.operation).toBe('update')
    expect(op?.status).toBe('pending')
  })

  it('does not merge feeding days with different dates at the same center', async () => {
    const centerId = createUuid()
    const localId = createUuid()
    const serverId = createUuid()
    const now = '2026-08-12T08:00:00.000Z'
    await store.putFeedingDay({
      id: localId,
      centerId,
      date: '2026-08-11',
      milkServed: true,
      porridgeServed: false,
      balancedMealServed: false,
      cerealsOrTubers: false,
      legumes: false,
      dairy: false,
      animalProducts: false,
      fruitsVegetables: false,
      addedFat: false,
      recordedById: createUuid(),
      version: 0,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'dirty',
      _updatedAtLocal: now,
    })
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: { lastModifiedAt: now, id: serverId },
      hasMore: false,
      limit: 500,
      created: {
        ...emptyBuckets(),
        center_feeding_day: [
          {
            id: serverId,
            centerId,
            recordedDate: '2026-08-12',
            milkServed: false,
            porridgeServed: true,
            balancedMealServed: false,
            cerealsOrTubers: false,
            legumes: false,
            dairy: false,
            animalProducts: false,
            fruitsVegetables: false,
            addedFat: false,
            recordedById: createUuid(),
            version: 1,
            lastModifiedAt: now,
            deletedAt: null,
          },
        ],
      },
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })

    await pullOnce(store, { deviceId: tokenStorage.getDeviceId()! })
    expect((await store.getFeedingDay(localId))?._localStatus).toBe('dirty')
    expect((await store.getFeedingDay(localId))?.date).toBe('2026-08-11')
    expect((await store.getFeedingDay(serverId))?._localStatus).toBe('clean')
    expect((await store.getFeedingDay(serverId))?.date).toBe('2026-08-12')
  })

  it('pull reconciles dirty feeding-month sibling with different UUID for same center+yearMonth', async () => {
    const centerId = createUuid()
    const localId = createUuid()
    const serverId = createUuid()
    const now = '2026-08-12T08:00:00.000Z'
    const serverNewer = '2026-08-12T12:00:00.000Z'
    await store.putFeedingMonthSummary({
      id: localId,
      centerId,
      yearMonth: '2026-08',
      milkLiters: 4,
      flourKg: 1,
      foodSource: 'local',
      updatedById: createUuid(),
      version: 0,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'dirty',
      _updatedAtLocal: now,
    })
    await store.enqueueOperation({
      clientOperationId: createUuid(),
      entityType: 'center_feeding_month_summary',
      operation: 'create',
      entityId: localId,
      version: 0,
      payload: { centerId, yearMonth: '2026-08' },
    })
    tokenStorage.setDeviceId(createUuid())
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: { lastModifiedAt: serverNewer, id: serverId },
      hasMore: false,
      limit: 500,
      created: {
        ...emptyBuckets(),
        center_feeding_month_summary: [
          {
            id: serverId,
            centerId,
            yearMonth: '2026-08',
            milkLiters: 20,
            flourKg: 8,
            foodSource: 'donation',
            updatedById: createUuid(),
            version: 2,
            lastModifiedAt: serverNewer,
            deletedAt: null,
          },
        ],
      },
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })

    await pullOnce(store, { deviceId: tokenStorage.getDeviceId()! })
    const adopted = await store.getFeedingMonthSummary(serverId)
    expect(adopted?._localStatus).toBe('clean')
    expect(adopted?.milkLiters).toBe(20)
    const sibling = await store.getFeedingMonthSummary(localId)
    expect(sibling?.deletedAt || sibling?._localStatus === 'clean').toBeTruthy()
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
