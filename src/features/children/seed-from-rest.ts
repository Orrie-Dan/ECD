import type { LocalStore } from '@/storage/local-store'
import type { ChildViewModel } from '@/models/child'
import type { LocalChildRecord } from '@/storage/types'
import { splitFullName } from '@/sync/child-sync-mapper'

/** Seed REST list items into IDB as clean records (bootstrap only). */
export async function mapChildListItemToLocalSeed(
  store: LocalStore,
  items: ChildViewModel[],
): Promise<void> {
  if (items.length === 0) return
  const now = new Date().toISOString()
  const rows: LocalChildRecord[] = items.map((item) => {
    const names = splitFullName(item.fullName)
    return {
      id: item.id,
      version: item.version,
      deletedAt: null,
      lastModifiedAt: now,
      _localStatus: 'clean',
      registrationNumber: item.registrationNumber,
      firstName: item.firstName ?? names.firstName,
      middleName: item.middleName ?? names.middleName,
      lastName: item.lastName ?? names.lastName,
      fullName: item.fullName,
      centerId: item.centerId,
      centerName: item.centerName,
      dateOfBirth: item.dateOfBirth,
      gender: item.gender,
      status: item.status,
      specialNeeds: item.specialNeeds,
      guardianName: item.guardianName,
      guardianPhone: item.guardianPhone,
      guardianRelation: item.guardianRelation,
      guardian2Name: item.guardian2Name,
      guardian2Phone: item.guardian2Phone,
      guardian2Relation: item.guardian2Relation,
      homeVillageId: item.homeVillageId,
      registeredAt: item.registeredAt,
      province: item.province,
      district: item.district,
      sector: item.sector,
      cell: item.cell,
      village: item.village,
      archivedAt: item.archivedAt,
      archiveReason: item.archiveReason,
      notes: item.notes,
      classroomId: item.classroomId,
      classroomGrade: item.classroomGrade,
    }
  })
  await store.putChildren(rows)
}
