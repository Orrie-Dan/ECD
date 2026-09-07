import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { queryKeys, queryStaleTimes } from '@/api/query-keys'
import { homePathForRole, hasRole } from '@/api/roles'
import { NCDA_CREATABLE_ROLES, USERS_MAX_PAGE_SIZE } from '@/api/resources/users'
import { AUDIT_LOGS_MAX_PAGE_SIZE } from '@/api/resources/audit-logs'
import { findNcdaNavItem } from '@/layouts/ncda/navigation'
import { UserRole } from '@/api/generated/models'

const root = (...parts: string[]) => path.resolve(__dirname, ...parts)

describe('Sprint 5.5G — NCDA users & governance contract', () => {
  const app = fs.readFileSync(root('../../App.tsx'), 'utf8')
  const usersPage = fs.readFileSync(root('../../pages/ncda/NcdaUsersPage.tsx'), 'utf8')
  const userDetail = fs.readFileSync(root('../../pages/ncda/NcdaUserDetailPage.tsx'), 'utf8')
  const auditPage = fs.readFileSync(root('../../pages/ncda/NcdaAuditLogsPage.tsx'), 'utf8')
  const auditDetail = fs.readFileSync(root('../../pages/ncda/NcdaAuditLogDetailPage.tsx'), 'utf8')
  const pages = fs.readFileSync(root('../../pages/ncda/NcdaPages.tsx'), 'utf8')
  const settingsPage = fs.readFileSync(root('../../pages/ncda/NcdaSettingsPage.tsx'), 'utf8')
  const usersQueries = fs.readFileSync(root('./users/queries.ts'), 'utf8')
  const auditQueries = fs.readFileSync(root('./audit-logs/queries.ts'), 'utf8')
  const usersResource = fs.readFileSync(root('../../api/resources/users.ts'), 'utf8')
  const auditResource = fs.readFileSync(root('../../api/resources/audit-logs.ts'), 'utf8')

  describe('routing + authorization', () => {
    it('registers users and audit under ncda ProtectedRoute', () => {
      expect(app).toContain('allowedRole="ncda"')
      expect(app).toContain('path="/ncda/users"')
      expect(app).toContain('path="/ncda/users/:userId"')
      expect(app).toContain('path="/ncda/audit-logs"')
      expect(app).toContain('path="/ncda/audit-logs/:logId"')
      expect(findNcdaNavItem('/ncda/audit-logs/abc')?.id).toBe('audit-logs')
      expect(homePathForRole('ncda')).toBe('/ncda')
      expect(hasRole({ role: 'ncda' }, 'ncda')).toBe(true)
      expect(hasRole({ role: 'districtOfficer' }, 'ncda')).toBe(false)
      expect(hasRole({ role: 'caretaker' }, 'ncda')).toBe(false)
      expect(findNcdaNavItem('/ncda/users/abc')?.id).toBe('users')
      expect(findNcdaNavItem('/ncda/audit-logs')?.id).toBe('audit-logs')
    })
  })

  describe('role matrix (no invented roles)', () => {
    it('only known UserRole enum values exist and NCDA cannot create peer ncda_admin', () => {
      expect(Object.values(UserRole)).toEqual([
        'caregiver',
        'district_focal_person',
        'ncda_admin',
        'ecd_director',
      ])
      expect(NCDA_CREATABLE_ROLES).toEqual([
        'district_focal_person',
        'ecd_director',
        'caregiver',
      ])
      expect(NCDA_CREATABLE_ROLES).not.toContain('ncda_admin')
      expect(usersPage).not.toMatch(/super_admin|District_Inspector|\bDHI\b|\bCAU\b/)
      expect(usersPage).toContain('createRoleForbidden')
    })
  })

  describe('users query namespace + server filters', () => {
    it('uses ncda.users.* and clamps pagination', () => {
      expect(queryKeys.ncda.users.all).toEqual(['ncda', 'users'])
      expect(queryKeys.ncda.users.list({ page: 1 })[2]).toBe('list')
      expect(queryKeys.ncda.users.detail('u1')).toEqual(['ncda', 'users', 'detail', 'u1'])
      expect(queryStaleTimes.ncdaUsers).toBe(30_000)
      expect(USERS_MAX_PAGE_SIZE).toBe(100)
      expect(usersResource).toContain('clampPageSize')
      expect(usersResource).toContain('usersControllerFindAll')
      expect(usersQueries).toContain('env.isLive')
    })

    it('wires create/update/reset without role or scope PATCH', () => {
      expect(usersResource).toContain('usersControllerCreate')
      expect(usersResource).toContain('usersControllerUpdate')
      expect(usersResource).toContain('usersControllerResetPassword')
      expect(userDetail).toContain('useNcdaUpdateUser')
      expect(usersPage).toContain('useNcdaUpdateUser')
      expect(usersPage).toContain('UserProfileEditForm')
      expect(userDetail).toContain('useNcdaResetUserPassword')
      expect(userDetail).toContain('roleScopeLocked')
      const updateFn = usersResource.slice(
        usersResource.indexOf('export async function updateUser'),
        usersResource.indexOf('export async function resetUserPassword'),
      )
      expect(updateFn).not.toMatch(/\brole\s*:/)
      expect(updateFn).not.toMatch(/\bcenterId\s*:/)
      expect(updateFn).not.toMatch(/\bdistrictId\s*:/)
      expect(usersPage).toContain('temporaryPassword')
      expect(userDetail).toContain('temporaryPassword')
    })
  })

  describe('audit logs', () => {
    it('requires date window and is read-only', () => {
      expect(queryKeys.ncda.auditLogs.all).toEqual(['ncda', 'audit-logs'])
      expect(AUDIT_LOGS_MAX_PAGE_SIZE).toBe(100)
      expect(auditQueries).toContain('Boolean(listFilters.from && listFilters.to)')
      expect(auditResource).toContain('auditLogsControllerFindAll')
      expect(auditPage).toContain('immutableNote')
      expect(auditPage).not.toContain('useMutation')
      expect(auditPage).not.toMatch(/deleteAudit|updateAudit|PATCH/)
      expect(pages).toContain("export { NcdaAuditLogsPage } from './NcdaAuditLogsPage'")
      expect(pages).toContain("export { NcdaAuditLogDetailPage } from './NcdaAuditLogDetailPage'")
      expect(auditPage).toContain('stashAuditLog')
      expect(auditPage).toContain('state={{ log: row }}')
      expect(auditDetail).toContain('snapshotToRows')
      expect(auditDetail).not.toContain('JSON.stringify')
      expect(auditDetail).not.toContain('<pre')
      expect(auditDetail).not.toContain('useMutation')
    })
  })

  describe('devices / sync remain unsupported', () => {
    it('routes devices and sync into System Settings as honest contract gaps', () => {
      expect(app).toContain('path="/ncda/settings"')
      expect(app).toContain('RedirectWithSearch to="/ncda/settings"')
      expect(pages).toContain("export { NcdaSettingsPage } from './NcdaSettingsPage'")
      expect(settingsPage).toContain('nationalSettingsBody')
      expect(settingsPage).toContain('devicesBody')
      expect(settingsPage).toContain('syncBody')
      expect(settingsPage).not.toMatch(/useQuery|@\/api\/resources|@\/api\/generated/)
    })
  })

  describe('LIVE isolation', () => {
    it('avoids LocalStore, useData, and mock fallback', () => {
      for (const src of [usersPage, userDetail, auditPage, auditDetail, usersQueries, auditQueries]) {
        expect(src).not.toMatch(/\buseData\(|LocalStore|SyncEngine|MOCK_DATA/)
        expect(src).not.toMatch(/if\s*\(!.*\)\s*return\s+MOCK/)
        expect(src).not.toMatch(/from ['"]@\/pages\/district/)
      }
      expect(usersPage).toContain('LiveUnavailableState')
      expect(auditPage).toContain('LiveUnavailableState')
      expect(usersPage).not.toContain('passwordHash')
      expect(userDetail).not.toContain('passwordHash')
      expect(usersPage).not.toContain('refreshToken')
    })
  })
})
