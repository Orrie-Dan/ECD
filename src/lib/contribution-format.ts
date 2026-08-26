import { caretaker } from '@/locales/rw/caretaker'
import type {
  InKindItemType,
  ParentContributionType,
  ParentContributionViewModel,
} from '@/models/contributions'

const copy = caretaker.director.contributions

export function formatContributionType(type: ParentContributionType): string {
  return type === 'cash' ? copy.typeCash : copy.typeInKind
}

export function formatInKindItem(itemType: InKindItemType | null): string {
  if (!itemType) return '—'
  return copy.itemTypes[itemType] ?? itemType
}

export function formatCashAmount(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—'
  return `${new Intl.NumberFormat('rw-RW').format(amount)} RWF`
}

export function formatContributionDetail(record: ParentContributionViewModel): string {
  if (record.contributionType === 'cash') {
    return formatCashAmount(record.amount)
  }
  const parts = [formatInKindItem(record.itemType)]
  if (record.quantity != null) {
    parts.push(
      record.unit ? `${record.quantity} ${record.unit}` : String(record.quantity),
    )
  }
  return parts.filter(Boolean).join(' · ')
}

/** Inclusive month bounds as YYYY-MM-DD for API from/to filters. */
export function monthRange(yearMonth: string): { from: string; to: string } {
  const [y, m] = yearMonth.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const month = String(m).padStart(2, '0')
  return {
    from: `${y}-${month}-01`,
    to: `${y}-${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
