import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/generated/endpoints/geo/geo', () => ({
  geoControllerListDistricts: vi.fn(),
  geoControllerListAdminUnits: vi.fn(),
}))

import {
  geoControllerListAdminUnits,
  geoControllerListDistricts,
} from '@/api/generated/endpoints/geo/geo'
import { resolveHomeVillageId } from '@/api/resources/children'

describe('resolveHomeVillageId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves via parent chain without districtId on cell/village (LIVE rows are null)', async () => {
    vi.mocked(geoControllerListDistricts).mockResolvedValue({
      items: [{ id: 'dist-1', name: 'Nyarugenge' }],
      total: 1,
      page: 1,
      pageSize: 50,
    } as never)

    vi.mocked(geoControllerListAdminUnits).mockImplementation(async (params) => {
      if (params?.level === 'sector') {
        expect(params.districtId).toBe('dist-1')
        return [{ id: 'sec-1', name: 'Kimisagara' }] as never
      }
      if (params?.level === 'cell') {
        // Regression: districtId must not be sent — production cells have districtId=null.
        expect(params.districtId).toBeUndefined()
        expect(params.parentId).toBe('sec-1')
        return [{ id: 'cell-1', name: 'Kamuhoza' }] as never
      }
      if (params?.level === 'village') {
        expect(params.districtId).toBeUndefined()
        expect(params.parentId).toBe('cell-1')
        return [{ id: 'vil-1', name: 'Kigabiro' }] as never
      }
      return [] as never
    })

    const id = await resolveHomeVillageId({
      district: 'Nyarugenge',
      sector: 'Kimisagara',
      cell: 'Kamuhoza',
      village: 'Kigabiro',
    })
    expect(id).toBe('vil-1')
    expect(geoControllerListAdminUnits).toHaveBeenCalledTimes(3)
  })

  it('fails at cell when parent has no matching cell name', async () => {
    vi.mocked(geoControllerListDistricts).mockResolvedValue({
      items: [{ id: 'dist-1', name: 'Nyarugenge' }],
      total: 1,
      page: 1,
      pageSize: 50,
    } as never)
    vi.mocked(geoControllerListAdminUnits).mockImplementation(async (params) => {
      if (params?.level === 'sector') return [{ id: 'sec-1', name: 'Kigali' }] as never
      if (params?.level === 'cell') return [{ id: 'cell-1', name: 'Mwendo' }] as never
      return [] as never
    })

    await expect(
      resolveHomeVillageId({
        district: 'Nyarugenge',
        sector: 'Kigali',
        cell: 'MissingCell',
        village: 'X',
      }),
    ).rejects.toThrow('Cell not found: MissingCell')
  })
})
