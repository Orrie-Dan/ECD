import { AxiosError, CanceledError } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  isRequestCanceled,
  normalizeApiError,
  shouldToastApiError,
} from '@/api/errors'

describe('canceled request handling', () => {
  it('detects ERR_CANCELED / AbortSignal aborts', () => {
    const error = new CanceledError('canceled')
    expect(isRequestCanceled(error)).toBe(true)
    expect(shouldToastApiError(error)).toBe(false)
  })

  it('preserves cancel after normalizeApiError (interceptor path)', () => {
    const error = new CanceledError('canceled')
    const normalized = normalizeApiError(error)
    expect(normalized.code).toBe('ERR_CANCELED')
    expect(normalized.message).toBe('canceled')
    expect(normalized.isNetworkError).toBe(false)
    expect(isRequestCanceled(normalized)).toBe(true)
    expect(shouldToastApiError(normalized)).toBe(false)
  })

  it('still toasts real network failures', () => {
    const error = new AxiosError('Network Error')
    error.code = 'ERR_NETWORK'
    expect(isRequestCanceled(error)).toBe(false)
    expect(shouldToastApiError(error)).toBe(true)
  })
})
