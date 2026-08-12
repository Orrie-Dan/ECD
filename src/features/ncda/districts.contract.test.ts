import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { queryKeys, queryStaleTimes } from '@/api/query-keys'
import { homePathForRole, hasRole } from '@/api/roles'
import { GEO_MAX_PAGE_SIZE } from '@/api/resources/geo'
import { findNcdaNavItem } from '@/layouts/ncda/navigation'

const root = (...parts: string[]) => path.resolve(__dirname, ...parts)

describe('Sprint 5.5D — NCDA district management contract', () => {
  const app = fs.readFileSync(root('../../App.tsx'), 'utf8')
  const listPage = fs.readFileSync(root('../../pages/ncda/NcdaDistrictsPage.tsx'), 'utf8')
  const detailPage = fs.readFileSync(root('../../pages/ncda/NcdaDistrictDetailPage.tsx'), 'utf8')
  const pages = fs.readFileSync(root('../../pages/ncda/NcdaPages.tsx'), 'utf8')
  const queries = fs.readFileSync(root('./districts/queries.ts'), 'utf8')
  const geoResource = fs.readFileSync(root('../../api/resources/geo.ts'), 'utf8')

  describe('routing + authorization', () => {
    it('registers list and detail under ncda ProtectedRoute', () => {
      expect(app).toContain('allowedRole="ncda"')
      expect(app).toContain('path="/ncda/districts"')
      expect(app).toContain('path="/ncda/districts/:districtId"')
      expect(app).toContain('NcdaDistrictsPage')
      expect(app).toContain('NcdaDistrictDetailPage')
      expect(homePathForRole('ncda')).toBe('/ncda')
      expect(hasRole({ role: 'ncda' }, 'ncda')).toBe(true)
      expect(findNcdaNavItem('/ncda/districts/abc')?.id).toBe('districts')
    })
  })

  describe('query namespace', () => {
    it('uses ncda.districts.* keys with staleTime', () => {
      expect(queryKeys.ncda.districts.all).toEqual(['ncda', 'districts'])
      expect(queryKeys.ncda.districts.list({ page: 1 })[2]).toBe('list')
      expect(queryKeys.ncda.districts.detail('d1')).toEqual(['ncda', 'districts', 'detail', 'd1'])
      expect(queryKeys.ncda.districts.summary('d1', {})[2]).toBe('summary')
      expect(queryKeys.ncda.districts.centers('d1', {})[2]).toBe('centers')
      expect(queryStaleTimes.ncdaDistricts).toBe(60_000)
      expect(queries).toContain('queryStaleTimes.ncdaDistricts')
      expect(queries).toContain('env.isLive')
    })
  })

  describe('server-side data access', () => {
    it('wires list/detail/summary/centers through geo + aggregate resources', () => {
      expect(queries).toContain('listDistrictsPage')
      expect(queries).toContain('getDistrict')
      expect(queries).toContain('listCentersByDistrictPage')
      expect(queries).toContain('fetchMonitoringDashboard')
      expect(queries).toContain('fetchDistrictReport')
      expect(queries).toContain('fetchCentersTotal')
      expect(queries).toContain('fetchDistrictsTotal')
      expect(geoResource).toContain('geoControllerListDistricts')
      expect(geoResource).toContain('geoControllerGetDistrict')
      expect(geoResource).toContain('centersControllerFindAll')
      expect(geoResource).toContain('districtId: filters.districtId')
      expect(geoResource).toContain('clampPageSize')
      expect(GEO_MAX_PAGE_SIZE).toBe(100)
    })

    it('does not hydrate national centers/children for list stats', () => {
      expect(listPage).not.toMatch(/listCentersDirectory|fetchCentersReport|useCentersDirectory/)
      expect(listPage).not.toMatch(/fetchMonitoringAttendance|fetchMonitoringSted/)
      expect(queries).not.toMatch(/for\s*\(.*district/)
      expect(detailPage).toContain('districtId')
      expect(detailPage).toContain('useNcdaDistrictCenters')
    })
  })

  describe('LIVE isolation + UX states', () => {
    it('district pages are real surfaces (not Coming Soon) and avoid LocalStore/mock leakage', () => {
      expect(listPage).not.toContain('NcdaComingSoonPage')
      expect(detailPage).not.toContain('NcdaComingSoonPage')
      expect(pages).toContain("export { NcdaDistrictsPage } from './NcdaDistrictsPage'")
      expect(pages).toContain("export { NcdaDistrictDetailPage } from './NcdaDistrictDetailPage'")
      expect(listPage).toContain('LiveUnavailableState')
      expect(detailPage).toContain('LiveUnavailableState')
      expect(listPage).toContain('Pagination')
      expect(detailPage).toContain('Pagination')
      expect(listPage).toContain('list.refetch')
      expect(detailPage).toContain('detail.refetch')
      expect(listPage).not.toMatch(/\buseData\(|LocalStore|SyncEngine|MOCK_DATA/)
      expect(detailPage).not.toMatch(/\buseData\(|LocalStore|SyncEngine|MOCK_DATA/)
      expect(listPage).not.toMatch(/from ['"]@\/pages\/district/)
      expect(detailPage).not.toMatch(/from ['"]@\/pages\/district/)
    })
  })
})
