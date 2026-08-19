/**
 * Dedicated `/api` layer — infrastructure + generated OpenAPI clients.
 *
 * Pages should import from here (or `@/api/resources/*`) rather than
 * reaching into `@/api/generated` or Axios directly.
 *
 * Mode:
 * - `VITE_API_MODE=mock` (default): existing mock AuthProvider/DataProvider continue to drive UI
 * - `VITE_API_MODE=live`: use hooks/functions from this layer against Nest
 */
export { env } from '@/config/env'
export { apiClient, customInstance } from '@/api/client'
export { tokenStorage } from '@/api/token-storage'
export {
  normalizeApiError,
  isApiError,
  isRequestCanceled,
  getApiErrorKind,
  isVersionConflict,
  isNotFoundError,
  isNetworkFailure,
  isUnauthorizedError,
  isForbiddenError,
  isValidationError,
  shouldToastApiError,
  formatApiErrorMessage,
  type ApiError,
  type ApiErrorKind,
} from '@/api/errors'
export {
  normalizeRole,
  denormalizeRole,
  hasRole,
  isCaretaker,
  isEcdDirector,
  isEcdCenterUser,
  loginRoleMatches,
  isDistrictOfficer,
  isNcda,
  homePathForRole,
  homePathForUser,
  ECD_CENTER_ROLES,
  UnknownUserRoleError,
  type BackendUserRole,
  type UiUserRole,
} from '@/api/roles'
export { queryClient, setGlobalApiErrorHandler, createQueryClient } from '@/api/query-client'
export {
  queryKeys,
  auth as authQuery,
  children as childrenQuery,
  attendance as attendanceQuery,
  growth as growthQuery,
  nutrition as nutritionQuery,
  classrooms as classroomsQuery,
  authKeys,
  childrenKeys,
  attendanceKeys,
  growthKeys,
  nutritionKeys,
  queryStaleTimes,
  createDomainKeys,
} from '@/api/query-keys'
export {
  setApiSessionListeners,
  clearApiSessionListeners,
  type TokenPair,
} from '@/api/interceptors'
export {
  ApiAuthProvider,
  useApiAuth,
  type ApiAuthContextValue,
  type ApiAuthStatus,
  type ApiSessionUser,
} from '@/api/auth/ApiAuthProvider'
export { QueryProvider } from '@/api/providers/QueryProvider'
export { ApiProviders } from '@/api/providers/ApiProviders'
export { ApiErrorBridge } from '@/api/providers/ApiErrorBridge'

/** Generated DTO / enum models from OpenAPI (types + const enums) */
export * from '@/api/generated/models'
