import { describe, expect, it } from 'vitest'
import {
  bandFromStedCoverage,
  getDistrictPerformanceBand,
  stedCoverageFromCounts,
} from './performance-band'
import { previousMonitoringDates, percentagePointChange, relativeChange } from './previous-period'
import {
  buildAttentionItems,
  buildDistrictRisks,
  buildNationalKpis,
  selectPriorityDistricts,
} from './build-overview-view'
import type { MonitoringStedViewModel } from '@/models/monitoring'

describe('getDistrictPerformanceBand', () => {
  it('ranks inactive districts as critical', () => {
    expect(getDistrictPerformanceBand({ isActive: false, stedCoverage: 0.95 })).toEqual({
      severity: 'critical',
      reason: 'inactive',
    })
  })

  it('classifies STED coverage with documented thresholds', () => {
    expect(bandFromStedCoverage(0.7)).toBe('normal')
    expect(bandFromStedCoverage(0.5)).toBe('watch')
    expect(bandFromStedCoverage(0.3)).toBe('concern')
    expect(bandFromStedCoverage(0.29)).toBe('critical')
    expect(bandFromStedCoverage(null)).toBeNull()
  })

  it('computes coverage only when childrenAssessed is positive', () => {
    expect(stedCoverageFromCounts(10, 20)).toBe(0.5)
    expect(stedCoverageFromCounts(10, 0)).toBeNull()
    expect(stedCoverageFromCounts(10, null)).toBeNull()
  })
})

describe('previousMonitoringDates', () => {
  it('shifts a calendar month to the previous UTC month', () => {
    const range = {
      period: 'month' as const,
      monthKey: '',
      year: 2026,
      timeLabel: 'Uku Kwezi',
      isMonthDrillDown: false,
      granularity: 'week' as const,
      hasData: true,
    }
    const dates = previousMonitoringDates(range, new Date('2026-09-15T12:00:00.000Z'))
    expect(dates.from).toBe('2026-08-01T00:00:00.000Z')
    expect(dates.to).toBe('2026-08-31T23:59:59.999Z')
  })
})

describe('comparison helpers', () => {
  it('uses percentage points for 0–100 rates', () => {
    expect(percentagePointChange(87.4, 86.1)).toBeCloseTo(1.3, 5)
  })

  it('does not invent a relative change from a zero baseline', () => {
    expect(relativeChange(12, 0)).toBeUndefined()
    expect(relativeChange(0, 0)).toBe(0)
  })
})

describe('buildNationalKpis', () => {
  it('does not substitute fake values when a metric is missing', () => {
    const kpis = buildNationalKpis({
      childrenPresent: false,
      activeCentersPresent: true,
      activeCenters: 12,
      attendancePresent: true,
      attendanceRate: null,
      compliancePresent: false,
    })
    expect(kpis.find((k) => k.key === 'children')?.value).toBeNull()
    expect(kpis.find((k) => k.key === 'children')?.status).toBe('unavailable')
    expect(kpis.find((k) => k.key === 'activeCenters')?.value).toBe('12')
    expect(kpis.find((k) => k.key === 'attendance')?.status).toBe('unavailable')
    expect(kpis.find((k) => k.key === 'compliantCenters')?.status).toBe('unavailable')
  })

  it('treats a live zero as zero, not unavailable', () => {
    const kpis = buildNationalKpis({
      childrenActive: 0,
      childrenPresent: true,
      activeCenters: 0,
      activeCentersPresent: true,
      attendanceRate: 0,
      attendancePresent: true,
      compliancePresent: false,
    })
    expect(kpis.find((k) => k.key === 'children')?.status).toBe('zero')
    expect(kpis.find((k) => k.key === 'children')?.value).toBe('0')
  })
})

describe('priority districts', () => {
  const sted = {
    items: [
      {
        districtId: 'nyamagabe',
        districtName: 'Nyamagabe',
        assessmentsCompleted: 10,
        childrenAssessed: 50,
        averageScore: null,
      },
      {
        districtId: 'gasabo',
        districtName: 'Gasabo',
        assessmentsCompleted: 40,
        childrenAssessed: 50,
        averageScore: null,
      },
    ],
  } as MonitoringStedViewModel

  it('orders by severity then lowest coverage and skips healthy districts', () => {
    const risks = buildDistrictRisks(
      [
        { id: 'gasabo', name: 'Gasabo', isActive: true },
        { id: 'nyamagabe', name: 'Nyamagabe', isActive: true },
        { id: 'rusizi', name: 'Rusizi', isActive: false },
      ],
      sted,
    )
    const priority = selectPriorityDistricts(risks, 'overall')
    expect(priority[0]?.districtName).toBe('Rusizi')
    expect(priority[1]?.districtName).toBe('Nyamagabe')
    expect(priority.some((row) => row.districtName === 'Gasabo')).toBe(false)
  })
})

describe('attention items', () => {
  it('omits categories without a live contract', () => {
    const items = buildAttentionItems({
      nonCompliantPresent: false,
      nutritionSevere: 3,
      nutritionPresent: true,
      inactivePresent: false,
    })
    expect(items).toHaveLength(1)
    expect(items[0]?.key).toBe('nutrition')
    expect(items[0]?.value).toBe(3)
  })

  it('does not surface zero-count attention cards', () => {
    const items = buildAttentionItems({
      nonCompliantPresent: true,
      nonCompliant: 0,
      nutritionSevere: 4,
      nutritionPresent: true,
      inactiveDistricts: 0,
      inactivePresent: true,
    })
    expect(items.map((item) => item.key)).toEqual(['nutrition'])
  })
})
