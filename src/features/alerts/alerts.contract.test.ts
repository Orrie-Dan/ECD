import { describe, it, expect, vi } from 'vitest'

vi.mock('@/api/generated/endpoints/alerts/alerts', () => ({
  alertsControllerGetFollowUp: vi.fn(),
}))

import { alertsControllerGetFollowUp } from '@/api/generated/endpoints/alerts/alerts'
import { fetchFollowUpAlerts } from '@/api/resources/alerts'

describe('District follow-up alerts (Sprint 5.1 Phase 8)', () => {
  it('fetchFollowUpAlerts calls GET follow-up with scoped filters', async () => {
    vi.mocked(alertsControllerGetFollowUp).mockResolvedValue({
      items: [],
      total: 0,
      counts: {
        nutrition: 0,
        attendance: 0,
        referral: 0,
        data_quality: 0,
        high: 0,
      },
      districtId: null,
      centerId: null,
    })

    await fetchFollowUpAlerts({
      category: 'attendance',
      limit: 50,
      centerId: 'c1',
    })

    expect(alertsControllerGetFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'attendance',
        limit: 50,
        centerId: 'c1',
      }),
    )
  })
})
