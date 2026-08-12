import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { queryKeys, queryStaleTimes } from '@/api/query-keys'
import { homePathForRole, hasRole } from '@/api/roles'
import { DISTRICT_CREATABLE_ROLES } from '@/api/resources/users'

const root = (...parts: string[]) => path.resolve(__dirname, ...parts)

describe('Sprint 5.5J — District caregiver governance contract', () => {
  const app = fs.readFileSync(root('../../App.tsx'), 'utf8')
  const caregiversPage = fs.readFileSync(root('../../pages/district/DistrictCaregiversPage.tsx'), 'utf8')
  const caregiverDetailPage = fs.readFileSync(
    root('../../pages/district/DistrictCaregiverDetailPage.tsx'),
    'utf8',
  )
  const centerDetailPage = fs.readFileSync(root('../../pages/district/CenterDetailPage.tsx'), 'utf8')
  const districtQueries = fs.readFileSync(root('./users/queries.ts'), 'utf8')
  const usersResource = fs.readFileSync(root('../../api/resources/users.ts'), 'utf8')
  const districtLayout = fs.readFileSync(root('../../layouts/DistrictLayout.tsx'), 'utf8')

  describe('routing + authorization', () => {
    it('registers caregiver routes under districtOfficer ProtectedRoute', () => {
      expect(app).toContain('allowedRole="districtOfficer"')
      expect(app).toContain('path="/district/abakoresha"')
      expect(app).toContain('path="/district/abakoresha/:userId"')
      expect(app).toContain('DistrictCaregiversPage')
      expect(app).toContain('DistrictCaregiverDetailPage')
      expect(homePathForRole('districtOfficer')).toBe('/district')
      expect(hasRole({ role: 'districtOfficer' }, 'ncda')).toBe(false)
    })

    it('adds Abakoresha to district navigation', () => {
      expect(districtLayout).toContain('/district/abakoresha')
      expect(districtLayout).toContain('district.nav.caregivers')
    })
  })

  describe('resource + role guards', () => {
    it('defines district creatable roles as caregiver only', () => {
      expect(DISTRICT_CREATABLE_ROLES).toEqual(['caregiver'])
      expect(usersResource).toContain('createDistrictCaregiver')
      expect(usersResource).toContain('NCDA_CREATABLE_ROLES')
    })

    it('uses district.keys.users namespace', () => {
      expect(queryKeys.district.users.list({ page: 1 })[2]).toBe('list')
      expect(queryKeys.district.users.detail('u1')[2]).toBe('detail')
      expect(queryStaleTimes.districtUsers).toBe(30_000)
      expect(districtQueries).toContain('role: \'caregiver\'')
      expect(districtQueries).toContain('createDistrictCaregiver')
      expect(districtQueries).not.toContain('ncda.keys')
    })
  })

  describe('caregiver list + create', () => {
    it('uses server pagination and fixed caregiver role', () => {
      expect(caregiversPage).toContain('useDistrictCaregiversList')
      expect(caregiversPage).toContain('role: \'caregiver\'')
      expect(caregiversPage).toContain('Pagination')
      expect(caregiversPage).toContain('TempPasswordBanner')
      expect(caregiversPage).not.toMatch(/LocalStore|useData\(|MOCK_DATA/)
      expect(caregiversPage).toContain('LiveUnavailableState')
    })

    it('does not expose role dropdown for district create', () => {
      expect(caregiversPage).toContain('district.caregivers.roleFixed')
      expect(caregiversPage).not.toContain('district_focal_person')
      expect(caregiversPage).not.toContain('ncda_admin')
    })
  })

  describe('center detail integration', () => {
    it('links to shared create flow with center preselected', () => {
      expect(centerDetailPage).toContain('CenterCaregiversSection')
      expect(centerDetailPage).toContain('useDistrictCaregiversList')
      expect(centerDetailPage).toContain('/district/abakoresha?create=1&centerId=')
      expect(caregiversPage).toContain('searchParams.get(\'centerId\')')
      expect(caregiversPage).toContain('centerLocked')
    })
  })

  describe('detail + password security', () => {
    it('supports update and reset with one-time temp password UI', () => {
      expect(caregiverDetailPage).toContain('useDistrictUpdateCaregiver')
      expect(caregiverDetailPage).toContain('useDistrictResetCaregiverPassword')
      expect(caregiverDetailPage).toContain('TempPasswordBanner')
      expect(caregiverDetailPage).not.toMatch(/localStorage|LocalStore/)
    })
  })

  describe('architecture isolation', () => {
    it('avoids LocalStore, useData, and mock leakage on LIVE paths', () => {
      for (const src of [caregiversPage, caregiverDetailPage, centerDetailPage, districtQueries]) {
        expect(src).not.toMatch(/\buseData\(|LocalStore|SyncEngine/)
        expect(src).not.toMatch(/if\s*\(!.*\)\s*return\s+MOCK/)
      }
    })
  })
})
