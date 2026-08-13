import type {
  LocalFeedingDayRecord,
  LocalFeedingMonthSummaryRecord,
} from '@/storage/types'

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

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  return fallback
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

/** Map sync pull CenterFeedingDay snapshot → LocalFeedingDayRecord. */
export function mapPullFeedingDayToLocal(
  row: Record<string, unknown>,
  existing?: LocalFeedingDayRecord | null,
): LocalFeedingDayRecord {
  const now = new Date().toISOString()
  const deletedAt =
    row.deletedAt == null || row.deletedAt === '' ? null : asString(row.deletedAt)

  return {
    id: asString(row.id, existing?.id ?? ''),
    centerId: asString(row.centerId, existing?.centerId ?? ''),
    date: asDateOnly(row.recordedDate ?? row.date) || existing?.date || '',
    milkServed: asBool(row.milkServed, existing?.milkServed ?? false),
    porridgeServed: asBool(row.porridgeServed, existing?.porridgeServed ?? false),
    balancedMealServed: asBool(
      row.balancedMealServed,
      existing?.balancedMealServed ?? false,
    ),
    cerealsOrTubers: asBool(row.cerealsOrTubers, existing?.cerealsOrTubers ?? false),
    legumes: asBool(row.legumes, existing?.legumes ?? false),
    dairy: asBool(row.dairy, existing?.dairy ?? false),
    animalProducts: asBool(row.animalProducts, existing?.animalProducts ?? false),
    fruitsVegetables: asBool(row.fruitsVegetables, existing?.fruitsVegetables ?? false),
    addedFat: asBool(row.addedFat, existing?.addedFat ?? false),
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
    _localStatus: 'clean',
    _updatedAtLocal: now,
  }
}

/** Build sync push payload for feeding day create/update. */
export function buildFeedingDaySyncPayload(
  row: LocalFeedingDayRecord,
): Record<string, unknown> {
  const recordedDate = asDateOnly(row.date)
  if (!recordedDate) {
    throw new Error('feeding day requires date before sync')
  }
  const recordedById = asString(row.recordedById).trim()
  if (!recordedById) {
    throw new Error('feeding day requires recordedById before sync')
  }
  return {
    centerId: row.centerId,
    recordedDate,
    date: recordedDate,
    milkServed: row.milkServed,
    porridgeServed: row.porridgeServed,
    balancedMealServed: row.balancedMealServed,
    cerealsOrTubers: row.cerealsOrTubers,
    legumes: row.legumes,
    dairy: row.dairy,
    animalProducts: row.animalProducts,
    fruitsVegetables: row.fruitsVegetables,
    addedFat: row.addedFat,
    recordedBy: recordedById,
    recordedById,
  }
}

/** Map sync pull CenterFeedingMonthSummary snapshot → LocalFeedingMonthSummaryRecord. */
export function mapPullFeedingMonthSummaryToLocal(
  row: Record<string, unknown>,
  existing?: LocalFeedingMonthSummaryRecord | null,
): LocalFeedingMonthSummaryRecord {
  const now = new Date().toISOString()
  const deletedAt =
    row.deletedAt == null || row.deletedAt === '' ? null : asString(row.deletedAt)
  const updatedByRaw = row.updatedById ?? row.recordedById ?? row.recordedBy ?? row.updatedBy
  const updatedById =
    updatedByRaw == null || updatedByRaw === ''
      ? existing?.updatedById ?? null
      : asString(updatedByRaw)

  return {
    id: asString(row.id, existing?.id ?? ''),
    centerId: asString(row.centerId, existing?.centerId ?? ''),
    yearMonth: asString(row.yearMonth, existing?.yearMonth ?? ''),
    milkLiters: asNumber(row.milkLiters, existing?.milkLiters ?? 0),
    flourKg: asNumber(row.flourKg, existing?.flourKg ?? 0),
    foodSource: asString(row.foodSource, existing?.foodSource ?? ''),
    updatedById,
    version:
      typeof row.version === 'number'
        ? row.version
        : Number(row.version) || existing?.version || 1,
    deletedAt,
    lastModifiedAt: asString(row.lastModifiedAt) || existing?.lastModifiedAt || now,
    _localStatus: 'clean',
    _updatedAtLocal: now,
  }
}

/** Build sync push payload for feeding month summary create/update. */
export function buildFeedingMonthSummarySyncPayload(
  row: LocalFeedingMonthSummaryRecord,
): Record<string, unknown> {
  return {
    centerId: row.centerId,
    yearMonth: row.yearMonth,
    milkLiters: row.milkLiters,
    flourKg: row.flourKg,
    foodSource: row.foodSource,
    updatedById: row.updatedById,
    recordedBy: row.updatedById,
    recordedById: row.updatedById,
  }
}
