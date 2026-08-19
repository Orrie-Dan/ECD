/**
 * Users resource — NCDA/DFP admin directory. Never caches temporary passwords.
 */
import {
  usersControllerCreate,
  usersControllerFindAll,
  usersControllerFindOne,
  usersControllerResetPassword,
  usersControllerUpdate,
} from '@/api/generated/endpoints/users/users'
import type {
  ApiUserStatus,
  CreateUserDto,
  CreateUserResponseDto,
  PaginatedUsersResponseDto,
  ResetUserPasswordResponseDto,
  UpdateUserDto,
  UserResponseDto,
  UserRole,
} from '@/api/generated/models'

const MAX_PAGE_SIZE = 100

function clampPageSize(pageSize?: number): number {
  if (pageSize == null || Number.isNaN(pageSize)) return 20
  return Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE)
}

export type UsersListFilters = {
  search?: string
  role?: UserRole
  status?: ApiUserStatus
  districtId?: string
  centerId?: string
  page?: number
  pageSize?: number
}

/** Roles NCDA may assign on create — mirrors backend canCreateRole. */
export const NCDA_CREATABLE_ROLES: UserRole[] = [
  'district_focal_person',
  'ecd_director',
  'caregiver',
]

/** Roles District Focal Person may assign on create — caregiver only (UI). */
export const DISTRICT_CREATABLE_ROLES: UserRole[] = ['caregiver']

/** Roles ECD director may assign on create — caregiver at own center only. */
export const ECD_DIRECTOR_CREATABLE_ROLES: UserRole[] = ['caregiver']

export async function listUsersPage(
  filters: UsersListFilters = {},
): Promise<PaginatedUsersResponseDto> {
  return usersControllerFindAll({
    search: filters.search?.trim() || undefined,
    role: filters.role,
    status: filters.status,
    districtId: filters.districtId,
    centerId: filters.centerId,
    page: filters.page ?? 1,
    pageSize: clampPageSize(filters.pageSize),
  })
}

export async function fetchUsersTotal(
  filters: Omit<UsersListFilters, 'page' | 'pageSize'> = {},
): Promise<number> {
  const page = await listUsersPage({ ...filters, page: 1, pageSize: 1 })
  return page.total
}

export async function getUser(id: string): Promise<UserResponseDto> {
  return usersControllerFindOne(id)
}

export async function createUser(dto: CreateUserDto): Promise<CreateUserResponseDto> {
  if (!NCDA_CREATABLE_ROLES.includes(dto.role)) {
    throw new Error('Role is not creatable by NCDA Admin via API')
  }
  return usersControllerCreate(dto)
}

/** District Focal Person — create caregiver accounts in district scope. */
export async function createDistrictCaregiver(
  dto: CreateUserDto,
): Promise<CreateUserResponseDto> {
  if (dto.role !== 'caregiver') {
    throw new Error('District Focal Person can only create caregiver accounts')
  }
  if (!dto.centerId?.trim()) {
    throw new Error('centerId is required for caregiver accounts')
  }
  return usersControllerCreate({
    username: dto.username,
    fullName: dto.fullName,
    phone: dto.phone,
    role: 'caregiver',
    centerId: dto.centerId.trim(),
  })
}

/** ECD director — create caregiver accounts at the director's center. */
export async function createCenterCaregiver(
  dto: CreateUserDto,
): Promise<CreateUserResponseDto> {
  if (!ECD_DIRECTOR_CREATABLE_ROLES.includes(dto.role)) {
    throw new Error('ECD director can only create caregiver accounts')
  }
  if (!dto.centerId?.trim()) {
    throw new Error('centerId is required for caregiver accounts')
  }
  return usersControllerCreate({
    username: dto.username,
    fullName: dto.fullName,
    phone: dto.phone,
    role: 'caregiver',
    centerId: dto.centerId.trim(),
  })
}

export async function updateUser(
  id: string,
  dto: UpdateUserDto,
): Promise<UserResponseDto> {
  return usersControllerUpdate(id, dto)
}

/** Server generates temporary password when newPassword omitted. */
export async function resetUserPassword(
  id: string,
  newPassword?: string,
): Promise<ResetUserPasswordResponseDto> {
  return usersControllerResetPassword(id, {
    ...(newPassword ? { newPassword } : {}),
  })
}

export const USERS_MAX_PAGE_SIZE = MAX_PAGE_SIZE
