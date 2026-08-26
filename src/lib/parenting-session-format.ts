import { caretaker } from '@/locales/rw/caretaker'
import type { ParentingSessionViewModel } from '@/models/parenting-sessions'
import { formatRegisterDate } from '@/lib/register-format'

const copy = caretaker.director.parentingSessions

export function formatAttendeeCount(count: number | null | undefined): string {
  if (count == null || Number.isNaN(count)) return '—'
  return new Intl.NumberFormat('rw-RW').format(count)
}

export function formatSessionDate(date: string): string {
  return formatRegisterDate(date)
}

export function formatFacilitatorLine(session: ParentingSessionViewModel): string {
  if (session.facilitatorRole) {
    return `${session.facilitatorName} · ${session.facilitatorRole}`
  }
  return session.facilitatorName
}

export function parseAttendeeInput(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isInteger(n)) return null
  return n
}

export function validateAttendeeCount(value: string): string | null {
  const n = parseAttendeeInput(value)
  if (n == null) return copy.attendeesRequired
  if (n < 0) return copy.attendeesNegative
  return null
}

export function deriveTotalAttendees(male: string, female: string): number {
  const m = parseAttendeeInput(male) ?? 0
  const f = parseAttendeeInput(female) ?? 0
  if (m < 0 || f < 0) return 0
  return m + f
}
