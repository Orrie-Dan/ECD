import { caretaker } from '@/locales/rw/caretaker'

const copy = caretaker.director.trainings

export function formatTrainingDuration(days: number | null | undefined): string {
  if (days == null || Number.isNaN(days) || days < 1) return '—'
  if (days === 1) return copy.durationOne
  return copy.durationMany.replace('{n}', String(days))
}

export function formatCertificateStatus(received: boolean): string {
  return received ? copy.certificateYes : copy.certificateNo
}

export function validateDurationDays(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed === '') return copy.durationRequired
  if (!/^\d+$/.test(trimmed)) return copy.durationInvalid
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n < 1 || n > 365) return copy.durationInvalid
  return null
}

export function parseDurationDays(value: string): number {
  return Number(value.trim())
}
