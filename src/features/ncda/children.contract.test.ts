import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { queryKeys, queryStaleTimes } from '@/api/query-keys'
import { homePathForRole, hasRole } from '@/api/roles'
import { findNcdaNavItem } from '@/layouts/ncda/navigation'

const root = (...parts: string[]) => path.resolve(__dirname, ...parts)

describe('Sprint 5.5F — NCDA children management contract', () => {
  const app = fs.readFileSync(root('../../App.tsx'), 'utf8')
  const listPage = fs.readFileSync(root('../../pages/ncda/NcdaChildrenPage.tsx'), 'utf8')
  const detailPage = fs.readFileSync(root('../../pages/ncda/NcdaChildDetailPage.tsx'), 'utf8')
  const pages = fs.readFileSync(root('../../pages/ncda/NcdaPages.tsx'), 'utf8')
  const queries = fs.readFileSync(root('./children/queries.ts'), 'utf8')
  const childrenResource = fs.readFileSync(root('../../api/resources/children.ts'), 'utf8')
  const listParams = fs.readFileSync(
    root('../../api/generated/models/childrenControllerFindAllParams.ts'),
    'utf8',
  )

  describe('routing + authorization', () => {
    it('registers list and detail under ncda ProtectedRoute', () => {
      expect(app).toContain('allowedRole="ncda"')
      expect(app).toContain('path="/ncda/children"')
      expect(app).toContain('path="/ncda/children/:childId"')
      expect(app).toContain('NcdaChildrenPage')
      expect(app).toContain('NcdaChildDetailPage')
      expect(homePathForRole('ncda')).toBe('/ncda')
      expect(hasRole({ role: 'ncda' }, 'ncda')).toBe(true)
      expect(findNcdaNavItem('/ncda/children/abc')?.id).toBe('children')
    })

    it('does not expose NCDA children routes to district or caregiver roles', () => {
      expect(hasRole({ role: 'districtOfficer' }, 'ncda')).toBe(false)
      expect(hasRole({ role: 'caretaker' }, 'ncda')).toBe(false)
    })
  })

  describe('query namespace', () => {
    it('uses ncda.children.* keys with staleTime', () => {
      expect(queryKeys.ncda.children.all).toEqual(['ncda', 'children'])
      expect(queryKeys.ncda.children.list({ page: 1 })[2]).toBe('list')
      expect(queryKeys.ncda.children.detail('c1')).toEqual(['ncda', 'children', 'detail', 'c1'])
      expect(queryKeys.ncda.children.attendance('c1', {})[2]).toBe('attendance')
      expect(queryKeys.ncda.children.nutrition('c1', {})[2]).toBe('nutrition')
      expect(queryKeys.ncda.children.sted('c1', {})[2]).toBe('sted')
      expect(queryKeys.ncda.children.referrals('c1', {})[2]).toBe('referrals')
      expect(queryStaleTimes.ncdaChildren).toBe(60_000)
      expect(queries).toContain('queryStaleTimes.ncdaChildren')
      expect(queries).toContain('env.isLive')
      expect(queries).not.toContain('queryKeys.district.children')
    })
  })

  describe('server-side data access', () => {
    it('wires list through children resource with districtId + pagination clamp', () => {
      expect(queries).toContain('fetchChildrenList')
      expect(queries).toContain('fetchChildrenTotal')
      expect(queries).toContain('fetchChildDetail')
      expect(queries).toContain('listCentersByDistrictPage')
      expect(childrenResource).toContain('districtId: filters.districtId')
      expect(childrenResource).toContain('Math.min(Math.max(1, filters.pageSize ?? 20), 100)')
      expect(listParams).toContain('districtId?: string')
    })

    it('passes server filters for search, district, center, status', () => {
      expect(listPage).toContain('debouncedSearch')
      expect(listPage).toContain('districtId')
      expect(listPage).toContain('centerId')
      expect(listPage).toContain('status')
      expect(listPage).toContain('Pagination')
      expect(listPage).toContain('centerNeedsDistrict')
    })

    it('scopes operational histories with childId (no national bulk)', () => {
      expect(queries).toContain('childId: id')
      expect(queries).toContain('fetchAttendanceList')
      expect(queries).toContain('fetchNutritionScreeningList')
      expect(queries).toContain('fetchChildStedHistory')
      expect(queries).toContain('fetchReferralList')
      expect(detailPage).toContain('useNcdaChildAttendance')
      expect(detailPage).toContain('useNcdaChildNutrition')
      expect(detailPage).toContain('useNcdaChildSted')
      expect(detailPage).not.toContain('useNcdaChildReferrals')
      expect(listPage).not.toMatch(/loadChildren\(['"]all['"]\)/)
      expect(detailPage).not.toMatch(/loadChildren\(['"]all['"]\)/)
      expect(queries).not.toContain('fetchAllAttendance')
      expect(queries).not.toContain('fetchAllReferrals')
      expect(queries).not.toContain('fetchStedRoster')
      expect(queries).not.toMatch(/for\s*\(.*child/)
    })
  })

  describe('detail sections + unavailable contracts', () => {
    it('shows profile and marks feeding unavailable', () => {
      expect(detailPage).toContain('identityTitle')
      expect(detailPage).toContain('sectionUnavailable')
      expect(detailPage).toContain("section === 'feeding'")
      expect(detailPage).not.toContain("section === 'transfers'")
      expect(detailPage).toContain('notFound')
      expect(detailPage).toContain('detail.refetch')
    })
  })

  describe('LIVE isolation + UX states', () => {
    it('children pages are real surfaces and avoid LocalStore/mock leakage', () => {
      expect(listPage).not.toContain('NcdaComingSoonPage')
      expect(detailPage).not.toContain('NcdaComingSoonPage')
      expect(pages).toContain("export { NcdaChildrenPage } from './NcdaChildrenPage'")
      expect(pages).toContain("export { NcdaChildDetailPage } from './NcdaChildDetailPage'")
      expect(listPage).toContain('LiveUnavailableState')
      expect(detailPage).toContain('LiveUnavailableState')
      expect(listPage).toContain('emptyFiltered')
      expect(listPage).toContain('list.refetch')
      expect(listPage).not.toMatch(/\buseData\(|LocalStore|SyncEngine|MOCK_DATA/)
      expect(detailPage).not.toMatch(/\buseData\(|LocalStore|SyncEngine|MOCK_DATA/)
      expect(listPage).not.toMatch(/from ['"]@\/pages\/district/)
      expect(detailPage).not.toMatch(/from ['"]@\/pages\/district/)
      expect(listPage).not.toMatch(/if\s*\(!.*\)\s*return\s+MOCK/)
    })

    it('does not implement child mutation UI in this sprint', () => {
      expect(listPage).not.toContain('createChildRequest')
      expect(detailPage).not.toContain('archiveChildRequest')
      expect(detailPage).not.toContain('updateChildRequest')
      expect(queries).not.toContain('createChildRequest')
      expect(queries).not.toContain('archiveChildRequest')
    })
  })
})
