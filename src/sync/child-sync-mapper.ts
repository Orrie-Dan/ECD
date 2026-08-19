import { createUuid } from '@/lib/uuid'
import type { LocalChildRecord } from '@/storage/types'

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

function joinName(first: string, middle?: string | null, last?: string | null): string {
  return [first, middle, last].filter(Boolean).join(' ').trim()
}

/** Split UI fullName into sync create payload name parts (matches backend split rules). */
export function splitFullName(fullName: string): {
  firstName: string
  middleName: string | null
  lastName: string | null
} {
  const tokens = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length === 0) return { firstName: '', middleName: null, lastName: null }
  if (tokens.length === 1) return { firstName: tokens[0], middleName: null, lastName: null }
  return {
    firstName: tokens[0],
    middleName: null,
    lastName: tokens.slice(1).join(' '),
  }
}

export function mapPullChildToLocal(
  row: Record<string, unknown>,
  existing?: LocalChildRecord | null,
): LocalChildRecord {
  const firstName = asString(row.firstName)
  const middleName = row.middleName == null ? null : asString(row.middleName)
  const lastName = row.lastName == null ? null : asString(row.lastName)
  const fullName =
    existing?.fullName && existing._localStatus === 'dirty'
      ? existing.fullName
      : joinName(firstName, middleName, lastName) || existing?.fullName || firstName

  const deletedAt =
    row.deletedAt == null || row.deletedAt === ''
      ? null
      : asString(row.deletedAt)

  return {
    id: asString(row.id) || createUuid(),
    version: typeof row.version === 'number' ? row.version : Number(row.version) || 1,
    deletedAt,
    lastModifiedAt: asString(row.lastModifiedAt) || new Date().toISOString(),
    // Never overwrite a dirty local create with a clean pull of a different entity.
    _localStatus: existing?._localStatus === 'dirty' ? 'dirty' : 'clean',
    registrationNumber: asString(row.registrationNumber, existing?.registrationNumber ?? ''),
    firstName: firstName || existing?.firstName || '',
    middleName,
    lastName,
    fullName,
    centerId: asString(row.centerId, existing?.centerId ?? ''),
    centerName: existing?.centerName ?? '',
    dateOfBirth: asDateOnly(row.dateOfBirth) || existing?.dateOfBirth || '',
    gender: asString(row.gender, existing?.gender ?? ''),
    status: (asString(row.status, existing?.status ?? 'active') as LocalChildRecord['status']),
    specialNeeds: row.specialNeeds == null ? existing?.specialNeeds : asString(row.specialNeeds),
    guardianName: asString(row.guardianName, existing?.guardianName ?? ''),
    guardianPhone: asString(row.guardianPhone, existing?.guardianPhone ?? ''),
    guardianRelation: asString(row.guardianRelation, existing?.guardianRelation ?? 'ikindi'),
    guardian2Name: row.guardian2Name == null ? existing?.guardian2Name : asString(row.guardian2Name),
    guardian2Phone:
      row.guardian2Phone == null ? existing?.guardian2Phone : asString(row.guardian2Phone),
    guardian2Relation:
      row.guardian2Relation == null
        ? existing?.guardian2Relation
        : asString(row.guardian2Relation),
    homeVillageId: asString(row.homeVillageId, existing?.homeVillageId ?? ''),
    registeredAt: asDateOnly(row.registeredAt) || existing?.registeredAt || '',
    province: existing?.province ?? '',
    district: existing?.district ?? '',
    sector: existing?.sector ?? '',
    cell: existing?.cell ?? '',
    village: existing?.village ?? '',
    archivedAt: row.archivedAt == null ? existing?.archivedAt : asDateOnly(row.archivedAt),
    archiveReason:
      row.archiveReason == null ? existing?.archiveReason : asString(row.archiveReason),
    notes: row.notes == null ? existing?.notes : asString(row.notes),
    classroomId: row.classroomId == null ? existing?.classroomId : asString(row.classroomId),
    classroomGrade: row.classroomGrade == null ? existing?.classroomGrade : asString(row.classroomGrade),
  }
}

function toSyncGender(gender: string): 'male' | 'female' {
  if (gender === 'Umukobwa' || gender === 'female') return 'female'
  return 'male'
}

export function buildChildCreateSyncPayload(child: LocalChildRecord): Record<string, unknown> {
  return {
    registrationNumber: child.registrationNumber,
    firstName: child.firstName,
    middleName: child.middleName ?? null,
    lastName: child.lastName ?? null,
    centerId: child.centerId,
    dateOfBirth: child.dateOfBirth,
    gender: toSyncGender(child.gender),
    status: child.status,
    specialNeeds: child.specialNeeds ?? null,
    guardianName: child.guardianName,
    guardianPhone: child.guardianPhone,
    guardianRelation: child.guardianRelation,
    guardian2Name: child.guardian2Name ?? null,
    guardian2Phone: child.guardian2Phone ?? null,
    guardian2Relation: child.guardian2Relation ?? null,
    homeVillageId: child.homeVillageId,
    registeredAt: child.registeredAt,
  }
}

/**
 * Payload fields accepted by backend sync CAS update for `child`.
 * Note: dateOfBirth / gender / homeVillageId are NOT applied by sync CAS today —
 * those edits require online REST until the sync contract expands.
 */
export function buildChildUpdateSyncPayload(child: LocalChildRecord): Record<string, unknown> {
  return {
    firstName: child.firstName,
    middleName: child.middleName ?? null,
    lastName: child.lastName ?? null,
    status: child.status,
    specialNeeds: child.specialNeeds ?? null,
    guardianName: child.guardianName,
    guardianPhone: child.guardianPhone,
    guardianRelation: child.guardianRelation,
    guardian2Name: child.guardian2Name ?? null,
    guardian2Phone: child.guardian2Phone ?? null,
    guardian2Relation: child.guardian2Relation ?? null,
    archiveReason: child.archiveReason ?? null,
    archivedAt: child.archivedAt ?? null,
  }
}

export function villageCacheKey(location: {
  district: string
  sector: string
  cell: string
  village: string
}): string {
  return [location.district, location.sector, location.cell, location.village]
    .map((p) => p.trim().toLowerCase())
    .join('|')
}
