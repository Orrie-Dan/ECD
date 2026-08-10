import type {
  ApiStedAgeBand,
  CreateStedAssessmentDto,
  StedAssessmentResponseDto,
  StedHistoryResponseDto,
} from '@/api/generated/models'
import type {
  StedAssessmentCreateInput,
  StedAssessmentViewModel,
  StedHistoryResult,
} from '@/models/sted'
import type {
  StedAgeBand,
  StedAnswer,
  StedAssessment,
  StedBodyPartStatus,
  StedOutcome,
  StedPhysicalCheck,
  StedPhysicalPart,
} from '@/types'
import { STED_PHYSICAL_PARTS, emptyPhysicalCheck, isPhysicalClear } from '@/lib/sted-utils'

const AGE_BANDS: StedAgeBand[] = ['1_3', '4_6']
const BODY_STATUSES: StedBodyPartStatus[] = ['normal', 'problem']
const ANSWERS: StedAnswer[] = ['yego', 'oya']

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function mapAgeBand(value: ApiStedAgeBand | string | null | undefined): StedAgeBand {
  if (value && AGE_BANDS.includes(value as StedAgeBand)) {
    return value as StedAgeBand
  }
  return '1_3'
}

function mapBodyStatus(value: unknown): StedBodyPartStatus {
  if (typeof value === 'string' && BODY_STATUSES.includes(value as StedBodyPartStatus)) {
    return value as StedBodyPartStatus
  }
  return 'normal'
}

function mapPhysicalFromDto(raw: unknown): StedPhysicalCheck {
  const record = asRecord(raw)
  const physical = emptyPhysicalCheck()
  for (const part of STED_PHYSICAL_PARTS) {
    if (part in record) {
      physical[part] = mapBodyStatus(record[part])
    }
  }
  return physical
}

function mapMilestonesFromDto(raw: unknown): Record<string, StedAnswer> {
  const record = asRecord(raw)
  const milestones: Record<string, StedAnswer> = {}
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && ANSWERS.includes(value as StedAnswer)) {
      milestones[key] = value as StedAnswer
    }
  }
  return milestones
}

function mapOutcomeFromDto(
  raw: unknown,
  followUpIn6Months: boolean,
  followUpDueDate: string | null | undefined,
): StedOutcome {
  const record = asRecord(raw)
  const nestedDue =
    typeof record.followUpDueDate === 'string' ? record.followUpDueDate : undefined
  const due = followUpDueDate ?? nestedDue

  return {
    normal: Boolean(record.normal),
    referred: Boolean(record.referred),
    counseling: Boolean(record.counseling),
    other: Boolean(record.other),
    otherText: typeof record.otherText === 'string' ? record.otherText : undefined,
    // Prefer authoritative top-level follow-up fields from the API.
    followUpIn6Months:
      typeof record.followUpIn6Months === 'boolean'
        ? record.followUpIn6Months
        : followUpIn6Months,
    followUpDueDate: due ?? undefined,
  }
}

/** Map STED response DTO → view model (rename nested JSON fields to UI shape). */
export function mapStedDtoToViewModel(dto: StedAssessmentResponseDto): StedAssessmentViewModel {
  const physical = mapPhysicalFromDto(dto.physicalAssessment)
  const milestones = mapMilestonesFromDto(dto.milestoneResults)
  const outcome = mapOutcomeFromDto(dto.outcome, dto.followUpIn6Months, dto.followUpDueDate)

  return {
    id: dto.id,
    childId: dto.childId,
    centerId: dto.centerId,
    assessmentDate: dto.assessmentDate,
    ageBand: mapAgeBand(dto.ageBand),
    consentObtained: dto.consentObtained,
    physical,
    noProblem: isPhysicalClear(physical),
    milestones,
    outcome,
    assessedBy: dto.assessedBy,
    assessedById: dto.assessedBy,
    notes: dto.notes ?? undefined,
    version: dto.version,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function mapStedHistoryToViewModel(dto: StedHistoryResponseDto): StedHistoryResult {
  return {
    childId: dto.childId,
    items: dto.items.map(mapStedDtoToViewModel),
    total: dto.total,
    page: dto.page ?? 1,
    pageSize: dto.pageSize ?? dto.items.length,
    totalPages: dto.totalPages ?? 1,
  }
}

/**
 * Build create DTO from UI assessment.
 * - `physical` → `physicalAssessment`
 * - `milestones` → `milestoneResults`
 * - Flattens follow-up from nested outcome onto top-level API fields
 * - Does NOT send referralReason / referralDestination (referrals domain)
 */
export function mapStedCreateToDto(input: StedAssessmentCreateInput): CreateStedAssessmentDto {
  const physicalPayload: Record<string, StedBodyPartStatus> = { ...input.physical }
  const milestonePayload: Record<string, StedAnswer> = { ...input.milestones }

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

  return {
    childId: input.childId,
    centerId: input.centerId,
    assessmentDate: input.assessmentDate,
    ageBand: input.ageBand as ApiStedAgeBand,
    consentObtained: input.consentObtained,
    physicalAssessment: physicalPayload,
    milestoneResults: milestonePayload,
    outcome: outcomePayload,
    followUpIn6Months: input.outcome.followUpIn6Months,
    ...(input.outcome.followUpDueDate
      ? { followUpDueDate: input.outcome.followUpDueDate }
      : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    ...(input.deviceId ? { deviceId: input.deviceId } : {}),
  }
}

/**
 * Preserve UI-only fields (display assessedBy name, referral seed text)
 * after a LIVE create without changing the backend contract.
 */
export function mergeUiFieldsOntoSted(
  apiRecord: StedAssessmentViewModel,
  input: StedAssessmentCreateInput,
): StedAssessmentViewModel {
  return {
    ...apiRecord,
    assessedBy: input.assessedBy ?? apiRecord.assessedBy,
    referralReason: input.referralReason,
    referralDestination: input.referralDestination,
    noProblem: input.noProblem ?? apiRecord.noProblem,
  }
}

export function asStedAssessmentViewModel(record: StedAssessment): StedAssessmentViewModel {
  const version =
    'version' in record && typeof (record as StedAssessmentViewModel).version === 'number'
      ? (record as StedAssessmentViewModel).version
      : 0
  return { ...record, version }
}

/** Re-export physical part list for mapper consumers. */
export type { StedPhysicalPart }
