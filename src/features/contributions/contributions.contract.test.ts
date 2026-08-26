import { describe, it, expect } from 'vitest'
import { monthRange, formatCashAmount, formatContributionType } from '@/lib/contribution-format'
import { mapParentContributionSummaryToViewModel } from '@/api/mappers/contributions.mapper'

describe('FE-2 — parent contributions helpers', () => {
  it('builds inclusive month date bounds for API from/to', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthRange('2026-03')).toEqual({ from: '2026-03-01', to: '2026-03-31' })
  })

  it('formats cash and type labels from locale', () => {
    expect(formatContributionType('cash')).toBeTruthy()
    expect(formatContributionType('in_kind')).toBeTruthy()
    expect(formatCashAmount(5000)).toContain('5')
    expect(formatCashAmount(null)).toBe('—')
  })

  it('maps summary DTO without inventing list-derived totals', () => {
    const summary = mapParentContributionSummaryToViewModel({
      centerId: 'c1',
      from: '2026-03-01',
      to: '2026-03-31',
      cashContributorCount: 4,
      cashAmountTotal: 25000,
      inKindContributorCount: 3,
      cashRecordCount: 5,
      inKindRecordCount: 3,
    })
    expect(summary.cashContributorCount).toBe(4)
    expect(summary.cashAmountTotal).toBe(25000)
    expect(summary.inKindContributorCount).toBe(3)
  })
})
