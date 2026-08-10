/**
 * Typed local persistence failures for caretaker-facing error messages.
 * Callers must not report "saved on device" when these are thrown.
 */

export type LocalWriteErrorCode = 'QUOTA_EXCEEDED' | 'UNAVAILABLE' | 'UNKNOWN'

export class LocalWriteError extends Error {
  readonly code: LocalWriteErrorCode

  constructor(code: LocalWriteErrorCode, message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined)
    this.name = 'LocalWriteError'
    this.code = code
  }
}

export function isLocalWriteError(err: unknown): err is LocalWriteError {
  return err instanceof LocalWriteError
}

function nameOf(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err) {
    return String((err as { name: unknown }).name)
  }
  return ''
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err ?? '')
}

/** Map browser/Dexie storage failures into LocalWriteError. */
export function toLocalWriteError(err: unknown): LocalWriteError {
  if (isLocalWriteError(err)) return err

  const name = nameOf(err)
  const message = messageOf(err)
  const lower = message.toLowerCase()

  if (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    lower.includes('quotaexceeded') ||
    lower.includes('quota exceeded') ||
    lower.includes('storage quota')
  ) {
    return new LocalWriteError(
      'QUOTA_EXCEEDED',
      'IndexedDB storage quota exceeded',
      err,
    )
  }

  if (
    name === 'InvalidStateError' ||
    name === 'UnknownError' ||
    lower.includes('indexeddb') ||
    lower.includes('idbdatabase') ||
    lower.includes('database connection is closing')
  ) {
    return new LocalWriteError('UNAVAILABLE', 'Local storage unavailable', err)
  }

  return new LocalWriteError('UNKNOWN', message || 'Local write failed', err)
}

/** Re-throw err as LocalWriteError (preserves typed LocalWriteError). */
export function rethrowAsLocalWriteError(err: unknown): never {
  throw toLocalWriteError(err)
}
