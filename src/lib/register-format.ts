/**
 * Shared formatting for director ECD book registers (Sections VIII–XIV).
 */
export function formatRegisterDate(date: string | null | undefined): string {
  if (!date?.trim()) return '—'
  const trimmed = date.trim()
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const y = Number(iso[1])
    const m = Number(iso[2])
    const d = Number(iso[3])
    if (y && m && d) {
      return new Intl.DateTimeFormat('rw-RW', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(y, m - 1, d))
    }
  }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return trimmed
  return new Intl.DateTimeFormat('rw-RW', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

export function formatRegisterCount(count: number | null | undefined): string {
  if (count == null || Number.isNaN(count)) return '—'
  return new Intl.NumberFormat('rw-RW').format(count)
}

export function formatRegisterPercent(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return '—'
  return `${new Intl.NumberFormat('rw-RW', { maximumFractionDigits: 0 }).format(rate)}%`
}

/** Pick the row with the latest ISO date field. */
export function pickLatestByDate<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
): T | null {
  if (items.length === 0) return null
  return items.reduce<T | null>((latest, item) => {
    const date = getDate(item)?.trim()
    if (!date) return latest
    if (!latest) return item
    const latestDate = getDate(latest)?.trim() ?? ''
    return date > latestDate ? item : latest
  }, null)
}
