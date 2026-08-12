import { createUuid } from '@/lib/uuid'
import { isPhysicalClear } from '@/lib/sted-utils'
import {
  shouldCreateStedReferral,
  buildStedReferralInput,
} from '@/features/referrals/utils/triggers'
import type { LocalStore } from '@/storage/local-store'
import type {
  LocalReferralRecord,
  LocalStedAssessmentRecord,
  OutboxStatus,
  SyncOperationRecord,
} from '@/storage/types'
import { buildStedAssessmentSyncPayload } from '@/sync/sted-sync-mapper'
import { buildReferralSyncPayload } from '@/sync/referral-sync-mapper'
import { findUnsyncedChildCreateOp } from '@/sync/child-dependency'
import type { StedAssessmentCreateInput, StedAssessmentViewModel } from '@/models/sted'
import type {
  StedAgeBand,
  StedAnswer,
  StedAssessment,
  StedBodyPartStatus,
  StedOutcome,
  StedPhysicalCheck,
  StedPhysicalPart,
} from '@/types'
import { STED_PHYSICAL_PARTS, emptyPhysicalCheck } from '@/lib/sted-utils'

const ACTIVE_MUTATION_STATUSES: OutboxStatus[] = ['pending', 'blocked', 'syncing']

const AGE_BANDS: StedAgeBand[] = ['1_3', '4_6']
const BODY_STATUSES: StedBodyPartStatus[] = ['normal', 'problem']
const ANSWERS: StedAnswer[] = ['yego', 'oya']

export interface StedCreateLocalResult {
  assessment: StedAssessmentViewModel
  record: LocalStedAssessmentRecord
  stedOperationId: string
  referral?: LocalReferralRecord
  referralOperationId?: string
  /** True when the write is durable locally and may still be pending sync. */
  savedOnDevice: boolean
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function mapAgeBand(value: string): StedAgeBand {
  return AGE_BANDS.includes(value as StedAgeBand) ? (value as StedAgeBand) : '1_3'
}

function mapBodyStatus(value: unknown): StedBodyPartStatus {
  if (typeof value === 'string' && BODY_STATUSES.includes(value as StedBodyPartStatus)) {
    return value as StedBodyPartStatus
  }
  return 'normal'
}

function mapPhysical(raw: Record<string, unknown>): StedPhysicalCheck {
  const physical = emptyPhysicalCheck()
  for (const part of STED_PHYSICAL_PARTS) {
    if (part in raw) {
      physical[part as StedPhysicalPart] = mapBodyStatus(raw[part])
    }
  }
  return physical
}

function mapMilestones(raw: Record<string, unknown>): Record<string, StedAnswer> {
  const milestones: Record<string, StedAnswer> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && ANSWERS.includes(value as StedAnswer)) {
      milestones[key] = value as StedAnswer
    }
  }
  return milestones
}

function mapOutcome(
  raw: Record<string, unknown>,
  followUpIn6Months: boolean,
  followUpDueDate: string | null | undefined,
): StedOutcome {
  const nestedDue =
    typeof raw.followUpDueDate === 'string' ? raw.followUpDueDate : undefined
  const due = followUpDueDate ?? nestedDue
  return {
    normal: Boolean(raw.normal),
    referred: Boolean(raw.referred),
    counseling: Boolean(raw.counseling),
    other: Boolean(raw.other),
    otherText: typeof raw.otherText === 'string' ? raw.otherText : undefined,
    followUpIn6Months:
      typeof raw.followUpIn6Months === 'boolean'
        ? raw.followUpIn6Months
        : followUpIn6Months,
    followUpDueDate: due ?? undefined,
  }
}

export function localStedToViewModel(
  row: LocalStedAssessmentRecord,
  uiExtras?: {
    assessedBy?: string
    referralReason?: string
    referralDestination?: string
  },
): StedAssessmentViewModel {
  const physical = mapPhysical(asRecord(row.physicalAssessment))
  const milestones = mapMilestones(asRecord(row.milestoneResults))
  const outcome = mapOutcome(
    asRecord(row.outcome),
    row.followUpIn6Months,
    row.followUpDueDate,
  )

  return {
    id: row.id,
    childId: row.childId,
    centerId: row.centerId,
    assessmentDate: row.assessmentDate,
    ageBand: mapAgeBand(row.ageBand),
    consentObtained: row.consentObtained,
    physical,
    noProblem: isPhysicalClear(physical),
    milestones,
    outcome,
    assessedBy: uiExtras?.assessedBy ?? row.assessedById,
    assessedById: row.assessedById,
    notes: row.notes ?? undefined,
    referralReason: uiExtras?.referralReason,
    referralDestination: uiExtras?.referralDestination,
    version: row.version,
  }
}

export async function listStedFromLocal(
  store: LocalStore,
  filter?: {
    centerId?: string
    childId?: string
    startDate?: string
    endDate?: string
  },
): Promise<LocalStedAssessmentRecord[]> {
  return store.listStedAssessments(filter)
}

async function findActiveReferralForSource(
  store: LocalStore,
  sourceId: string,
): Promise<SyncOperationRecord | null> {
  const ops = await store.listOperations({ status: ACTIVE_MUTATION_STATUSES })
  return (
    ops.find(
      (op) =>
        op.entityType === 'referral' &&
        op.operation === 'create' &&
        op.payload?.sourceId === sourceId,
    ) ?? null
  )
}

/**
 * Append-only local-first STED create.
 *
 * IMPORTANT: Backend sted_assessment is append-only.
 * There is no UPDATE path — a correction/reassessment must call this again
 * (new UUID) rather than mutating a prior assessment id.
 *
 * When outcome.referred, the referral is created in the SAME LocalStore
 * transaction with dependsOn = [stedClientOperationId].
 */
export async function createStedLocalFirst(
  store: LocalStore,
  input: StedAssessmentCreateInput & { assessedById: string },
): Promise<StedCreateLocalResult> {
  const now = new Date().toISOString()
  const assessmentId = createUuid()
  const stedOpId = createUuid()
  const childDep = await findUnsyncedChildCreateOp(store, input.childId)
  const noProblem = input.noProblem ?? isPhysicalClear(input.physical)

  const physicalAssessment: Record<string, unknown> = { ...input.physical }
  const milestoneResults: Record<string, unknown> = { ...input.milestones }
  const outcomePayload: Record<string, unknown> = {
    normal: input.outcome.normal,
    referred: input.outcome.referred,
    counseling: input.outcome.counseling,
    other: input.outcome.other,
    ...(input.outcome.otherText ? { otherText: input.outcome.otherText } : {}),
    followUpIn6Months: input.outcome.followUpIn6Months,
    ...(input.outcome.followUpDueDate
      ? { followUpDueDate: input.outcome.followUpDueDate }
      : {}),
  }

  const record: LocalStedAssessmentRecord = {
    id: assessmentId,
    childId: input.childId,
    centerId: input.centerId,
    assessmentDate: input.assessmentDate,
    ageBand: input.ageBand,
    consentObtained: input.consentObtained,
    physicalAssessment,
    milestoneResults,
    outcome: outcomePayload,
    followUpIn6Months: input.outcome.followUpIn6Months,
    followUpDueDate: input.outcome.followUpDueDate ?? null,
    notes: input.notes?.trim() ? input.notes.trim() : null,
    assessedById: input.assessedById,
    version: 0,
    deletedAt: null,
    lastModifiedAt: now,
    lastModifiedByDeviceId: input.deviceId ?? null,
    _localStatus: 'dirty',
    _updatedAtLocal: now,
  }

  const assessment = localStedToViewModel(record, {
    assessedBy: input.assessedBy,
    referralReason: input.referralReason,
    referralDestination: input.referralDestination,
  })
  // Preserve client-derived noProblem on the returned view model.
  assessment.noProblem = noProblem

  const createReferral = shouldCreateStedReferral(assessment)

  const existingReferral = createReferral
    ? await store.getReferralBySourceId(assessmentId)
    : null
  const activeReferralOp = createReferral
    ? await findActiveReferralForSource(store, assessmentId)
    : null

  let referral: LocalReferralRecord | undefined
  let referralOpId: string | undefined

  if (createReferral && !existingReferral && !activeReferralOp) {
    const referralInput = buildStedReferralInput(assessment as StedAssessment)
    referralOpId = createUuid()
    referral = {
      id: createUuid(),
      childId: input.childId,
      centerId: input.centerId,
      sourceType: 'sted',
      sourceId: assessmentId,
      referralDate: referralInput.date,
      reason: referralInput.reason,
      destination: referralInput.destination,
      status: 'pending',
      notes: null,
      implementedAt: null,
      recordedById: input.assessedById,
      version: 0,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'dirty',
      _updatedAtLocal: now,
    }
  } else if (existingReferral) {
    referral = existingReferral
  }

  const tables: Array<'sted_assessments' | 'referrals' | 'sync_operations'> = referral
    ? ['sted_assessments', 'referrals', 'sync_operations']
    : ['sted_assessments', 'sync_operations']

  await store.runTransaction(tables, 'rw', async (tx) => {
    await tx.putStedAssessment(record)
    await tx.enqueueOperation({
      clientOperationId: stedOpId,
      entityType: 'sted_assessment',
      operation: 'create',
      entityId: record.id,
      localId: record.id,
      payload: buildStedAssessmentSyncPayload(record),
      version: 0,
      status: childDep ? 'blocked' : 'pending',
      dependsOn: childDep ? [childDep] : [],
      lastError: childDep ? 'Waiting for dependency operations' : undefined,
    })

    if (referral && referralOpId) {
      await tx.putReferral(referral)
      await tx.enqueueOperation({
        clientOperationId: referralOpId,
        entityType: 'referral',
        operation: 'create',
        entityId: referral.id,
        localId: referral.id,
        payload: buildReferralSyncPayload(referral),
        version: 0,
        status: 'blocked',
        dependsOn: childDep ? [stedOpId, childDep] : [stedOpId],
        lastError: 'Waiting for dependency operations',
      })
    }
  })

  return {
    assessment,
    record,
    stedOperationId: stedOpId,
    referral,
    referralOperationId: referralOpId,
    savedOnDevice: true,
  }
}

/**
 * Append-only "correction" semantics.
 * Creates a NEW assessment (new UUID) — never mutates the prior assessment / outbox UPDATE.
 */
export async function appendStedCorrectionLocalFirst(
  store: LocalStore,
  existingId: string,
  patch: Partial<Omit<StedAssessmentCreateInput, 'childId' | 'centerId'>> & {
    centerId: string
    assessedById: string
  },
): Promise<StedCreateLocalResult> {
  const existing = await store.getStedAssessment(existingId)
  if (!existing) {
    throw new Error(`STED assessment not found: ${existingId}`)
  }

  const base = localStedToViewModel(existing)
  return createStedLocalFirst(store, {
    childId: existing.childId,
    centerId: patch.centerId || existing.centerId,
    assessmentDate: patch.assessmentDate ?? existing.assessmentDate,
    ageBand: patch.ageBand ?? base.ageBand,
    consentObtained: patch.consentObtained ?? existing.consentObtained,
    physical: patch.physical ?? base.physical,
    noProblem: patch.noProblem ?? isPhysicalClear(patch.physical ?? base.physical),
    milestones: patch.milestones ?? base.milestones,
    outcome: patch.outcome ?? base.outcome,
    assessedBy: patch.assessedBy,
    notes: patch.notes !== undefined ? patch.notes : existing.notes ?? undefined,
    referralReason: patch.referralReason,
    referralDestination: patch.referralDestination,
    deviceId: patch.deviceId ?? existing.lastModifiedByDeviceId ?? undefined,
    assessedById: patch.assessedById,
  })
}
