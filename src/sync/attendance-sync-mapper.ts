import type { LocalAttendanceRecord } from '@/storage/types'

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

function asOptionalIso(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return asString(value)
}

function presentFromRow(row: Record<string, unknown>, existing?: LocalAttendanceRecord | null): boolean {
  if (typeof row.present === 'boolean') return row.present
  if (row.status === 'present') return true
  if (row.status === 'absent') return false
  return existing?.present ?? false
}

/** Map sync pull AttendanceRecord snapshot → LocalAttendanceRecord. */
export function mapPullAttendanceToLocal(
  row: Record<string, unknown>,
  existing?: LocalAttendanceRecord | null,
): LocalAttendanceRecord {
  const now = new Date().toISOString()
  const deletedAt =
    row.deletedAt == null || row.deletedAt === ''
      ? null
      : asString(row.deletedAt)

  const present = presentFromRow(row, existing)
  const broughtBy = asOptionalString(row.broughtBy)
  const broughtByOther = asOptionalString(row.broughtByOther)
  const arrivedAt = asOptionalIso(row.arrivedAt)

  return {
    id: asString(row.id, existing?.id ?? ''),
    childId: asString(row.childId, existing?.childId ?? ''),
    centerId: asString(row.centerId, existing?.centerId ?? ''),
    date:
      asDateOnly(row.attendanceDate ?? row.date) ||
      existing?.date ||
      '',
    present,
    absentReason: present
      ? null
      : asOptionalString(row.absentReason) ?? existing?.absentReason ?? null,
    notes: asOptionalString(row.notes) ?? existing?.notes ?? null,
    recordedBy: asString(
      row.recordedById ?? row.recordedBy,
      existing?.recordedBy ?? '',
    ),
    broughtBy: broughtBy !== undefined ? broughtBy : existing?.broughtBy ?? null,
    broughtByOther:
      broughtByOther !== undefined ? broughtByOther : existing?.broughtByOther ?? null,
    arrivedAt: arrivedAt !== undefined ? arrivedAt : existing?.arrivedAt ?? null,
    version: typeof row.version === 'number' ? row.version : Number(row.version) || existing?.version || 1,
    deletedAt,
    lastModifiedAt: asString(row.lastModifiedAt) || existing?.lastModifiedAt || now,
    _localStatus: 'clean',
    _updatedAtLocal: now,
  }
}

/** Build sync push payload for attendance create/update. */
export function buildAttendanceSyncPayload(
  row: LocalAttendanceRecord,
): Record<string, unknown> {
  return {
    childId: row.childId,
    centerId: row.centerId,
    date: row.date,
    attendanceDate: row.date,
    present: row.present,
    ...(row.present
      ? { absentReason: null }
      : { absentReason: row.absentReason ?? 'other' }),
    notes: row.notes ?? null,
    recordedBy: row.recordedBy,
    recordedById: row.recordedBy,
    broughtBy: row.broughtBy ?? null,
    broughtByOther: row.broughtByOther ?? null,
    arrivedAt: row.arrivedAt ?? null,
  }
}
