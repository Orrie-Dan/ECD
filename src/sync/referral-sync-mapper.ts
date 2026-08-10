import type { LocalReferralRecord } from '@/storage/types'

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

/** Map sync pull Referral snapshot → LocalReferralRecord. */
export function mapPullReferralToLocal(
  row: Record<string, unknown>,
  existing?: LocalReferralRecord | null,
): LocalReferralRecord {
  const now = new Date().toISOString()
  const deletedAt =
    row.deletedAt == null || row.deletedAt === '' ? null : asString(row.deletedAt)
  const notes = asOptionalString(row.notes)
  const implementedAt = asOptionalString(row.implementedAt)
  const lastModifiedByDeviceId = asOptionalString(
    row.lastModifiedByDeviceId ?? row.deviceId,
  )

  return {
    id: asString(row.id, existing?.id ?? ''),
    childId: asString(row.childId, existing?.childId ?? ''),
    centerId: asString(row.centerId, existing?.centerId ?? ''),
    sourceType: asString(row.sourceType, existing?.sourceType ?? 'nutrition'),
    sourceId: asString(row.sourceId ?? row.assessmentId, existing?.sourceId ?? ''),
    referralDate:
      asDateOnly(row.referralDate ?? row.date) || existing?.referralDate || '',
    reason: asString(row.reason, existing?.reason ?? ''),
    destination: asString(row.destination, existing?.destination ?? ''),
    status: asString(row.status, existing?.status ?? 'pending'),
    notes: notes !== undefined ? notes : existing?.notes ?? null,
    implementedAt:
      implementedAt !== undefined ? implementedAt : existing?.implementedAt ?? null,
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
    lastModifiedByDeviceId:
      lastModifiedByDeviceId !== undefined
        ? lastModifiedByDeviceId
        : existing?.lastModifiedByDeviceId ?? null,
    _localStatus: 'clean',
    _updatedAtLocal: now,
  }
}

/** Build sync push payload for referral CREATE. */
export function buildReferralSyncPayload(
  row: LocalReferralRecord,
): Record<string, unknown> {
  return {
    childId: row.childId,
    centerId: row.centerId,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    referralDate: row.referralDate,
    reason: row.reason,
    destination: row.destination,
    status: row.status,
    notes: row.notes ?? null,
    implementedAt: row.implementedAt ?? null,
    recordedBy: row.recordedById,
    recordedById: row.recordedById,
    ...(row.lastModifiedByDeviceId
      ? { deviceId: row.lastModifiedByDeviceId }
      : {}),
  }
}

/**
 * Build sync push payload for referral UPDATE (CAS).
 * Backend allows only status / notes / implementedAt — never reason/destination/source.
 */
export function buildReferralUpdateSyncPayload(
  row: LocalReferralRecord,
): Record<string, unknown> {
  return {
    status: row.status,
    notes: row.notes ?? null,
    implementedAt: row.implementedAt ?? null,
    ...(row.lastModifiedByDeviceId
      ? { deviceId: row.lastModifiedByDeviceId }
      : {}),
  }
}
