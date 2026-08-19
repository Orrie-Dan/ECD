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
  district,
  ncda,
  ecdCenter,
} from '@/api/query-keys'
import { useApiAuth } from '@/api/auth/ApiAuthProvider'
import { normalizeApiError } from '@/api/errors'
import { UnknownUserRoleError } from '@/api/roles'
import { completeLiveLogin } from '@/features/auth/complete-live-login'
import { clearAllCachedLogins } from '@/features/auth/offline-auth'
import type { UserRole } from '@/types'
import type { LoginError, LoginResult } from '@/features/auth/login-result'

export type { LoginError, LoginResult }

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
        return await completeLiveLogin(
          {
            username: trimmedUsername,
            password: input.password,
            expectedRole: input.expectedRole,
          },
          apiAuth,
        )
      } catch (error) {
        if (error instanceof UnknownUserRoleError) {
          apiAuth.clearSession()
          return { success: false, error: 'invalid_credentials' }
        }
        const apiError = normalizeApiError(error)
        if (apiError.isValidationError || apiError.isUnauthorized) {
          return { success: false, error: 'invalid_credentials' }
        }
        if (apiError.isNetworkError) {
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
    clearAllCachedLogins()
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
    void queryClient.removeQueries({ queryKey: district.keys.all })
    void queryClient.removeQueries({ queryKey: ncda.keys.all })
    void queryClient.removeQueries({ queryKey: ecdCenter.keys.all })
  }
}
