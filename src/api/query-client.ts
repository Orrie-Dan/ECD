import { QueryClient } from '@tanstack/react-query'
import { normalizeApiError, isRequestCanceled, type ApiError } from '@/api/errors'
import { queryStaleTimes } from '@/api/query-keys'

export type GlobalApiErrorHandler = (error: ApiError) => void

let globalApiErrorHandler: GlobalApiErrorHandler | null = null

/** Register a UI-level handler (e.g. toast) for React Query / mutation failures. */
export function setGlobalApiErrorHandler(handler: GlobalApiErrorHandler | null): void {
  globalApiErrorHandler = handler
}

function shouldNotify(error: unknown): boolean {
  if (isRequestCanceled(error)) return false
  return true
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const apiError = normalizeApiError(error)
          if (
            apiError.isUnauthorized ||
            apiError.isForbidden ||
            apiError.isValidationError ||
            apiError.isNotFound ||
            apiError.isConflict
          ) {
            return false
          }
          return failureCount < 2
        },
        refetchOnWindowFocus: false,
        /** Default; domain hooks override via queryStaleTimes */
        staleTime: queryStaleTimes.childrenList,
      },
      mutations: {
        retry: false,
        onError: (error) => {
          if (!shouldNotify(error)) return
          globalApiErrorHandler?.(normalizeApiError(error))
        },
      },
    },
  })
}

/** Singleton used by the QueryProvider. */
export const queryClient = createQueryClient()
