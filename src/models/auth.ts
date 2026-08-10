import type { User, UserRole } from '@/types'
import type { BackendUserRole } from '@/api/roles'

/**
 * UI-facing auth session user.
 * Kept aligned with existing `User` so layouts/guards need no visual changes.
 */
export type AuthUserViewModel = User

export type { BackendUserRole }

export interface AuthTokensViewModel {
  accessToken: string
  refreshToken: string
  user: AuthUserViewModel
}

export type { UserRole }
