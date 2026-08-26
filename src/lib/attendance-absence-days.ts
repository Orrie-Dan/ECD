/** Rolling absence-risk window — must match backend + mock alert rules. */
export const ATTENDANCE_RISK_WINDOW_DAYS = 7

export const ATTENDANCE_ABSENT_THRESHOLD = 3

export function clampAbsentDaysInWindow(
  count: number,
  windowDays = ATTENDANCE_RISK_WINDOW_DAYS,
): number {
  if (!Number.isFinite(count) || count < 0) return 0
  return Math.min(Math.round(count), windowDays)
}

export function parseAbsentDaysFromAlertText(
  text: string,
  windowDays = ATTENDANCE_RISK_WINDOW_DAYS,
): number | null {
  if (!text.trim()) return null

  const absentInWindow = text.match(
    /absent\s+(\d+)\s+days?\s+in\s+the\s+last\s+(\d+)\s+days?/i,
  )
  if (absentInWindow) {
    const absent = Number(absentInWindow[1])
    const window = Number(absentInWindow[2])
    return clampAbsentDaysInWindow(absent, Math.min(window, windowDays))
  }

  const daysInWindow = text.match(/(\d+)\s+days?\s+in\s+the\s+last\s+(\d+)\s+days?/i)
  if (daysInWindow) {
    const absent = Number(daysInWindow[1])
    const window = Number(daysInWindow[2])
    return clampAbsentDaysInWindow(absent, Math.min(window, windowDays))
  }

  return null
}

export function parseAbsentDaysFromMetrics(
  metrics: readonly { label: string; value: string }[] | undefined,
  windowDays = ATTENDANCE_RISK_WINDOW_DAYS,
): number | null {
  if (!metrics?.length) return null
  for (const metric of metrics) {
    if (!/absent/i.test(metric.label)) continue
    const parsed = Number.parseInt(metric.value, 10)
    if (Number.isFinite(parsed)) return clampAbsentDaysInWindow(parsed, windowDays)
  }
  return null
}

function readNumericMeta(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): number | null {
  if (!metadata || typeof metadata !== 'object') return null
  const value = metadata[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** Resolve absent-day count for display — never exceeds the rolling window. */
export function resolveAbsentDaysInWindow(input: {
  description?: string | null
  title?: string | null
  metrics?: readonly { label: string; value: string }[]
  metadata?: Record<string, unknown> | null
  windowDays?: number
}): number {
  const windowDays = input.windowDays ?? ATTENDANCE_RISK_WINDOW_DAYS

  const fromMeta = readNumericMeta(input.metadata, 'absentDays')
  if (fromMeta != null) return clampAbsentDaysInWindow(fromMeta, windowDays)

  const fromMetrics = parseAbsentDaysFromMetrics(input.metrics, windowDays)
  if (fromMetrics != null) return fromMetrics

  const fromDescription = parseAbsentDaysFromAlertText(input.description ?? '', windowDays)
  if (fromDescription != null) return fromDescription

  const fromTitle = parseAbsentDaysFromAlertText(input.title ?? '', windowDays)
  if (fromTitle != null) return fromTitle

  return ATTENDANCE_ABSENT_THRESHOLD
}
