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
  createReferralLocalFirst,
  updateReferralStatusLocalFirst,
  patchReferralLocalFirst,
  canTransitionReferralStatus,
} from '@/features/referrals/local-referrals'
import { mapReferralListToLocalSeed } from '@/features/referrals/seed-from-rest'
import { createScreeningLocalFirst } from '@/features/nutrition/local-screenings'
import { createStedLocalFirst } from '@/features/sted/local-sted'
import { emptyPhysicalCheck } from '@/lib/sted-utils'
import { MOCK_REFERRALS } from '@/lib/mock-data'
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

describe('Referral offline-first (Sprint 4.8.5)', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-ref-${createUuid()}`)
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

  it('reads local referrals and seeds clean records without overwriting dirty', async () => {
    const dirtyId = createUuid()
    const now = new Date().toISOString()
    await store.putReferral({
      id: dirtyId,
      childId: createUuid(),
      centerId: createUuid(),
      sourceType: 'nutrition',
      sourceId: createUuid(),
      referralDate: '2026-08-01',
      reason: 'local',
      destination: 'Ikigo',
      status: 'pending',
      recordedById: createUuid(),
      version: 0,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'dirty',
      _updatedAtLocal: now,
    })

    await mapReferralListToLocalSeed(store, [
      {
        id: dirtyId,
        childId: createUuid(),
        centerId: createUuid(),
        assessmentId: createUuid(),
        sourceType: 'nutrition',
        date: '2026-08-09',
        reason: 'remote',
        destination: 'Remote',
        status: 'completed',
        version: 9,
      },
      {
        id: createUuid(),
        childId: createUuid(),
        centerId: createUuid(),
        assessmentId: createUuid(),
        sourceType: 'sted',
        date: '2026-08-08',
        reason: 'STED',
        destination: 'Ikigo',
        status: 'pending',
        version: 1,
      },
    ])

    const dirty = await store.getReferral(dirtyId)
    expect(dirty?.reason).toBe('local')
    expect(dirty?._localStatus).toBe('dirty')
    expect((await store.listReferrals()).length).toBeGreaterThanOrEqual(2)
  })

  it('standalone create uses stable UUID + clientOperationId and version 0', async () => {
    const result = await createReferralLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      assessmentId: createUuid(),
      sourceType: 'nutrition',
      date: '2026-08-10',
      reason: 'MUAC — severe',
      destination: 'Ikigo nderabuzima',
      recordedById: createUuid(),
    })

    expect(result.savedOnDevice).toBe(true)
    expect(result.referral.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    const op = await store.getOperation(result.operationId)
    expect(op?.operation).toBe('create')
    expect(op?.version).toBe(0)
    expect(op?.entityType).toBe('referral')
    expect(op?.clientOperationId).toBe(result.operationId)
  })

  it('prevents duplicate create for the same sourceId', async () => {
    const sourceId = createUuid()
    const input = {
      childId: createUuid(),
      centerId: createUuid(),
      assessmentId: sourceId,
      sourceType: 'sted' as const,
      date: '2026-08-10',
      reason: 'STED',
      destination: 'Ikigo',
      recordedById: createUuid(),
    }
    const first = await createReferralLocalFirst(store, input)
    const second = await createReferralLocalFirst(store, input)
    expect(second.referral.id).toBe(first.referral.id)
    const creates = (await store.listOperations({ status: ['pending', 'blocked'] })).filter(
      (o) => o.entityType === 'referral' && o.operation === 'create',
    )
    expect(creates).toHaveLength(1)
  })

  it('does not duplicate Nutrition/STED dependency-created referrals', async () => {
    const screening = await createScreeningLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      date: '2026-08-10',
      weightKg: 8,
      muacCm: 11.0,
      recordedById: createUuid(),
    })
    expect(screening.referral).toBeTruthy()

    const again = await createReferralLocalFirst(store, {
      childId: screening.screening.childId,
      centerId: screening.screening.centerId,
      assessmentId: screening.screening.id,
      sourceType: 'nutrition',
      date: '2026-08-10',
      reason: 'dup',
      destination: 'Ikigo',
      recordedById: screening.screening.recordedById,
    })
    expect(again.referral.id).toBe(screening.referral!.id)
    expect(await store.listReferrals({ sourceId: screening.screening.id })).toHaveLength(1)

    const sted = await createStedLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      assessmentDate: '2026-08-10',
      ageBand: '1_3',
      consentObtained: true,
      physical: { ...emptyPhysicalCheck(), headFace: 'problem' },
      noProblem: false,
      milestones: {
        pickStandStep: 'yego',
        chooseStack: 'yego',
        imitatePicture: 'yego',
        scribble: 'yego',
        knowsTools: 'yego',
        understandsCommands: 'yego',
        socialPlay: 'yego',
      },
      outcome: {
        normal: false,
        referred: true,
        counseling: false,
        other: false,
        followUpIn6Months: true,
      },
      referralReason: 'STED',
      referralDestination: 'Ikigo',
      assessedById: createUuid(),
    })
    expect(sted.referral).toBeTruthy()
    const stedAgain = await createReferralLocalFirst(store, {
      childId: sted.assessment.childId,
      centerId: sted.assessment.centerId,
      assessmentId: sted.assessment.id,
      sourceType: 'sted',
      date: '2026-08-10',
      reason: 'dup',
      destination: 'Ikigo',
      recordedById: sted.record.assessedById,
    })
    expect(stedAgain.referral.id).toBe(sted.referral!.id)
  })

  it('offline status update is atomic with CAS version and correct transition rules', async () => {
    expect(canTransitionReferralStatus('pending', 'completed')).toBe(true)
    expect(canTransitionReferralStatus('completed', 'cancelled')).toBe(false)

    const created = await createReferralLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      assessmentId: createUuid(),
      sourceType: 'nutrition',
      date: '2026-08-10',
      reason: 'MUAC',
      destination: 'Ikigo',
      recordedById: createUuid(),
    })

    // Simulate CREATE applied so status UPDATE uses server version.
    await store.markReferralClean(created.referral.id, 1)
    await store.updateOperation(created.operationId, { status: 'applied' })

    const updated = await updateReferralStatusLocalFirst(store, {
      id: created.referral.id,
      status: 'completed',
      implementedAt: '2026-08-11',
      notes: 'Done',
    })

    expect(updated.referral.status).toBe('completed')
    const op = await store.getOperation(updated.operationId)
    expect(op?.operation).toBe('update')
    expect(op?.version).toBe(1)
    expect(op?.payload?.status).toBe('completed')
    expect(op?.payload?.notes).toBe('Done')
    expect((await store.getReferral(created.referral.id))?._localStatus).toBe('dirty')

    await expect(
      updateReferralStatusLocalFirst(store, {
        id: created.referral.id,
        status: 'cancelled',
      }),
    ).rejects.toThrow(/Cannot transition/)
  })

  it('coalesces status into pending CREATE (no separate UPDATE before create applies)', async () => {
    const created = await createReferralLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      assessmentId: createUuid(),
      sourceType: 'nutrition',
      date: '2026-08-10',
      reason: 'MUAC',
      destination: 'Ikigo',
      recordedById: createUuid(),
    })

    const updated = await updateReferralStatusLocalFirst(store, {
      id: created.referral.id,
      status: 'completed',
      notes: 'early complete',
    })

    expect(updated.operationId).toBe(created.operationId)
    const op = await store.getOperation(created.operationId)
    expect(op?.operation).toBe('create')
    expect(op?.version).toBe(0)
    expect(op?.payload?.status).toBe('completed')
    const ops = await store.listOperations({ status: ['pending', 'blocked'] })
    expect(ops.filter((o) => o.entityId === created.referral.id)).toHaveLength(1)
  })

  it('retry preserves clientOperationId after network failure', async () => {
    const created = await createReferralLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      assessmentId: createUuid(),
      sourceType: 'nutrition',
      date: '2026-08-10',
      reason: 'MUAC',
      destination: 'Ikigo',
      recordedById: createUuid(),
    })
    await store.markReferralClean(created.referral.id, 1)
    await store.updateOperation(created.operationId, { status: 'applied' })

    const updated = await updateReferralStatusLocalFirst(store, {
      id: created.referral.id,
      status: 'completed',
    })
    const opId = updated.operationId

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

    const op = await store.getOperation(opId)
    expect(op?.clientOperationId).toBe(opId)
    expect(op?.status).toBe('pending')
  })

  it('sync success marks referral clean; conflict leaves conflict status', async () => {
    const created = await createReferralLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      assessmentId: createUuid(),
      sourceType: 'nutrition',
      date: '2026-08-10',
      reason: 'MUAC',
      destination: 'Ikigo',
      recordedById: createUuid(),
    })
    await store.markReferralClean(created.referral.id, 1)
    await store.updateOperation(created.operationId, { status: 'applied' })

    const updated = await updateReferralStatusLocalFirst(store, {
      id: created.referral.id,
      status: 'cancelled',
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
    vi.mocked(syncControllerPush).mockResolvedValueOnce({
      sessionId: null,
      accepted: 1,
      created: 0,
      deduplicated: 0,
      status: 'applied',
      operations: [
        {
          id: createUuid(),
          clientOperationId: updated.operationId,
          localId: created.referral.id,
          entityId: created.referral.id,
          entityType: 'referral' as const,
          operation: 'update' as const,
          status: 'applied' as const,
          conflictReason: null,
          replayed: false,
          sessionId: null,
        },
      ],
    })

    await getSyncEngine().syncNow()
    expect((await store.getOperation(updated.operationId))?.status).toBe('applied')
    expect(inferAppliedVersion({ operation: 'update', version: 1 } as never)).toBe(2)
    expect((await store.getReferral(created.referral.id))?._localStatus).toBe('clean')

    // New dirty update → conflict response
    const again = await updateReferralStatusLocalFirst(store, {
      id: created.referral.id,
      status: 'completed',
    }).catch(() => null)
    // already cancelled — transition fails locally
    expect(again).toBeNull()

    // Force a conflicted update op for an existing pending row
    const pendingCreate = await createReferralLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      assessmentId: createUuid(),
      sourceType: 'sted',
      date: '2026-08-10',
      reason: 'STED',
      destination: 'Ikigo',
      recordedById: createUuid(),
    })
    await store.markReferralClean(pendingCreate.referral.id, 3)
    await store.updateOperation(pendingCreate.operationId, { status: 'applied' })
    const conflictUpdate = await updateReferralStatusLocalFirst(store, {
      id: pendingCreate.referral.id,
      status: 'completed',
    })

    vi.mocked(syncControllerPush).mockResolvedValueOnce({
      sessionId: null,
      accepted: 1,
      created: 0,
      deduplicated: 0,
      status: 'conflict',
      operations: [
        {
          id: createUuid(),
          clientOperationId: conflictUpdate.operationId,
          localId: pendingCreate.referral.id,
          entityId: pendingCreate.referral.id,
          entityType: 'referral' as const,
          operation: 'update' as const,
          status: 'conflict' as const,
          conflictReason: 'version mismatch: client 3, server 5',
          replayed: false,
          sessionId: null,
        },
      ],
    })
    await getSyncEngine().syncNow()
    expect((await store.getOperation(conflictUpdate.operationId))?.status).toBe('conflict')
  })

  it('pull hydrates referral and conflicted dirty may be replaced by server', async () => {
    const id = createUuid()
    const childId = createUuid()
    const now = new Date().toISOString()
    await store.putReferral({
      id,
      childId,
      centerId: createUuid(),
      sourceType: 'nutrition',
      sourceId: createUuid(),
      referralDate: '2026-08-01',
      reason: 'local dirty',
      destination: 'Local',
      status: 'pending',
      recordedById: createUuid(),
      version: 1,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'dirty',
      _updatedAtLocal: now,
    })
    await store.enqueueOperation({
      clientOperationId: createUuid(),
      entityType: 'referral',
      operation: 'update',
      entityId: id,
      version: 1,
      status: 'conflict',
      payload: { status: 'completed' },
    })

    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: { lastModifiedAt: '2026-08-10T12:00:00.000Z', id },
      hasMore: false,
      limit: 500,
      created: emptyBuckets(),
      updated: {
        ...emptyBuckets(),
        referral: [
          {
            id,
            childId,
            centerId: createUuid(),
            sourceType: 'nutrition',
            sourceId: createUuid(),
            referralDate: '2026-08-01',
            reason: 'server wins',
            destination: 'Server',
            status: 'cancelled',
            version: 5,
            deletedAt: null,
            lastModifiedAt: '2026-08-10T12:00:00.000Z',
            recordedById: createUuid(),
          },
        ],
      },
      deleted: emptyBuckets(),
    })

    await pullOnce(store)
    const row = await store.getReferral(id)
    expect(row?.reason).toBe('server wins')
    expect(row?.status).toBe('cancelled')
    expect(row?.version).toBe(5)
    expect(row?._localStatus).toBe('clean')
  })

  it('pending mutation survives store rebind (browser restart) and JWT clear', async () => {
    const dbName = `ecd-test-ref-survive-${createUuid()}`
    const db = resetOfflineDbForTests(dbName)
    store = resetLocalStoreForTests(db)

    const created = await createReferralLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      assessmentId: createUuid(),
      sourceType: 'nutrition',
      date: '2026-08-10',
      reason: 'MUAC',
      destination: 'Ikigo',
      recordedById: createUuid(),
    })
    await store.markReferralClean(created.referral.id, 1)
    await store.updateOperation(created.operationId, { status: 'applied' })
    const updated = await patchReferralLocalFirst(store, created.referral.id, {
      notes: 'follow-up note',
      implementedAt: '2026-08-12',
    })

    tokenStorage.clearAll()
    const reopened = resetLocalStoreForTests(db)
    expect(await reopened.getReferral(created.referral.id)).toBeTruthy()
    expect((await reopened.getOperation(updated.operationId))?.status).toBe('pending')
    expect((await reopened.getReferral(created.referral.id))?.notes).toBe('follow-up note')
  })

  it('Nutrition/STED dependency stays blocked until source applied; source failure keeps blocked', async () => {
    const screening = await createScreeningLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      date: '2026-08-10',
      weightKg: 8,
      muacCm: 11.0,
      recordedById: createUuid(),
    })
    await refreshBlockedOperations(store)
    expect((await store.getOperation(screening.referralOperationId!))?.status).toBe('blocked')
    expect((await selectPushBatch(store)).map((o) => o.clientOperationId)).toEqual([
      screening.screeningOperationId,
    ])

    await store.updateOperation(screening.screeningOperationId, {
      status: 'failed',
      lastError: 'network',
    })
    await refreshBlockedOperations(store)
    expect((await store.getOperation(screening.referralOperationId!))?.status).toBe('blocked')

    await store.updateOperation(screening.screeningOperationId, { status: 'applied' })
    await refreshBlockedOperations(store)
    expect((await store.getOperation(screening.referralOperationId!))?.status).toBe('pending')

    const sted = await createStedLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      assessmentDate: '2026-08-10',
      ageBand: '1_3',
      consentObtained: true,
      physical: { ...emptyPhysicalCheck(), neck: 'problem' },
      noProblem: false,
      milestones: {
        pickStandStep: 'yego',
        chooseStack: 'yego',
        imitatePicture: 'yego',
        scribble: 'yego',
        knowsTools: 'yego',
        understandsCommands: 'yego',
        socialPlay: 'yego',
      },
      outcome: {
        normal: false,
        referred: true,
        counseling: false,
        other: false,
        followUpIn6Months: true,
      },
      assessedById: createUuid(),
    })
    await refreshBlockedOperations(store)
    expect((await store.getOperation(sted.referralOperationId!))?.dependsOn).toEqual([
      sted.stedOperationId,
    ])
    expect((await store.getOperation(sted.referralOperationId!))?.status).toBe('blocked')
  })

  it('MOCK_REFERRALS remains available and local-first never uses it', async () => {
    expect(MOCK_REFERRALS.length).toBeGreaterThan(0)
    const result = await createReferralLocalFirst(store, {
      childId: createUuid(),
      centerId: createUuid(),
      assessmentId: createUuid(),
      sourceType: 'nutrition',
      date: '2026-08-10',
      reason: 'x',
      destination: 'y',
      recordedById: createUuid(),
    })
    expect(MOCK_REFERRALS.some((r) => r.id === result.referral.id)).toBe(false)
  })

  it('pull batch limit ≤500', async () => {
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
    await pullOnce(store, { limit: 500 })
    expect(vi.mocked(syncControllerPull)).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 500 }),
    )
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
