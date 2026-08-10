/**
 * Auth resource layer — wraps generated OpenAPI client.
 * Feature hooks import from here; UI never imports generated auth modules.
 */
import {
  authControllerLogin,
  authControllerMe,
  authControllerRefresh,
} from '@/api/generated/endpoints/auth/auth'
import type { LoginDto, RefreshTokenDto } from '@/api/generated/models'
import { mapAuthUserToViewModel } from '@/api/mappers/auth.mapper'
import type { AuthTokensViewModel, AuthUserViewModel } from '@/models/auth'

export async function loginRequest(credentials: LoginDto): Promise<AuthTokensViewModel> {
  const data = await authControllerLogin(credentials)
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: mapAuthUserToViewModel(data.user),
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
