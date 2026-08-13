import type { AuthMeResponseDto, AuthUserResponseDto } from '@/api/generated/models'
import { normalizeRole } from '@/api/roles'
import type { AuthUserViewModel } from '@/models/auth'

type ApiAuthUser = AuthUserResponseDto | AuthMeResponseDto

/** @deprecated Import from `@/api/roles` instead. */
export { normalizeRole as mapApiRoleToUi, denormalizeRole as mapUiRoleToApi } from '@/api/roles'

export function mapAuthUserToViewModel(user: ApiAuthUser): AuthUserViewModel {
  const fullName =
    'fullName' in user && typeof user.fullName === 'string' && user.fullName.trim()
      ? user.fullName
      : user.username

  return {
    id: user.id,
    name: fullName,
    role: normalizeRole(user.role),
    centerId: user.centerId ?? undefined,
    centerName: user.center?.name ?? undefined,
    districtId: user.districtId ?? undefined,
    districtName: undefined,
  }
}
