import { caretaker } from '@/locales/rw/caretaker'
import type {
  CenterSupportCategory,
  CenterSupportViewModel,
} from '@/models/center-support'
import { CENTER_SUPPORT_CATEGORIES } from '@/models/center-support'

const copy = caretaker.director.support

export function formatSupportCategory(category: CenterSupportCategory): string {
  return copy.categories[category] ?? category
}

export function formatSupportQuantity(
  quantity: number | null | undefined,
  unit: string | null | undefined,
): string {
  if (quantity == null || Number.isNaN(quantity)) return '—'
  const amount = new Intl.NumberFormat('rw-RW', { maximumFractionDigits: 3 }).format(
    quantity,
  )
  return unit?.trim() ? `${amount} ${unit.trim()}` : amount
}

export function formatSupportProvider(record: CenterSupportViewModel): string {
  if (record.providerOrganization?.trim()) {
    return `${record.providerName} · ${record.providerOrganization.trim()}`
  }
  return record.providerName
}

export function formatReceivedBy(record: CenterSupportViewModel): string {
  const name = record.receivedByName?.trim()
  return name || '—'
}

export function validateSupportQuantity(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (!/^\d+(\.\d{1,3})?$/.test(trimmed)) return copy.quantityInvalid
  const n = Number(trimmed)
  if (Number.isNaN(n) || n < 0) return copy.quantityInvalid
  return null
}

export function parseSupportQuantity(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  return Number(trimmed)
}

export { CENTER_SUPPORT_CATEGORIES }
