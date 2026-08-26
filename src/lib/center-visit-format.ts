import type { CenterVisitViewModel } from '@/models/center-visits'

export function formatVisitAffiliation(record: CenterVisitViewModel): string {
  const org = record.organization?.trim()
  const role = record.occupationOrRole?.trim()
  if (org && role) return `${org} · ${role}`
  return org || role || '—'
}

export function formatVisitDate(date: string): string {
  if (!date) return '—'
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  return new Intl.DateTimeFormat('rw-RW', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
}
