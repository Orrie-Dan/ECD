import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { queryKeys, queryStaleTimes } from '@/api/query-keys'
import { homePathForRole, hasRole } from '@/api/roles'
import { CENTERS_MAX_PAGE_SIZE } from '@/api/resources/centers'
import { findNcdaNavItem } from '@/layouts/ncda/navigation'

const root = (...parts: string[]) => path.resolve(__dirname, ...parts)

describe('Sprint 5.5E — NCDA centers management contract', () => {
  const app = fs.readFileSync(root('../../App.tsx'), 'utf8')
  const listPage = fs.readFileSync(root('../../pages/ncda/NcdaCentersPage.tsx'), 'utf8')
  const detailPage = fs.readFileSync(root('../../pages/ncda/NcdaCenterDetailPage.tsx'), 'utf8')
  const pages = fs.readFileSync(root('../../pages/ncda/NcdaPages.tsx'), 'utf8')
  const queries = fs.readFileSync(root('./centers/queries.ts'), 'utf8')
  const centersResource = fs.readFileSync(root('../../api/resources/centers.ts'), 'utf8')

  describe('routing + authorization', () => {
    it('registers list and detail under ncda ProtectedRoute', () => {
      expect(app).toContain('allowedRole="ncda"')
      expect(app).toContain('path="/ncda/centers"')
      expect(app).toContain('path="/ncda/centers/:centerId"')
      expect(app).toContain('NcdaCentersPage')
      expect(app).toContain('NcdaCenterDetailPage')
      expect(homePathForRole('ncda')).toBe('/ncda')
      expect(hasRole({ role: 'ncda' }, 'ncda')).toBe(true)
      expect(findNcdaNavItem('/ncda/centers/abc')?.id).toBe('centers')
    })

    it('does not expose NCDA centers routes to district or caregiver roles', () => {
      expect(hasRole({ role: 'districtOfficer' }, 'ncda')).toBe(false)
      expect(hasRole({ role: 'caretaker' }, 'ncda')).toBe(false)
      expect(homePathForRole('districtOfficer')).not.toBe('/ncda')
      expect(homePathForRole('caretaker')).not.toBe('/ncda')
    })
  })

  describe('query namespace', () => {
    it('uses ncda.centers.* keys (not district.centers) with staleTime', () => {
      expect(queryKeys.ncda.centers.all).toEqual(['ncda', 'centers'])
      expect(queryKeys.ncda.centers.list({ page: 1 })[2]).toBe('list')
      expect(queryKeys.ncda.centers.detail('c1')).toEqual(['ncda', 'centers', 'detail', 'c1'])
      expect(queryKeys.ncda.centers.summary('c1', {})[2]).toBe('summary')
      expect(queryKeys.ncda.centers.children('c1', {})[2]).toBe('children')
      expect(queryKeys.ncda.centers.attendance('c1', {})[2]).toBe('attendance')
      expect(queryKeys.ncda.centers.nutrition('c1', {})[2]).toBe('nutrition')
      expect(queryKeys.ncda.centers.feeding('c1', {})[2]).toBe('feeding')
      expect(queryKeys.ncda.centers.referrals('c1', {})[2]).toBe('referrals')
      expect(queryStaleTimes.ncdaCenters).toBe(60_000)
      expect(queries).toContain('queryStaleTimes.ncdaCenters')
      expect(queries).toContain('env.isLive')
      expect(queries).not.toContain('district.keys.centers')
      expect(queries).not.toContain('queryKeys.district.centers')
    })
  })

  describe('server-side data access', () => {
    it('wires list/detail through centers resource with pagination clamp', () => {
      expect(queries).toContain('listCentersPage')
      expect(queries).toContain('getCenterDetail')
      expect(queries).toContain('fetchCentersTotal')
      expect(queries).toContain('fetchMonitoringDashboard')
      expect(queries).toContain('fetchChildrenList')
      expect(queries).toContain('fetchAttendanceList')
      expect(queries).toContain('fetchNutritionScreeningList')
      expect(queries).toContain('fetchFeedingDayList')
      expect(queries).toContain('fetchReferralList')
      expect(centersResource).toContain('centersControllerFindAll')
      expect(centersResource).toContain('centersControllerFindOne')
      expect(centersResource).toContain('clampPageSize')
      expect(CENTERS_MAX_PAGE_SIZE).toBe(100)
    })

    it('passes server filters for search, district, status, and pagination', () => {
      expect(listPage).toContain('debouncedSearch')
      expect(listPage).toContain('districtId')
      expect(listPage).toContain('status')
      expect(listPage).toContain('Pagination')
      expect(centersResource).toContain('districtId: filters.districtId')
      expect(centersResource).toContain('status: filters.status')
      expect(centersResource).toContain('search: filters.search')
      expect(centersResource).toContain('page: filters.page')
    })

    it('scopes operational drilldowns with centerId (no national bulk)', () => {
      expect(queries).toContain('centerId: id')
      expect(detailPage).toContain('useNcdaCenterChildren')
      expect(detailPage).toContain('useNcdaCenterAttendance')
      expect(detailPage).toContain('useNcdaCenterNutrition')
      expect(detailPage).toContain('useNcdaCenterFeeding')
      expect(detailPage).toContain('useNcdaCenterReferrals')
      expect(listPage).not.toMatch(/listCentersDirectory\(|loadCenters\(['"]all['"]\)/)
      expect(detailPage).not.toMatch(/loadCenters\(['"]all['"]\)/)
      expect(queries).not.toMatch(/for\s*\(.*center/)
      expect(queries).not.toContain('fetchAllAttendance')
      expect(queries).not.toContain('fetchAllReferrals')
    })
  })

  describe('detail sections + unavailable contracts', () => {
    it('shows identity fields and marks unsupported sections unavailable', () => {
      expect(detailPage).toContain('identityTitle')
      expect(detailPage).toContain('provinceName')
      expect(detailPage).toContain('sectionUnavailable')
      expect(detailPage).toContain("section === 'sted'")
      expect(detailPage).toContain("section === 'compliance'")
      expect(detailPage).toContain("section === 'wash'")
    })

    it('handles missing center with retry', () => {
      expect(detailPage).toContain('notFound')
      expect(detailPage).toContain('detail.refetch')
      expect(listPage).toContain('list.refetch')
    })
  })

  describe('LIVE isolation + UX states', () => {
    it('centers pages are real surfaces and avoid LocalStore/mock leakage', () => {
      expect(listPage).not.toContain('NcdaComingSoonPage')
      expect(detailPage).not.toContain('NcdaComingSoonPage')
      expect(pages).toContain("export { NcdaCentersPage } from './NcdaCentersPage'")
      expect(pages).toContain("export { NcdaCenterDetailPage } from './NcdaCenterDetailPage'")
      expect(listPage).toContain('LiveUnavailableState')
      expect(detailPage).toContain('LiveUnavailableState')
      expect(listPage).toContain('emptyFiltered')
      expect(listPage).not.toMatch(/\buseData\(|LocalStore|SyncEngine|MOCK_DATA/)
      expect(detailPage).not.toMatch(/\buseData\(|LocalStore|SyncEngine|MOCK_DATA/)
      expect(listPage).not.toMatch(/from ['"]@\/pages\/district/)
      expect(detailPage).not.toMatch(/from ['"]@\/pages\/district/)
      expect(listPage).not.toMatch(/if\s*\(!.*\)\s*return\s+MOCK/)
      expect(detailPage).not.toMatch(/if\s*\(!.*\)\s*return\s+MOCK/)
    })

    it('does not implement fake create/status toggle mutations', () => {
      expect(listPage).not.toContain('centersControllerUpdate')
      expect(detailPage).not.toContain('centersControllerUpdate')
      expect(queries).not.toContain('centersControllerUpdate')
      expect(queries).not.toContain('createCenter')
    })
  })
})
