import { useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import {
  auth,
  children,
  attendance,
  growth,
  nutrition,
  feeding,
  sted,
  referrals,
  monitoring,
  reporting,
} from '@/api/query-keys'
import { loginRequest } from '@/api/resources/auth'
import { useApiAuth } from '@/api/auth/ApiAuthProvider'
import { normalizeApiError } from '@/api/errors'
import { hasRole } from '@/api/roles'
import type { AuthUserViewModel } from '@/models/auth'
import type { UserRole } from '@/types'

export type LoginError = 'username_required' | 'password_required' | 'invalid_credentials' | 'wrong_role'

export type LoginResult =
  | { success: true; role: UserRole; user: AuthUserViewModel }
  | { success: false; error: LoginError }

/**
 * LIVE login against the auth resource. MOCK callers should use demo credentials path instead.
 */
export function useLogin() {
  const apiAuth = useApiAuth()

  return useMutation({
    mutationFn: async (input: {
      username: string
      password: string
      expectedRole: UserRole
    }): Promise<LoginResult> => {
      const trimmedUsername = input.username.trim()
      if (!trimmedUsername) return { success: false, error: 'username_required' }
      if (!input.password) return { success: false, error: 'password_required' }

      if (env.isMock) {
        throw new Error('useLogin is for LIVE mode; use mock AuthProvider credentials in MOCK')
      }

      try {
        const session = await loginRequest({
          username: trimmedUsername,
          password: input.password,
        })
        apiAuth.setSession(
          { accessToken: session.accessToken, refreshToken: session.refreshToken },
          undefined,
        )

        if (!hasRole(session.user, input.expectedRole)) {
          apiAuth.clearSession()
          return { success: false, error: 'wrong_role' }
        }

        return { success: true, role: session.user.role, user: session.user }
      } catch (error) {
        const apiError = normalizeApiError(error)
        if (apiError.isValidationError || apiError.isUnauthorized) {
          return { success: false, error: 'invalid_credentials' }
        }
        throw apiError
      }
    },
  })
}

export function useLogout() {
  const apiAuth = useApiAuth()
  const queryClient = useQueryClient()

  return () => {
    apiAuth.clearSession()
    void queryClient.removeQueries({ queryKey: auth.keys.all })
    void queryClient.removeQueries({ queryKey: children.keys.all })
    void queryClient.removeQueries({ queryKey: attendance.keys.all })
    void queryClient.removeQueries({ queryKey: growth.keys.all })
    void queryClient.removeQueries({ queryKey: nutrition.keys.all })
    void queryClient.removeQueries({ queryKey: feeding.keys.all })
    void queryClient.removeQueries({ queryKey: sted.keys.all })
    void queryClient.removeQueries({ queryKey: referrals.keys.all })
    void queryClient.removeQueries({ queryKey: monitoring.keys.all })
    void queryClient.removeQueries({ queryKey: reporting.keys.all })
  }
}
