import type { LocalStedAssessmentRecord } from '@/storage/types'

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function asDateOnly(value: unknown): string {
  const raw = asString(value)
  return raw.length >= 10 ? raw.slice(0, 10) : raw
}

function asOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return asString(value)
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

/** Map sync pull StedAssessment snapshot → LocalStedAssessmentRecord. */
export function mapPullStedAssessmentToLocal(
  row: Record<string, unknown>,
  existing?: LocalStedAssessmentRecord | null,
): LocalStedAssessmentRecord {
  const now = new Date().toISOString()
  const deletedAt =
    row.deletedAt == null || row.deletedAt === '' ? null : asString(row.deletedAt)
  const notes = asOptionalString(row.notes)
  const followUpDueDate = asOptionalString(row.followUpDueDate)
  const lastModifiedByDeviceId = asOptionalString(
    row.lastModifiedByDeviceId ?? row.deviceId,
  )

  const physicalAssessment =
    row.physicalAssessment != null
      ? asRecord(row.physicalAssessment)
      : existing?.physicalAssessment ?? {}
  const milestoneResults =
    row.milestoneResults != null
      ? asRecord(row.milestoneResults)
      : existing?.milestoneResults ?? {}
  const outcome = row.outcome != null ? asRecord(row.outcome) : existing?.outcome ?? {}

  return {
    id: asString(row.id, existing?.id ?? ''),
    childId: asString(row.childId, existing?.childId ?? ''),
    centerId: asString(row.centerId, existing?.centerId ?? ''),
    assessmentDate:
      asDateOnly(row.assessmentDate) || existing?.assessmentDate || '',
    ageBand: asString(row.ageBand, existing?.ageBand ?? '1_3'),
    consentObtained:
      typeof row.consentObtained === 'boolean'
        ? row.consentObtained
        : existing?.consentObtained ?? false,
    physicalAssessment,
    milestoneResults,
    outcome,
    followUpIn6Months:
      typeof row.followUpIn6Months === 'boolean'
        ? row.followUpIn6Months
        : typeof outcome.followUpIn6Months === 'boolean'
          ? outcome.followUpIn6Months
          : existing?.followUpIn6Months ?? false,
    followUpDueDate:
      followUpDueDate !== undefined
        ? followUpDueDate
        : existing?.followUpDueDate ?? null,
    notes: notes !== undefined ? notes : existing?.notes ?? null,
    assessedById: asString(
      row.assessedById ?? row.assessedBy ?? row.recordedById,
      existing?.assessedById ?? '',
    ),
    version:
      typeof row.version === 'number'
        ? row.version
        : Number(row.version) || existing?.version || 1,
    deletedAt,
    lastModifiedAt: asString(row.lastModifiedAt) || existing?.lastModifiedAt || now,
    lastModifiedByDeviceId:
      lastModifiedByDeviceId !== undefined
        ? lastModifiedByDeviceId
        : existing?.lastModifiedByDeviceId ?? null,
    _localStatus: 'clean',
    _updatedAtLocal: now,
  }
}

/** Build sync push payload for STED CREATE (append-only — never UPDATE). */
export function buildStedAssessmentSyncPayload(
  row: LocalStedAssessmentRecord,
): Record<string, unknown> {
  return {
    childId: row.childId,
    centerId: row.centerId,
    assessmentDate: row.assessmentDate,
    ageBand: row.ageBand,
    consentObtained: row.consentObtained,
    physicalAssessment: row.physicalAssessment,
    milestoneResults: row.milestoneResults,
    outcome: row.outcome,
    followUpIn6Months: row.followUpIn6Months,
    ...(row.followUpDueDate ? { followUpDueDate: row.followUpDueDate } : {}),
    notes: row.notes ?? null,
    assessedById: row.assessedById,
    assessedBy: row.assessedById,
    recordedById: row.assessedById,
    ...(row.lastModifiedByDeviceId
      ? { deviceId: row.lastModifiedByDeviceId }
      : {}),
  }
}
