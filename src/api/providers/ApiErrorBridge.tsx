import { useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'
import { setGlobalApiErrorHandler } from '@/api/query-client'
import { setApiSessionListeners } from '@/api/interceptors'
import { useApiAuth } from '@/api/auth/ApiAuthProvider'
import { formatApiErrorMessage, shouldToastApiError } from '@/api/errors'
import { env } from '@/config/env'

/**
 * Bridges infrastructure errors to the existing Toast UI.
 * Mount inside ToastProvider. Does not alter page/feature logic.
 *
 * Handles (via normalizeApiError flags):
 * unauthorized (suppressed — session flow), forbidden, validation,
 * conflict/version, not found, network, server.
 */
export function ApiErrorBridge() {
  const { showError } = useToast()
  const { lastError, clearLastError } = useApiAuth()
  const lastToasted = useRef<string | null>(null)

  useEffect(() => {
    if (env.isMock) return

    setGlobalApiErrorHandler((error) => {
      if (!shouldToastApiError(error)) return
      showError(formatApiErrorMessage(error))
    })

    setApiSessionListeners({
      onApiError: (error) => {
        if (!shouldToastApiError(error)) return
        showError(formatApiErrorMessage(error))
      },
    })

    return () => {
      setGlobalApiErrorHandler(null)
      setApiSessionListeners({ onApiError: null })
    }
  }, [showError])

  useEffect(() => {
    if (env.isMock || !lastError) return
    if (!shouldToastApiError(lastError)) {
      clearLastError()
      return
    }
    const message = formatApiErrorMessage(lastError)
    const key = `${lastError.statusCode}:${message}`
    if (lastToasted.current === key) return
    lastToasted.current = key
    showError(message)
    clearLastError()
  }, [lastError, showError, clearLastError])

  return null
}
