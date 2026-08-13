import type { AuthUserViewModel } from '@/models/auth'
import type { UserRole } from '@/types'

export type LoginError =
  | 'username_required'
  | 'password_required'
  | 'invalid_credentials'
  | 'wrong_role'
  | 'api_unavailable'

export type LoginResult =
  | { success: true; role: UserRole; user: AuthUserViewModel }
  | { success: false; error: LoginError }
