import axios, { type AxiosError, isAxiosError } from 'axios'

/** Normalized API error used across interceptors, React Query, and UI. */
export interface ApiError {
  statusCode: number
  message: string
  messages: string[]
  timestamp?: string
  code?: string
  raw?: unknown
  isNetworkError: boolean
  isUnauthorized: boolean
  isForbidden: boolean
  isConflict: boolean
  isValidationError: boolean
  isNotFound: boolean
}

/** Coarse classification for UI branching. */
export type ApiErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'not_found'
  | 'network'
  | 'server'
  | 'unknown'

type ErrorBody = {
  success?: boolean
  statusCode?: number
  message?: string | string[]
  timestamp?: string
  code?: string
}

function flattenMessage(message: string | string[] | undefined, fallback: string): {
  message: string
  messages: string[]
} {
  if (Array.isArray(message) && message.length > 0) {
    return { message: message.join('; '), messages: message }
  }
  if (typeof message === 'string' && message.length > 0) {
    return { message, messages: [message] }
  }
  return { message: fallback, messages: [fallback] }
}

function flagsFromStatus(statusCode: number, hasResponse: boolean) {
  return {
    isNetworkError: !hasResponse,
    isUnauthorized: statusCode === 401,
    isForbidden: statusCode === 403,
    isConflict: statusCode === 409,
    isValidationError: statusCode === 400 || statusCode === 422,
    isNotFound: statusCode === 404,
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return {
      ...error,
      isNotFound: error.isNotFound ?? error.statusCode === 404,
    }
  }

  if (isAxiosError(error)) {
    return fromAxiosError(error)
  }

  if (error instanceof Error) {
    return {
      statusCode: 0,
      message: error.message,
      messages: [error.message],
      ...flagsFromStatus(0, true),
      isNetworkError: false,
      raw: error,
    }
  }

  return {
    statusCode: 0,
    message: 'Unexpected error',
    messages: ['Unexpected error'],
    ...flagsFromStatus(0, true),
    isNetworkError: false,
    raw: error,
  }
}

function fromAxiosError(error: AxiosError<ErrorBody>): ApiError {
  const statusCode = error.response?.status ?? 0
  const body = error.response?.data
  const { message, messages } = flattenMessage(
    body?.message,
    error.message || (statusCode ? `Request failed (${statusCode})` : 'Network error'),
  )

  const resolvedStatus = body?.statusCode ?? statusCode

  return {
    statusCode: resolvedStatus,
    message,
    messages,
    timestamp: body?.timestamp,
    code: body?.code,
    raw: error.response?.data ?? error,
    ...flagsFromStatus(resolvedStatus || statusCode, Boolean(error.response)),
  }
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    'message' in value &&
    'isUnauthorized' in value
  )
}

/** Type guard for Axios cancel / abort. */
export function isRequestCanceled(error: unknown): boolean {
  return axios.isCancel(error) || (isAxiosError(error) && error.code === 'ERR_CANCELED')
}

/** Classify a normalized (or raw) error for UI / recovery branching. */
export function getApiErrorKind(error: unknown): ApiErrorKind {
  const apiError = normalizeApiError(error)
  if (apiError.isNetworkError) return 'network'
  if (apiError.isUnauthorized) return 'unauthorized'
  if (apiError.isForbidden) return 'forbidden'
  if (apiError.isValidationError) return 'validation'
  if (apiError.isConflict) return 'conflict'
  if (apiError.isNotFound) return 'not_found'
  if (apiError.statusCode >= 500) return 'server'
  return 'unknown'
}

/** Optimistic-lock / version conflicts (HTTP 409). */
export function isVersionConflict(error: unknown): boolean {
  return normalizeApiError(error).isConflict
}

export function isNotFoundError(error: unknown): boolean {
  return normalizeApiError(error).isNotFound
}

export function isNetworkFailure(error: unknown): boolean {
  return normalizeApiError(error).isNetworkError
}

export function isUnauthorizedError(error: unknown): boolean {
  return normalizeApiError(error).isUnauthorized
}

export function isForbiddenError(error: unknown): boolean {
  return normalizeApiError(error).isForbidden
}

export function isValidationError(error: unknown): boolean {
  return normalizeApiError(error).isValidationError
}

/**
 * Whether the global error bridge should toast this error.
 * Session expiry (401) is handled by auth interceptors instead.
 */
export function shouldToastApiError(error: unknown): boolean {
  if (isRequestCanceled(error)) return false
  const apiError = normalizeApiError(error)
  if (apiError.isUnauthorized) return false
  return true
}

/** User-facing copy helper; keeps conflict/version messaging consistent. */
export function formatApiErrorMessage(error: unknown): string {
  const apiError = normalizeApiError(error)
  if (apiError.isConflict) {
    return apiError.message || 'This record was updated elsewhere. Refresh and try again.'
  }
  if (apiError.isNetworkError) {
    return apiError.message || 'Network error. Check your connection and try again.'
  }
  if (apiError.isNotFound) {
    return apiError.message || 'The requested record was not found.'
  }
  if (apiError.isForbidden) {
    return apiError.message || 'You do not have permission to perform this action.'
  }
  return apiError.message
}
