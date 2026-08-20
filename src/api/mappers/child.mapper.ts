import type {
  ArchiveChildDto,
  ChildDetailResponseDto,
  ChildResponseDto,
  CreateChildDto,
  ReactivateChildDto,
  TransferChildDto,
  UpdateChildDto,
} from '@/api/generated/models'
import type { ChildViewModel, ChildrenListResult } from '@/models/child'
import type {
  ArchiveChildInput,
  Child,
  ChildRegistrationForm,
  GuardianRelation,
  TransferChildInput,
} from '@/types'
import type { PaginatedChildrenResponseDto } from '@/api/generated/models'
import { normalizeNationalId } from '@/lib/child-form'

const DEFAULT_RELATION: GuardianRelation = 'ikindi'

function asGuardianRelation(value: string | null | undefined): GuardianRelation {
  if (!value) return DEFAULT_RELATION
  return value as GuardianRelation
}

function emptyLocation(value: string | null | undefined): string {
  return value ?? ''
}

/** Map list DTO → view model (fills detail-only fields with safe defaults). */
export function mapChildListItemToViewModel(dto: ChildResponseDto): ChildViewModel {
  return {
    id: dto.id,
    fullName: dto.fullName,
    dateOfBirth: dto.dateOfBirth,
    gender: dto.gender,
    guardianName: dto.guardianName,
    guardianPhone: dto.guardianPhone,
    guardianRelation: DEFAULT_RELATION,
    province: emptyLocation(dto.province),
    district: emptyLocation(dto.district),
    sector: emptyLocation(dto.sector),
    cell: emptyLocation(dto.cell),
    village: emptyLocation(dto.village),
    registeredAt: dto.createdAt?.slice(0, 10) ?? dto.createdAt,
    status: dto.status,
    // API list DTO has no separate registrationNumber; NIN is the durable identifier.
    registrationNumber:
      (dto as ChildResponseDto & { registrationNumber?: string }).registrationNumber ??
      dto.nationalId ??
      '',
    centerId: dto.centerId,
    centerName: dto.centerName ?? '',
    version: dto.version,
    homeVillageId: dto.homeVillageId,
    archivedAt: dto.status === 'archived' ? dto.updatedAt?.slice(0, 10) : undefined,
    classroomId: (dto.classroomId as unknown as string) ?? undefined,
    classroomGrade: dto.classroomGrade ?? undefined,
    nationalId: dto.nationalId ?? undefined,
  }
}

export function mapChildDetailToViewModel(dto: ChildDetailResponseDto): ChildViewModel {
  return {
    id: dto.id,
    fullName: dto.fullName,
    dateOfBirth: dto.dateOfBirth,
    gender: dto.gender,
    specialNeeds: dto.specialNeeds ?? undefined,
    guardianName: dto.guardianName,
    guardianPhone: dto.guardianPhone,
    guardianRelation: asGuardianRelation(dto.guardianRelation),
    guardian2Name: dto.guardian2Name ?? undefined,
    guardian2Phone: dto.guardian2Phone ?? undefined,
    guardian2Relation: dto.guardian2Relation
      ? asGuardianRelation(dto.guardian2Relation)
      : undefined,
    province: emptyLocation(dto.province),
    district: emptyLocation(dto.district),
    sector: emptyLocation(dto.sector),
    cell: emptyLocation(dto.cell),
    village: emptyLocation(dto.village),
    registeredAt: dto.registeredAt?.slice(0, 10) ?? dto.registeredAt,
    status: dto.status,
    registrationNumber:
      (dto as ChildDetailResponseDto & { registrationNumber?: string }).registrationNumber ??
      dto.nationalId ??
      '',
    centerId: dto.centerId,
    centerName: dto.centerName ?? '',
    archivedAt: dto.archivedAt ?? undefined,
    archiveReason: dto.archiveReason ?? undefined,
    version: dto.version,
    homeVillageId: dto.homeVillageId,
    notes: dto.notes ?? undefined,
    firstName: dto.firstName,
    middleName: dto.middleName ?? undefined,
    lastName: dto.lastName ?? undefined,
    classroomId: (dto.classroomId as unknown as string) ?? undefined,
    classroomGrade: dto.classroomGrade ?? undefined,
    classroomLabel: (dto.classroomLabel as unknown as string) ?? undefined,
    nationalId: dto.nationalId ?? undefined,
  }
}

export function mapPaginatedChildrenToViewModel(
  dto: PaginatedChildrenResponseDto,
): ChildrenListResult {
  return {
    items: dto.items.map(mapChildListItemToViewModel),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

export function mapFormToCreateChildDto(
  form: ChildRegistrationForm,
  options: {
    centerId: string
    homeVillageId: string
    classroomId?: string
  },
): CreateChildDto {
  return {
    fullName: form.fullName.trim(),
    dateOfBirth: form.dateOfBirth,
    gender: form.gender as CreateChildDto['gender'],
    centerId: options.centerId,
    homeVillageId: options.homeVillageId,
    nationalId: normalizeNationalId(form.nationalId),
    guardianName: form.guardianName.trim(),
    guardianPhone: form.guardianPhone.trim(),
    guardianRelation: form.guardianRelation || undefined,
    ...(form.guardian2Name.trim()
      ? {
          guardian2Name: form.guardian2Name.trim(),
          guardian2Phone: form.guardian2Phone.trim() || undefined,
          guardian2Relation: form.guardian2Relation || undefined,
        }
      : {}),
    ...(form.specialNeeds.trim() ? { specialNeeds: form.specialNeeds.trim() } : {}),
    ...(options.classroomId ? { classroomId: options.classroomId } : {}),
  }
}

export function mapChildPatchToUpdateDto(
  child: ChildViewModel,
  patch: Partial<Child>,
): UpdateChildDto {
  return {
    version: child.version,
    ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
    ...(patch.dateOfBirth !== undefined ? { dateOfBirth: patch.dateOfBirth } : {}),
    ...(patch.gender !== undefined ? { gender: patch.gender } : {}),
    ...(patch.centerId !== undefined ? { centerId: patch.centerId } : {}),
    ...(patch.homeVillageId !== undefined || child.homeVillageId
      ? { homeVillageId: (patch as ChildViewModel).homeVillageId ?? child.homeVillageId }
      : {}),
    ...(patch.guardianName !== undefined ? { guardianName: patch.guardianName } : {}),
    ...(patch.guardianPhone !== undefined ? { guardianPhone: patch.guardianPhone } : {}),
    ...(patch.guardianRelation !== undefined ? { guardianRelation: patch.guardianRelation } : {}),
    ...(patch.guardian2Name !== undefined ? { guardian2Name: patch.guardian2Name } : {}),
    ...(patch.guardian2Phone !== undefined ? { guardian2Phone: patch.guardian2Phone } : {}),
    ...(patch.guardian2Relation !== undefined ? { guardian2Relation: patch.guardian2Relation } : {}),
    ...(patch.specialNeeds !== undefined ? { specialNeeds: patch.specialNeeds } : {}),
    ...(patch.classroomId !== undefined ? { classroomId: patch.classroomId } : {}),
  }
}

export function mapArchiveInputToDto(
  child: ChildViewModel,
  input: ArchiveChildInput,
): ArchiveChildDto {
  return {
    version: child.version,
    archiveReason: input.notes ? `${input.reason}: ${input.notes}` : input.reason,
  }
}

export function mapReactivateToDto(child: ChildViewModel): ReactivateChildDto {
  return { version: child.version }
}

export function mapTransferInputToDto(input: TransferChildInput): TransferChildDto {
  return {
    toCenterId: input.destinationCenterId,
    transferDate: input.transferDate,
    reason: input.reason,
    notes: input.notes,
  }
}

/** Narrow Child → ChildViewModel when version/homeVillageId are known (LIVE cache). */
export function asChildViewModel(child: Child): ChildViewModel {
  const version = 'version' in child && typeof (child as ChildViewModel).version === 'number'
    ? (child as ChildViewModel).version
    : 0
  const homeVillageId =
    'homeVillageId' in child && typeof (child as ChildViewModel).homeVillageId === 'string'
      ? (child as ChildViewModel).homeVillageId
      : ''
  return { ...child, version, homeVillageId }
}
