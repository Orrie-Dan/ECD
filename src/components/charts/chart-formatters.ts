/** Hide fractional ticks so count charts stay whole numbers. */
export function formatCountTick(value: number): string {
  if (!Number.isFinite(value)) return ''
  if (Math.abs(value - Math.round(value)) > 0.05) return ''
  return String(Math.round(value))
}

/** Fixed 0–100 domain so school rates are comparable. */
export const PERCENT_DOMAIN: [number, number] = [0, 100]

/** Percent ticks for rate charts (`78%`). */
export function formatPercentTick(value: number): string {
  if (!Number.isFinite(value)) return ''
  return `${Math.round(value)}%`
}
