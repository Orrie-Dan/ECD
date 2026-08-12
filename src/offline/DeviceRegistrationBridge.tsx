import { useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { messages } from '@/locales/rw/common'

export const DEVICE_REGISTRATION_FAILED_EVENT = 'ecd:device-registration-failed'

export type DeviceRegistrationFailureReason = 'network' | 'error'

export function notifyDeviceRegistrationFailed(reason: DeviceRegistrationFailureReason): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(DEVICE_REGISTRATION_FAILED_EVENT, { detail: { reason } }),
  )
}

/**
 * Surfaces device registration failures that otherwise block sync/push with no UI signal.
 * Must render inside ToastProvider.
 */
export function DeviceRegistrationBridge() {
  const { showError } = useToast()

  useEffect(() => {
    const onFailed = (event: Event) => {
      const reason = (event as CustomEvent<{ reason?: DeviceRegistrationFailureReason }>).detail
        ?.reason
      showError(
        reason === 'network'
          ? messages.deviceRegistrationFailed
          : messages.deviceRegistrationFailed,
      )
    }

    window.addEventListener(DEVICE_REGISTRATION_FAILED_EVENT, onFailed)
    return () => window.removeEventListener(DEVICE_REGISTRATION_FAILED_EVENT, onFailed)
  }, [showError])

  return null
}
