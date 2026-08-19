import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { normalizeRole, UnknownUserRoleError } from '@/api/roles'
import { isUnsafeProductionApiBaseUrl } from '@/config/env'

describe('Sprint 5.4 District production readiness', () => {
  it('retired referral routes redirect into Gukurikirana', () => {
    const content = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8')
    expect(content).not.toContain('ReferralMonitoringPage')
    expect(content).toContain('path="/district/referrals"')
    expect(content).toContain('path="/district/gukurikirana/ivuriro"')
    expect(content).toContain('to={DISTRICT_PATHS.followup}')
  })

  it('District navigation groups monitoring domains under Imikorere', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../layouts/district/navigation.ts'),
      'utf8',
    )
    expect(content).toContain("monitoring: '/district/imikorere'")
    expect(content).toContain("monitoringAttendance: '/district/imikorere/ubwitabire'")
    expect(content).toContain("monitoringGrowth: '/district/imikorere/imikurire'")
    expect(content).toContain("monitoringFeeding: '/district/imikorere/imirire'")
    expect(content).toContain("monitoringSted: '/district/imikorere/sted'")
    expect(content).not.toContain('followupReferrals')
  })

  it('App mounts an error boundary', () => {
    const app = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8')
    expect(app).toContain('AppErrorBoundary')
    expect(
      fs.existsSync(path.resolve(__dirname, '../../components/AppErrorBoundary.tsx')),
    ).toBe(true)
  })

  it('caregiver DataProvider repositories gate LIVE hydrations to caretakers', () => {
    const childrenRepo = fs.readFileSync(
      path.resolve(__dirname, '../children/repository.ts'),
      'utf8',
    )
    const attendanceRepo = fs.readFileSync(
      path.resolve(__dirname, '../attendance/repository.ts'),
      'utf8',
    )
    const referralRepo = fs.readFileSync(
      path.resolve(__dirname, '../referrals/repository.ts'),
      'utf8',
    )

      expect(childrenRepo).toMatch(/isEcdCenterUser\(user\)/)
      expect(attendanceRepo).toMatch(/isEcdCenterUser\(user\)/)
      expect(referralRepo).toMatch(/isEcdCenterUser\(user\)/)
  })

  it('District children hooks use district query-key namespace', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, './children/queries.ts'),
      'utf8',
    )
    expect(content).toContain("district.keys.children('list', filters)")
    expect(content).toContain('district.keys.child(id')
    expect(content).not.toMatch(/children\.keys\.(list|detail)/)
  })

  it('normalizeRole fails closed for unknown API roles and separates NCDA', () => {
    expect(normalizeRole('district_focal_person')).toBe('districtOfficer')
    expect(normalizeRole('caregiver')).toBe('caretaker')
    expect(normalizeRole('ncda_admin')).toBe('ncda')
    expect(() => normalizeRole('super_admin')).toThrow(UnknownUserRoleError)
  })

  it('production LIVE localhost API base URL is flagged unsafe', () => {
    expect(isUnsafeProductionApiBaseUrl('http://localhost:3000')).toBe(true)
    expect(isUnsafeProductionApiBaseUrl('https://api.example.gov.rw')).toBe(false)
  })

  it('Dashboard filter summary does not hardcode DISTRICT_NAME in LIVE path', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../components/district/DashboardFilterSummary.tsx'),
      'utf8',
    )
    expect(content).toContain('env.isLive')
    expect(content).toContain('user?.districtName')
  })
})
