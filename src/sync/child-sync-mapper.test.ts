import { describe, expect, it } from 'vitest'
import { buildChildCreateSyncPayload } from '@/sync/child-sync-mapper'
import type { LocalChildRecord } from '@/storage/types'

function baseChild(overrides: Partial<LocalChildRecord> = {}): LocalChildRecord {
  return {
    id: 'child-1',
    version: 0,
    deletedAt: null,
    lastModifiedAt: '2026-08-20T10:00:00.000Z',
    _localStatus: 'dirty',
    registrationNumber: 'ECD-2026-7b73',
    firstName: 'Jean',
    middleName: null,
    lastName: 'Mugisha',
    fullName: 'Jean Mugisha',
    centerId: 'center-1',
    centerName: 'Center',
    dateOfBirth: '2020-05-15',
    gender: 'Umuhungu',
    status: 'active',
    guardianName: 'Parent',
    guardianPhone: '0780000000',
    guardianRelation: 'umubyeyi',
    homeVillageId: 'village-1',
    registeredAt: '2026-08-20',
    province: 'p',
    district: 'd',
    sector: 's',
    cell: 'c',
    village: 'v',
    nationalId: '1199880012345678',
    ...overrides,
  }
}

describe('buildChildCreateSyncPayload', () => {
  it('always sends typed nationalId (not registrationNumber) as nationalId', () => {
    const payload = buildChildCreateSyncPayload(baseChild())
    expect(payload.nationalId).toBe('1199880012345678')
    expect(payload.registrationNumber).toBe('ECD-2026-7b73')
    expect(payload.nationalId).not.toBe(payload.registrationNumber)
  })

  it('rejects create payload without nationalId so sync cannot fall back to ECD-…', () => {
    expect(() => buildChildCreateSyncPayload(baseChild({ nationalId: undefined }))).toThrow(
      /nationalId/,
    )
  })
})
