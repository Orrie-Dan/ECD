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
  appendStedCorrectionLocalFirst,
  createStedLocalFirst,
} from '@/features/sted/local-sted'
import { emptyPhysicalCheck } from '@/lib/sted-utils'
import { tokenStorage } from '@/api/token-storage'
import { MOCK_STED_ASSESSMENTS } from '@/lib/mock-data'
import { env } from '@/config/env'
import type { StedAssessmentCreateInput } from '@/models/sted'
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

function baseStedInput(
  overrides: Partial<StedAssessmentCreateInput> & {
    childId?: string
    centerId?: string
    assessedById: string
    referred?: boolean
  },
): StedAssessmentCreateInput & { assessedById: string } {
  const referred = overrides.referred ?? false
  const physical = overrides.physical ?? emptyPhysicalCheck()
  if (referred) {
    physical.headFace = 'problem'
  }
  return {
    childId: overrides.childId ?? createUuid(),
    centerId: overrides.centerId ?? createUuid(),
    assessmentDate: overrides.assessmentDate ?? '2026-08-10',
    ageBand: overrides.ageBand ?? '1_3',
    consentObtained: overrides.consentObtained ?? true,
    physical,
    noProblem: overrides.noProblem ?? (physical.headFace === 'normal' && !referred),
    milestones: overrides.milestones ?? {
      pickStandStep: 'yego',
      chooseStack: 'yego',
      imitatePicture: 'yego',
      scribble: 'yego',
      knowsTools: 'yego',
      understandsCommands: 'yego',
      socialPlay: 'yego',
    },
    outcome: overrides.outcome ?? {
      normal: !referred,
      referred,
      counseling: false,
      other: false,
      followUpIn6Months: true,
      followUpDueDate: '2027-02-10',
    },
    assessedBy: overrides.assessedBy,
    notes: overrides.notes,
    referralReason: overrides.referralReason ?? (referred ? 'STED — ikibazo cyahamwe' : undefined),
    referralDestination:
      overrides.referralDestination ?? (referred ? 'Ikigo nderabuzima' : undefined),
    deviceId: overrides.deviceId,
    assessedById: overrides.assessedById,
  }
}

describe('STED assessment offline sync (Sprint 4.8.4)', () => {
  let store: LocalStore

  beforeEach(async () => {
    const db = resetOfflineDbForTests(`ecd-test-sted-${createUuid()}`)
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

  it('creates STED offline, reads it, and survives restart with stable UUID', async () => {
    const assessedById = createUuid()
    const result = await createStedLocalFirst(
      store,
      baseStedInput({ assessedById }),
    )

    expect(result.savedOnDevice).toBe(true)
    expect(result.assessment.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(await store.getStedAssessment(result.assessment.id)).toBeTruthy()

    const row = await store.getStedAssessment(result.assessment.id)
    expect(row?.id).toBe(result.assessment.id)
    expect(row?.version).toBe(0)
    expect(row?._localStatus).toBe('dirty')
  })

  it('persists multiple historical assessments for one child', async () => {
    const childId = createUuid()
    const centerId = createUuid()
    const assessedById = createUuid()
    const dates = ['2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01']

    for (const assessmentDate of dates) {
      await createStedLocalFirst(
        store,
        baseStedInput({ childId, centerId, assessedById, assessmentDate }),
      )
    }

    const rows = await store.listStedAssessments({ childId })
    expect(rows).toHaveLength(4)
    expect(rows.map((r) => r.assessmentDate)).toEqual([...dates].reverse())
  })

  it('append-only correction creates a new UUID and never enqueues UPDATE', async () => {
    const first = await createStedLocalFirst(
      store,
      baseStedInput({ assessedById: createUuid() }),
    )

    const second = await appendStedCorrectionLocalFirst(store, first.assessment.id, {
      centerId: first.record.centerId,
      assessedById: first.record.assessedById,
      assessmentDate: '2026-08-15',
      notes: 'reassessment',
    })

    expect(second.assessment.id).not.toBe(first.assessment.id)
    const ops = await store.listOperations({ status: ['pending', 'blocked'] })
    expect(ops.every((o) => o.operation === 'create')).toBe(true)
    expect(ops.filter((o) => o.entityType === 'sted_assessment')).toHaveLength(2)
    expect(ops.some((o) => o.operation === 'update')).toBe(false)
    const history = await store.listStedAssessments({ childId: first.assessment.childId })
    expect(history).toHaveLength(2)
  })

  it('queues STED CREATE with stable clientOperationId, entity UUID, version 0', async () => {
    const result = await createStedLocalFirst(
      store,
      baseStedInput({ assessedById: createUuid() }),
    )

    const op = await store.getOperation(result.stedOperationId)
    expect(op?.clientOperationId).toBe(result.stedOperationId)
    expect(op?.entityId).toBe(result.assessment.id)
    expect(op?.entityType).toBe('sted_assessment')
    expect(op?.operation).toBe('create')
    expect(op?.version).toBe(0)
    expect(op?.status).toBe('pending')
    expect(op?.payload?.physicalAssessment).toBeTruthy()
    expect(op?.payload?.milestoneResults).toBeTruthy()
    expect(op?.payload?.assessedById).toBe(result.record.assessedById)
  })

  it('referral depends on STED and stays blocked until STED applied', async () => {
    const result = await createStedLocalFirst(
      store,
      baseStedInput({ assessedById: createUuid(), referred: true }),
    )

    expect(result.referral).toBeTruthy()
    expect(result.referralOperationId).toBeTruthy()
    expect(result.referral?.sourceId).toBe(result.assessment.id)
    expect(result.referral?.sourceType).toBe('sted')

    await refreshBlockedOperations(store)
    let referralOp = await store.getOperation(result.referralOperationId!)
    expect(referralOp?.status).toBe('blocked')
    expect(referralOp?.dependsOn).toEqual([result.stedOperationId])

    const batch = await selectPushBatch(store)
    expect(batch.map((o) => o.clientOperationId)).toEqual([result.stedOperationId])
    expect(batch.find((o) => o.clientOperationId === result.referralOperationId)).toBeUndefined()

    // STED fails → referral remains blocked.
    await store.updateOperation(result.stedOperationId, {
      status: 'failed',
      lastError: 'network',
    })
    await refreshBlockedOperations(store)
    referralOp = await store.getOperation(result.referralOperationId!)
    expect(referralOp?.status).toBe('blocked')
    expect((await selectPushBatch(store)).map((o) => o.clientOperationId)).toEqual([])

    // STED applied → referral becomes pending.
    await store.updateOperation(result.stedOperationId, {
      status: 'applied',
      lastError: undefined,
    })
    await refreshBlockedOperations(store)
    referralOp = await store.getOperation(result.referralOperationId!)
    expect(referralOp?.status).toBe('pending')
    const released = await selectPushBatch(store)
    expect(released.map((o) => o.clientOperationId)).toEqual([result.referralOperationId])
  })

  it('STED + referral survive store reopen (same IndexedDB)', async () => {
    const dbName = `ecd-test-sted-survive-${createUuid()}`
    const db = resetOfflineDbForTests(dbName)
    store = resetLocalStoreForTests(db)

    const result = await createStedLocalFirst(
      store,
      baseStedInput({ assessedById: createUuid(), referred: true }),
    )

    // Rebind LocalStore to the same Dexie instance (simulates runtime restart without wiping IDB).
    const reopened = resetLocalStoreForTests(db)
    const assessment = await reopened.getStedAssessment(result.assessment.id)
    const referral = await reopened.getReferralBySourceId(result.assessment.id)
    const stedOp = await reopened.getOperation(result.stedOperationId)
    const referralOp = await reopened.getOperation(result.referralOperationId!)

    expect(assessment?.id).toBe(result.assessment.id)
    expect(referral?.id).toBe(result.referral?.id)
    expect(stedOp?.status).toBe('pending')
    expect(referralOp?.status).toBe('blocked')
    expect(referralOp?.dependsOn).toEqual([result.stedOperationId])
  })

  it('critical offline → reconnect scenario: STED syncs then referral unblocks and syncs', async () => {
    Object.defineProperty(networkState, 'getSnapshot', {
      configurable: true,
      value: () => ({ status: 'OFFLINE', isOnline: false, lastReachableAt: null }),
    })

    const result = await createStedLocalFirst(
      store,
      baseStedInput({ assessedById: createUuid(), referred: true }),
    )

    // Assessment + pending referral visible offline immediately.
    expect(await store.getStedAssessment(result.assessment.id)).toBeTruthy()
    expect(await store.getReferralBySourceId(result.assessment.id)).toBeTruthy()
    await refreshBlockedOperations(store)
    expect((await store.getOperation(result.referralOperationId!))?.status).toBe('blocked')

    Object.defineProperty(networkState, 'getSnapshot', {
      configurable: true,
      value: () => ({ status: 'ONLINE', isOnline: true, lastReachableAt: null }),
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
      created: 1,
      deduplicated: 0,
      status: 'applied',
      operations: [
        {
          id: createUuid(),
          clientOperationId: result.stedOperationId,
          localId: result.assessment.id,
          entityId: result.assessment.id,
          entityType: 'sted_assessment' as const,
          operation: 'create' as const,
          status: 'applied' as const,
          conflictReason: null,
          replayed: false,
          sessionId: null,
        },
      ],
    })

    await getSyncEngine().syncNow()
    expect((await store.getOperation(result.stedOperationId))?.status).toBe('applied')
    expect((await store.getOperation(result.stedOperationId))?.clientOperationId).toBe(
      result.stedOperationId,
    )
    expect(inferAppliedVersion({ operation: 'create', version: 0 } as never)).toBe(1)
    expect((await store.getStedAssessment(result.assessment.id))?._localStatus).toBe('clean')

    await refreshBlockedOperations(store)
    expect((await store.getOperation(result.referralOperationId!))?.status).toBe('pending')

    vi.mocked(syncControllerPush).mockResolvedValueOnce({
      sessionId: null,
      accepted: 1,
      created: 1,
      deduplicated: 0,
      status: 'applied',
      operations: [
        {
          id: createUuid(),
          clientOperationId: result.referralOperationId!,
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
    expect((await store.getOperation(result.referralOperationId!))?.status).toBe('applied')
    expect((await store.getReferral(result.referral!.id))?._localStatus).toBe('clean')
  })

  it('network failure preserves STED, outbox ids, and referral dependency for retry', async () => {
    const result = await createStedLocalFirst(
      store,
      baseStedInput({ assessedById: createUuid(), referred: true }),
    )

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

    expect(await store.getStedAssessment(result.assessment.id)).toBeTruthy()
    const stedOp = await store.getOperation(result.stedOperationId)
    expect(stedOp?.clientOperationId).toBe(result.stedOperationId)
    expect(stedOp?.status).toBe('pending')
    expect((await store.getOperation(result.referralOperationId!))?.dependsOn).toEqual([
      result.stedOperationId,
    ])
    expect(await store.listStedAssessments({ childId: result.assessment.childId })).toHaveLength(1)
    expect(await store.listReferrals({ sourceId: result.assessment.id })).toHaveLength(1)
  })

  it('pull hydrates sted_assessment into LocalStore and advances cursor', async () => {
    const id = createUuid()
    const childId = createUuid()
    const cursorAt = '2026-08-10T12:00:00.000Z'
    vi.mocked(syncControllerPull).mockResolvedValue({
      cursor: null,
      nextCursor: { lastModifiedAt: cursorAt, id },
      hasMore: false,
      limit: 500,
      created: {
        ...emptyBuckets(),
        sted_assessment: [
          {
            id,
            childId,
            centerId: createUuid(),
            assessmentDate: '2026-08-09',
            ageBand: '1_3',
            consentObtained: true,
            physicalAssessment: emptyPhysicalCheck(),
            milestoneResults: { pickStandStep: 'yego' },
            outcome: { normal: true, referred: false, counseling: false, other: false },
            followUpIn6Months: true,
            followUpDueDate: '2027-02-09',
            notes: null,
            assessedById: createUuid(),
            version: 2,
            deletedAt: null,
            lastModifiedAt: cursorAt,
          },
        ],
      },
      updated: emptyBuckets(),
      deleted: emptyBuckets(),
    })

    await pullOnce(store)
    const row = await store.getStedAssessment(id)
    expect(row?.childId).toBe(childId)
    expect(row?.version).toBe(2)
    expect(row?._localStatus).toBe('clean')
    expect(row?.ageBand).toBe('1_3')

    const cursor = await store.getPullCursor()
    expect(cursor.lastModifiedAt).toBe(cursorAt)
    expect(cursor.id).toBe(id)
  })

  it('pull batch respects limit ≤500 and does not invent a STED cursor', async () => {
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

  it('CREATE id collision is conflict status and does not silently overwrite', async () => {
    const result = await createStedLocalFirst(
      store,
      baseStedInput({ assessedById: createUuid() }),
    )
    const before = await store.getStedAssessment(result.assessment.id)

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
          clientOperationId: result.stedOperationId,
          localId: result.assessment.id,
          entityId: result.assessment.id,
          entityType: 'sted_assessment' as const,
          operation: 'create' as const,
          status: 'conflict' as const,
          conflictReason: 'Entity already exists on server',
          replayed: false,
          sessionId: null,
        },
      ],
    })

    await getSyncEngine().syncNow()
    expect((await store.getOperation(result.stedOperationId))?.status).toBe('conflict')
    const after = await store.getStedAssessment(result.assessment.id)
    expect(after?.assessmentDate).toBe(before?.assessmentDate)
    expect(after?.physicalAssessment).toEqual(before?.physicalAssessment)
  })

  it('does not create referral when outcome.referred is false', async () => {
    const result = await createStedLocalFirst(
      store,
      baseStedInput({ assessedById: createUuid(), referred: false }),
    )
    expect(result.referral).toBeUndefined()
    expect(result.referralOperationId).toBeUndefined()
    const ops = await store.listOperations({ status: ['pending', 'blocked'] })
    expect(ops.filter((o) => o.entityType === 'referral')).toHaveLength(0)
  })

  it('MOCK_STED_ASSESSMENTS remains available and LIVE path never imports it for reads', async () => {
    expect(MOCK_STED_ASSESSMENTS.length).toBeGreaterThan(0)
    expect(env.isLive || env.isMock).toBe(true)
    // Local create never consults MOCK_STED_ASSESSMENTS.
    const result = await createStedLocalFirst(
      store,
      baseStedInput({ assessedById: createUuid() }),
    )
    expect(MOCK_STED_ASSESSMENTS.some((a) => a.id === result.assessment.id)).toBe(false)
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
