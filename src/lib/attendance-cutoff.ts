import { shiftIsoDate } from '@/lib/attendance-utils'

/** Default end-of-day cutoff when district settings are unavailable (HH:mm, local). */
export const DEFAULT_ATTENDANCE_CUTOFF_TIME = '16:00'

/** How many prior calendar days to catch up when auto-absent was missed (excluding today). */
export const AUTO_ABSENT_LOOKBACK_DAYS = 1

function isoDateFrom(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function parseCutoffTime(cutoff: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(cutoff.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return { hours, minutes }
}

/** True when the calendar day has passed its attendance cutoff (local time). */
export function isDatePastAttendanceCutoff(
  date: string,
  now = new Date(),
  cutoff = DEFAULT_ATTENDANCE_CUTOFF_TIME,
): boolean {
  const today = isoDateFrom(now)
  if (date > today) return false
  if (date < today) return true

  const parsed = parseCutoffTime(cutoff)
  if (!parsed) return false

  const cutoffAt = new Date(now)
  cutoffAt.setHours(parsed.hours, parsed.minutes, 0, 0)
  return now.getTime() >= cutoffAt.getTime()
}

/** Dates within lookback that are ready for automatic absent marking. */
export function datesReadyForAutoAbsent(
  now = new Date(),
  cutoff = DEFAULT_ATTENDANCE_CUTOFF_TIME,
  lookbackDays = AUTO_ABSENT_LOOKBACK_DAYS,
): string[] {
  const today = isoDateFrom(now)
  const minDate = shiftIsoDate(today, -lookbackDays)
  const dates: string[] = []

  for (let date = minDate; date <= today; date = shiftIsoDate(date, 1)) {
    if (isDatePastAttendanceCutoff(date, now, cutoff)) {
      dates.push(date)
    }
  }

  return dates
}

export function attendanceAutoAbsentMetaKey(centerId: string, date: string): string {
  return `attendanceAutoAbsent:${centerId}:${date}`
}
