import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '@/api/client'
import {
  fetchCenterTransferHistory,
  fetchChildTransferHistory,
} from '@/api/resources/transfers'
import { TransferStatus } from '@/api/generated/models/transferStatus'

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe('transfers resource', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
  })

  it('fetchChildTransferHistory maps paginated response', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        childId: 'child-1',
        items: [{ id: 't1' }],
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      },
    })

    const result = await fetchChildTransferHistory('child-1', { page: 1, pageSize: 50 })
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/children/child-1/transfer-history',
      { params: { page: 1, pageSize: 50 } },
    )
    expect(result).toEqual({
      childId: 'child-1',
      items: [{ id: 't1' }],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    })
  })

  it('fetchCenterTransferHistory passes direction and status', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        centerId: 'center-1',
        items: [{ id: 't1', direction: 'incoming' }],
        total: 3,
        page: 2,
        pageSize: 10,
        totalPages: 1,
      },
    })

    const result = await fetchCenterTransferHistory('center-1', {
      page: 2,
      pageSize: 10,
      direction: 'incoming',
      status: TransferStatus.accepted,
    })

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/centers/center-1/transfer-history',
      {
        params: {
          page: 2,
          pageSize: 10,
          status: TransferStatus.accepted,
          direction: 'incoming',
        },
      },
    )
    expect(result.centerId).toBe('center-1')
    expect(result.items[0]?.direction).toBe('incoming')
    expect(result.total).toBe(3)
  })

  it('fetchCenterTransferHistory omits empty optional filters', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { centerId: 'center-1', items: [], total: 0 },
    })

    await fetchCenterTransferHistory('center-1', { page: 1, pageSize: 20 })

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/centers/center-1/transfer-history',
      { params: { page: 1, pageSize: 20 } },
    )
  })
})
