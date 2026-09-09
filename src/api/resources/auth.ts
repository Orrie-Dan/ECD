/**
 * Auth resource layer — wraps generated OpenAPI client.
 * Feature hooks import from here; UI never imports generated auth modules.
 */
import {
  authControllerConfirmPasswordReset,
  authControllerLogin,
  authControllerMe,
  authControllerRefresh,
  authControllerRequestPasswordReset,
} from '@/api/generated/endpoints/auth/auth'
import type {
  AuthUserResponseDto,
  LoginDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
  RefreshTokenDto,
} from '@/api/generated/models'
import { mapAuthUserToViewModel } from '@/api/mappers/auth.mapper'
import type { AuthTokensViewModel, AuthUserViewModel } from '@/models/auth'

export type LoginSession = AuthTokensViewModel & { apiUser: AuthUserResponseDto }

export async function loginRequest(credentials: LoginDto): Promise<LoginSession> {
  const data = await authControllerLogin(credentials)
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: mapAuthUserToViewModel(data.user),
    apiUser: data.user,
  }
}

export async function refreshTokensRequest(body: RefreshTokenDto): Promise<AuthTokensViewModel> {
  const data = await authControllerRefresh(body)
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: mapAuthUserToViewModel(data.user),
  }
}

export async function fetchCurrentUser(): Promise<AuthUserViewModel> {
  const me = await authControllerMe()
  return mapAuthUserToViewModel(me)
}

/** Always accepted; does not reveal whether the account exists. */
export async function requestPasswordReset(
  body: PasswordResetRequestDto,
): Promise<{ accepted: true }> {
  await authControllerRequestPasswordReset(body)
  return { accepted: true }
}

export async function confirmPasswordReset(
  body: PasswordResetConfirmDto,
): Promise<{ success: true }> {
  await authControllerConfirmPasswordReset(body)
  return { success: true }
}
