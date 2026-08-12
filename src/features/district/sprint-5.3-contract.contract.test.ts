import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('@/api/generated/endpoints/nutrition/nutrition', () => ({
  nutritionControllerListScreenings: vi.fn(),
  nutritionControllerGetAlerts: vi.fn(),
  nutritionControllerGetHistory: vi.fn(),
  nutritionControllerGetGrowthChart: vi.fn(),
  nutritionControllerCreateScreening: vi.fn(),
}))

vi.mock('@/api/generated/endpoints/referrals/referrals', () => ({
  referralsControllerFindAll: vi.fn(),
  referralsControllerGetChildHistory: vi.fn(),
  referralsControllerCreate: vi.fn(),
  referralsControllerUpdateStatus: vi.fn(),
}))

import { nutritionControllerListScreenings } from '@/api/generated/endpoints/nutrition/nutrition'
import { referralsControllerFindAll } from '@/api/generated/endpoints/referrals/referrals'
import { fetchNutritionScreeningList } from '@/api/resources/nutrition'
import { fetchReferralList } from '@/api/resources/referrals'

describe('Sprint 5.3 District contract completion', () => {
  it('fetchNutritionScreeningList forwards pagination and server filters', async () => {
    vi.mocked(nutritionControllerListScreenings).mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 25,
      totalPages: 0,
    })

    await fetchNutritionScreeningList({
      centerId: 'c1',
      childId: 'ch1',
      from: '2026-08-01',
      to: '2026-08-31',
      nutritionStatus: 'severe',
      page: 2,
      pageSize: 25,
    })

    expect(nutritionControllerListScreenings).toHaveBeenCalledWith(
      expect.objectContaining({
        centerId: 'c1',
        childId: 'ch1',
        from: '2026-08-01',
        to: '2026-08-31',
        nutritionStatus: 'severe',
        page: 2,
        pageSize: 25,
      }),
    )
  })

  it('Growth LIVE page wires screening list (no unavailable placeholder)', () => {
    const filePath = path.resolve(__dirname, '../../pages/district/GrowthMonitoringPage.tsx')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain('useDistrictNutritionScreenings')
    expect(content).toContain('function GrowthMonitoringPageMock()')
    expect(content).not.toContain('nta paginated screenings list')
  })

  it('fetchReferralList forwards from/to date filters', async () => {
    vi.mocked(referralsControllerFindAll).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    })

    await fetchReferralList({
      from: '2026-08-01',
      to: '2026-08-15',
      status: 'pending',
      page: 1,
      pageSize: 50,
    })

    expect(referralsControllerFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '2026-08-01',
        to: '2026-08-15',
        status: 'pending',
      }),
    )
  })

  it('Referral LIVE page wires date inputs', () => {
    const filePath = path.resolve(__dirname, '../../pages/district/ReferralMonitoringPage.tsx')
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain('fromDate')
    expect(content).toContain('toDate')
    expect(content).toContain('from: fromDate || undefined')
    expect(content).toContain('to: toDate || undefined')
  })

  it('District nutrition hooks do not import DataProvider', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, 'nutrition/queries.ts'),
      'utf8',
    )
    expect(content).not.toMatch(/from ['"]@\/contexts\/AppContext['"]/)
    expect(content).not.toMatch(/import\s*\{[^}]*\buseData\b/)
    expect(content).toContain('fetchNutritionScreeningList')
  })
})
