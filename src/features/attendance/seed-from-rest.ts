import type { LocalStore } from '@/storage/local-store'
import type { LocalAttendanceRecord } from '@/storage/types'
import type { AttendanceViewModel } from '@/models/attendance'

/** Seed REST list items into IDB as clean records (bootstrap only). */
export async function mapAttendanceListItemToLocalSeed(
  store: LocalStore,
  items: AttendanceViewModel[],
): Promise<void> {
  if (items.length === 0) return
  const now = new Date().toISOString()
  const rows: LocalAttendanceRecord[] = items.map((item) => ({
    id: item.id,
    childId: item.childId,
    centerId: item.centerId,
    date: item.date,
    present: item.present,
    absentReason: item.absentReason ?? null,
    notes: item.notes ?? null,
    recordedBy: item.recordedBy ?? '',
    // REST DTOs omit session/sync fields — leave null until pull/sync fills them.
    broughtBy: item.broughtBy ?? null,
    broughtByOther: item.broughtByOther ?? null,
    arrivedAt: item.arrivedAt ?? null,
    version: item.version,
    deletedAt: null,
    lastModifiedAt: now,
    _localStatus: 'clean',
    _updatedAtLocal: now,
  }))
  await store.putAttendances(rows)
}
