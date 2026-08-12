import type { LocalNutritionScreeningRecord } from '@/storage/types'

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

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

function asOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const n = asNumber(value, NaN)
  return Number.isFinite(n) ? n : null
}

function asOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return asString(value)
}

/** Map sync pull ChildNutritionScreening snapshot → LocalNutritionScreeningRecord. */
export function mapPullNutritionScreeningToLocal(
  row: Record<string, unknown>,
  existing?: LocalNutritionScreeningRecord | null,
): LocalNutritionScreeningRecord {
  const now = new Date().toISOString()
  const deletedAt =
    row.deletedAt == null || row.deletedAt === '' ? null : asString(row.deletedAt)

  const heightCm = asOptionalNumber(row.heightCm)
  const headCircumferenceCm = asOptionalNumber(row.headCircumferenceCm)
  const mealQuality = asOptionalString(row.mealQuality)
  const dietNotes = asOptionalString(row.dietNotes)

  return {
    id: asString(row.id, existing?.id ?? ''),
    childId: asString(row.childId, existing?.childId ?? ''),
    centerId: asString(row.centerId, existing?.centerId ?? ''),
    screeningDate:
      asDateOnly(row.screeningDate ?? row.date) || existing?.screeningDate || '',
    weightKg: asNumber(row.weightKg, existing?.weightKg ?? 0),
    muacCm: asNumber(row.muacCm, existing?.muacCm ?? 0),
    heightCm: heightCm !== undefined ? heightCm : existing?.heightCm ?? null,
    headCircumferenceCm:
      headCircumferenceCm !== undefined
        ? headCircumferenceCm
        : existing?.headCircumferenceCm ?? null,
    nutritionStatus: asString(
      row.nutritionStatus,
      existing?.nutritionStatus ?? 'normal',
    ),
    requiresReferral:
      typeof row.requiresReferral === 'boolean'
        ? row.requiresReferral
        : existing?.requiresReferral ?? false,
    mealQuality: mealQuality !== undefined ? mealQuality : existing?.mealQuality ?? null,
    feedingConcern:
      typeof row.feedingConcern === 'boolean'
        ? row.feedingConcern
        : existing?.feedingConcern ?? false,
    dietNotes: dietNotes !== undefined ? dietNotes : existing?.dietNotes ?? null,
    recordedById: asString(
      row.recordedById ?? row.recordedBy,
      existing?.recordedById ?? '',
    ),
    version:
      typeof row.version === 'number'
        ? row.version
        : Number(row.version) || existing?.version || 1,
    deletedAt,
    lastModifiedAt: asString(row.lastModifiedAt) || existing?.lastModifiedAt || now,
    createdAt: asOptionalString(row.createdAt) ?? existing?.createdAt ?? null,
    _localStatus: 'clean',
    _updatedAtLocal: now,
  }
}

/** Build sync push payload for screening CREATE (append-only — never UPDATE). */
export function buildNutritionScreeningSyncPayload(
  row: LocalNutritionScreeningRecord,
): Record<string, unknown> {
  const nutritionStatus = typeof row.nutritionStatus === 'string'
    ? row.nutritionStatus.trim()
    : ''
  if (!nutritionStatus) {
    throw new Error(
      'nutritionStatus is required before enqueueing a nutrition screening sync operation',
    )
  }
  return {
    childId: row.childId,
    screeningDate: row.screeningDate,
    weightKg: row.weightKg,
    muacCm: row.muacCm,
    nutritionStatus,
    requiresReferral: row.requiresReferral,
    ...(row.heightCm != null && row.heightCm > 0 ? { heightCm: row.heightCm } : {}),
    ...(row.headCircumferenceCm != null && row.headCircumferenceCm > 0
      ? { headCircumferenceCm: row.headCircumferenceCm }
      : {}),
    mealQuality: row.mealQuality ?? null,
    feedingConcern: row.feedingConcern,
    dietNotes: row.dietNotes ?? null,
    recordedBy: row.recordedById,
    recordedById: row.recordedById,
  }
}
