import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  normalizeRole,
  denormalizeRole,
  homePathForRole,
  homePathForUser,
  hasRole,
  isCaretaker,
  isEcdDirector,
  isEcdCenterUser,
  loginRoleMatches,
  isDistrictOfficer,
  isNcda,
  UnknownUserRoleError,
  ECD_CENTER_ROLES,
} from '@/api/roles'
import { queryKeys } from '@/api/query-keys'

describe('Sprint 5.5A — NCDA role boundary', () => {
  describe('role mapping', () => {
    it('maps backend roles to distinct application roles', () => {
      expect(normalizeRole('caregiver')).toBe('caretaker')
      expect(normalizeRole('ecd_director')).toBe('ecdDirector')
      expect(normalizeRole('district_focal_person')).toBe('districtOfficer')
      expect(normalizeRole('ncda_admin')).toBe('ncda')
    })

    it('does not collapse ncda_admin into districtOfficer', () => {
      expect(normalizeRole('ncda_admin')).not.toBe('districtOfficer')
      expect(denormalizeRole('ncda')).toBe('ncda_admin')
      expect(denormalizeRole('districtOfficer')).toBe('district_focal_person')
      expect(denormalizeRole('ecdDirector')).toBe('ecd_director')
      expect(denormalizeRole('caretaker')).toBe('caregiver')
    })

    it('fails closed for unknown API roles', () => {
      expect(() => normalizeRole('super_admin')).toThrow(UnknownUserRoleError)
      expect(() => normalizeRole('District_Inspector')).toThrow(UnknownUserRoleError)
      expect(() => normalizeRole('DHI')).toThrow(UnknownUserRoleError)
      expect(() => normalizeRole('')).toThrow(UnknownUserRoleError)
    })
  })

  describe('login destinations', () => {
    it('routes each supported role to its application boundary', () => {
      expect(homePathForRole('caretaker')).toBe('/caretaker')
      expect(homePathForRole('ecdDirector')).toBe('/caretaker')
      expect(homePathForRole('districtOfficer')).toBe('/district')
      expect(homePathForRole('ncda')).toBe('/ncda')
    })

    it('homePathForUser mirrors role homes and fail-closes without a user', () => {
      expect(homePathForUser({ role: 'ncda' })).toBe('/ncda')
      expect(homePathForUser({ role: 'districtOfficer' })).toBe('/district')
      expect(homePathForUser({ role: 'caretaker' })).toBe('/caretaker')
      expect(homePathForUser({ role: 'ecdDirector' })).toBe('/caretaker')
      expect(homePathForUser(null)).toBe('/')
    })
  })

  describe('route protection helpers', () => {
    it('isolates ncda and district roles', () => {
      const ncdaUser = { role: 'ncda' as const }
      const districtUser = { role: 'districtOfficer' as const }
      const caregiverUser = { role: 'caretaker' as const }
      const directorUser = { role: 'ecdDirector' as const }

      expect(hasRole(ncdaUser, 'ncda')).toBe(true)
      expect(hasRole(ncdaUser, 'districtOfficer')).toBe(false)
      expect(hasRole(districtUser, 'ncda')).toBe(false)
      expect(hasRole(caregiverUser, 'ncda')).toBe(false)
      expect(hasRole(caregiverUser, 'districtOfficer')).toBe(false)
      expect(hasRole(directorUser, 'caretaker')).toBe(false)
      expect(hasRole(directorUser, ECD_CENTER_ROLES)).toBe(true)
      expect(hasRole(caregiverUser, ECD_CENTER_ROLES)).toBe(true)

      expect(isNcda(ncdaUser)).toBe(true)
      expect(isDistrictOfficer(districtUser)).toBe(true)
      expect(isCaretaker(caregiverUser)).toBe(true)
      expect(isEcdDirector(directorUser)).toBe(true)
      expect(isEcdCenterUser(caregiverUser)).toBe(true)
      expect(isEcdCenterUser(directorUser)).toBe(true)
      expect(isCaretaker(directorUser)).toBe(false)
      expect(loginRoleMatches('ecdDirector', 'caretaker')).toBe(true)
      expect(loginRoleMatches('caretaker', 'caretaker')).toBe(true)
      expect(loginRoleMatches('ncda', 'caretaker')).toBe(false)
      expect(isNcda(districtUser)).toBe(false)
      expect(isDistrictOfficer(ncdaUser)).toBe(false)
    })
  })

  describe('App routing boundary', () => {
    const app = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8')

    it('registers a protected /ncda boundary', () => {
      expect(app).toContain('allowedRole="ncda"')
      expect(app).toContain('path="/ncda"')
      expect(app).toContain('NcdaLayout')
      expect(app).toContain('path="/ncda/dashboard"')
    })

    it('keeps District behind districtOfficer only', () => {
      expect(app).toContain('allowedRole="districtOfficer"')
      expect(app).toContain('path="/district"')
      expect(app).not.toMatch(/allowedRole=\{?\[["']districtOfficer["'],\s*["']ncda["']\]\}?/)
    })

    it('shares ECD center pages for caregiver and director; director extras are gated', () => {
      expect(app).toContain('allowedRole={ECD_CENTER_ROLES}')
      expect(app).toContain('allowedRole="ecdDirector"')
      expect(app).toContain('path="/caretaker/abakoresha"')
      expect(app).toContain('path="/caretaker/isuzuma"')
      expect(app).toContain('CenterUsersPage')
    })
  })

  describe('login path + LocalStore isolation', () => {
    it('exposes /login/ncda in LoginPage map', () => {
      const loginPage = fs.readFileSync(
        path.resolve(__dirname, '../../pages/LoginPage.tsx'),
        'utf8',
      )
      expect(loginPage).toContain("ncda: 'ncda'")
    })

    it('caregiver repositories still gate LIVE hydration with isEcdCenterUser', () => {
      const childrenRepo = fs.readFileSync(
        path.resolve(__dirname, '../children/repository.ts'),
        'utf8',
      )
      const attendanceRepo = fs.readFileSync(
        path.resolve(__dirname, '../attendance/repository.ts'),
        'utf8',
      )
      expect(childrenRepo).toMatch(/isEcdCenterUser\(user\)/)
      expect(attendanceRepo).toMatch(/isEcdCenterUser\(user\)/)
      expect(childrenRepo).not.toMatch(/isNcda\(user\)/)
    })

    it('Ncda shell pages do not import LocalStore or SyncEngine', () => {
      const layout = fs.readFileSync(
        path.resolve(__dirname, '../../layouts/NcdaLayout.tsx'),
        'utf8',
      )
      const pages = fs.readFileSync(
        path.resolve(__dirname, '../../pages/ncda/NcdaPages.tsx'),
        'utf8',
      )
      expect(layout).not.toMatch(/LocalStore|SyncEngine|getLocalStore|outbox/)
      expect(pages).not.toMatch(/LocalStore|SyncEngine|getLocalStore|outbox/)
    })
  })

  describe('query namespace convention', () => {
    it('uses a single ncda root (not national)', () => {
      expect(queryKeys.ncda.all).toEqual(['ncda'])
      expect(queryKeys.district.all).toEqual(['district'])
      expect(queryKeys.ncda.dashboard.all).toEqual(['ncda', 'dashboard'])
      const keysSource = fs.readFileSync(
        path.resolve(__dirname, '../../api/query-keys.ts'),
        'utf8',
      )
      expect(keysSource).toContain("all = ['ncda']")
      expect(keysSource).not.toMatch(/all = \['national'\]/)
    })
  })

  describe('roles.ts source contract', () => {
    it('documents ncda_admin → ncda mapping', () => {
      const roles = fs.readFileSync(path.resolve(__dirname, '../../api/roles.ts'), 'utf8')
      expect(roles).toContain("ncda_admin: 'ncda'")
      expect(roles).not.toMatch(/ncda_admin:\s*'districtOfficer'/)
    })
  })
})
