import { createUuid } from '@/lib/uuid'
import { classifyNutrition, requiresReferral } from '@/lib/nutrition'
import type { LocalStore } from '@/storage/local-store'
import type {
  LocalNutritionScreeningRecord,
  LocalReferralRecord,
  OutboxStatus,
  SyncOperationRecord,
} from '@/storage/types'
import { buildNutritionScreeningSyncPayload } from '@/sync/nutrition-sync-mapper'
import { buildReferralSyncPayload } from '@/sync/referral-sync-mapper'
import type { GrowthAssessmentViewModel, GrowthMeasurementViewModel } from '@/models/growth'
import type { NutritionAssessment, NutritionStatus } from '@/types'

const ACTIVE_MUTATION_STATUSES: OutboxStatus[] = ['pending', 'blocked', 'syncing']

export interface ScreeningCreateInput {
  childId: string
  centerId: string
  date: string
  weightKg: number
  heightCm?: number
  muacCm: number
  headCircumferenceCm?: number
  notes?: string
  /** Must be authenticated user UUID for sync apply. */
  recordedById: string
}

export interface ScreeningCreateLocalResult {
  measurement: GrowthMeasurementViewModel
  assessment: GrowthAssessmentViewModel
  screening: LocalNutritionScreeningRecord
  screeningOperationId: string
  referral?: LocalReferralRecord
  referralOperationId?: string
  /** True when the write is durable locally and may still be pending sync. */
  savedOnDevice: boolean
}

function mapStatus(value: string): NutritionStatus {
  if (
    value === 'normal' ||
    value === 'at_risk' ||
    value === 'moderate' ||
    value === 'severe'
  ) {
    return value
  }
  return 'normal'
}

export function localScreeningToMeasurement(
  row: LocalNutritionScreeningRecord,
): GrowthMeasurementViewModel {
  const nutritionStatus = mapStatus(row.nutritionStatus)
  return {
    id: row.id,
    childId: row.childId,
    date: row.screeningDate,
    weightKg: row.weightKg,
    heightCm: row.heightCm ?? 0,
    muacCm: row.muacCm,
    headCircumferenceCm: row.headCircumferenceCm ?? undefined,
    notes: row.dietNotes ?? undefined,
    recordedBy: row.recordedById,
    version: row.version,
    nutritionStatus,
    requiresReferral: row.requiresReferral,
    recordedById: row.recordedById,
  }
}

export function localScreeningToAssessment(
  row: LocalNutritionScreeningRecord,
): GrowthAssessmentViewModel {
  return {
    id: row.id,
    childId: row.childId,
    measurementId: row.id,
    date: row.screeningDate,
    status: mapStatus(row.nutritionStatus),
    requiresReferral: row.requiresReferral,
    notes: row.dietNotes ?? undefined,
    version: row.version,
  }
}

export async function listScreeningsFromLocal(
  store: LocalStore,
  filter?: {
    centerId?: string
    childId?: string
    startDate?: string
    endDate?: string
  },
): Promise<LocalNutritionScreeningRecord[]> {
  return store.listNutritionScreenings(filter)
}

async function findActiveScreeningCreate(
  store: LocalStore,
  entityId: string,
): Promise<SyncOperationRecord | null> {
  const ops = await store.listOperations({ status: ACTIVE_MUTATION_STATUSES })
  return (
    ops.find(
      (op) =>
        op.entityType === 'child_nutrition_screening' &&
        op.entityId === entityId &&
        op.operation === 'create',
    ) ?? null
  )
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

function shouldEnqueueReferral(assessment: NutritionAssessment | GrowthAssessmentViewModel): boolean {
  return requiresReferral(assessment.status) || assessment.requiresReferral
}

/**
 * Append-only local-first screening create.
 *
 * IMPORTANT: Backend child_nutrition_screening is append-only.
 * There is no UPDATE path — "edit measurement" in the UI must call this again
 * (new UUID) rather than mutating a prior screening id.
 *
 * When MUAC/status requires a referral, the referral is created in the SAME
 * LocalStore transaction with dependsOn = [screeningClientOperationId].
 */
export async function createScreeningLocalFirst(
  store: LocalStore,
  input: ScreeningCreateInput,
): Promise<ScreeningCreateLocalResult> {
  const now = new Date().toISOString()
  const screeningId = createUuid()
  const screeningOpId = createUuid()

  const nutritionStatus = classifyNutrition({
    muacCm: input.muacCm,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
  })
  const needsReferral = requiresReferral(nutritionStatus)

  const screening: LocalNutritionScreeningRecord = {
    id: screeningId,
    childId: input.childId,
    centerId: input.centerId,
    screeningDate: input.date,
    weightKg: input.weightKg,
    muacCm: input.muacCm,
    heightCm: input.heightCm != null && input.heightCm > 0 ? input.heightCm : null,
    headCircumferenceCm:
      input.headCircumferenceCm != null && input.headCircumferenceCm > 0
        ? input.headCircumferenceCm
        : null,
    nutritionStatus,
    requiresReferral: needsReferral,
    mealQuality: null,
    feedingConcern: false,
    dietNotes: input.notes?.trim() ? input.notes.trim() : null,
    recordedById: input.recordedById,
    version: 0,
    deletedAt: null,
    lastModifiedAt: now,
    createdAt: now,
    _localStatus: 'dirty',
    _updatedAtLocal: now,
  }

  const assessment = localScreeningToAssessment(screening)
  const createReferral = shouldEnqueueReferral(assessment)

  // Duplicate prevention: never create a second local referral for the same screening.
  const existingReferral = createReferral
    ? await store.getReferralBySourceId(screeningId)
    : null
  const activeReferralOp = createReferral
    ? await findActiveReferralForSource(store, screeningId)
    : null

  let referral: LocalReferralRecord | undefined
  let referralOpId: string | undefined

  if (createReferral && !existingReferral && !activeReferralOp) {
    referralOpId = createUuid()
    referral = {
      id: createUuid(),
      childId: input.childId,
      centerId: input.centerId,
      sourceType: 'nutrition',
      sourceId: screeningId,
      referralDate: input.date,
      reason: `MUAC — ${nutritionStatus}`,
      destination: 'Ikigo nderabuzima',
      status: 'pending',
      notes: null,
      implementedAt: null,
      recordedById: input.recordedById,
      version: 0,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'dirty',
      _updatedAtLocal: now,
    }
  } else if (existingReferral) {
    referral = existingReferral
  }

  const tables: Array<
    'nutrition_screenings' | 'referrals' | 'sync_operations'
  > = referral
    ? ['nutrition_screenings', 'referrals', 'sync_operations']
    : ['nutrition_screenings', 'sync_operations']

  await store.runTransaction(tables, 'rw', async (tx) => {
    await tx.putNutritionScreening(screening)
    await tx.enqueueOperation({
      clientOperationId: screeningOpId,
      entityType: 'child_nutrition_screening',
      operation: 'create',
      entityId: screening.id,
      localId: screening.id,
      payload: buildNutritionScreeningSyncPayload(screening),
      version: 0,
      status: 'pending',
      lastError: undefined,
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
        dependsOn: [screeningOpId],
        lastError: 'Waiting for dependency operations',
      })
    }
  })

  // Idempotent re-entry guard: if somehow called twice for same id, coalesce.
  const active = await findActiveScreeningCreate(store, screeningId)
  if (active && active.clientOperationId !== screeningOpId) {
    // Should not happen for append-only creates with fresh UUIDs.
  }

  return {
    measurement: localScreeningToMeasurement(screening),
    assessment,
    screening,
    screeningOperationId: screeningOpId,
    referral,
    referralOperationId: referralOpId,
    savedOnDevice: true,
  }
}

/**
 * Append-only "update" semantics for Growth UI edit flows.
 * Creates a NEW screening (new UUID) — never mutates the prior screening id / outbox UPDATE.
 */
export async function appendScreeningCorrectionLocalFirst(
  store: LocalStore,
  existingId: string,
  patch: Partial<Omit<ScreeningCreateInput, 'childId' | 'centerId' | 'recordedById'>> & {
    centerId: string
    recordedById: string
  },
): Promise<ScreeningCreateLocalResult> {
  const existing = await store.getNutritionScreening(existingId)
  if (!existing) {
    throw new Error(`Growth measurement not found: ${existingId}`)
  }

  return createScreeningLocalFirst(store, {
    childId: existing.childId,
    centerId: patch.centerId || existing.centerId,
    date: patch.date ?? existing.screeningDate,
    weightKg: patch.weightKg ?? existing.weightKg,
    heightCm: patch.heightCm ?? existing.heightCm ?? undefined,
    muacCm: patch.muacCm ?? existing.muacCm,
    headCircumferenceCm:
      patch.headCircumferenceCm ?? existing.headCircumferenceCm ?? undefined,
    notes: patch.notes !== undefined ? patch.notes : existing.dietNotes ?? undefined,
    recordedById: patch.recordedById,
  })
}
