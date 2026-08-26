import { describe, it, expect } from 'vitest'
import { mapCommitteeMemberDtoToViewModel } from '@/api/mappers/committee-members.mapper'
import {
  formatCommitteeStatus,
  formatEducationLevel,
  formatPersonSex,
} from '@/lib/committee-educator-format'
import { EDUCATION_LEVEL_OPTIONS, PERSON_SEX_OPTIONS } from '@/models/center-educators'

describe('FE-4 — committee + educators helpers', () => {
  it('maps committee member DTO with active status preserved', () => {
    const active = mapCommitteeMemberDtoToViewModel({
      id: 'm1',
      centerId: 'c1',
      centerName: 'Test',
      districtId: 'd1',
      userId: null,
      fullName: 'Niyonsenga Jean',
      position: 'President',
      phone: '+250788000000',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: null,
      isActive: true,
      notes: null,
      recordedById: 'u1',
      version: 1,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    })
    expect(active.startDate).toBe('2026-01-01')
    expect(active.isActive).toBe(true)
    expect(formatCommitteeStatus(true)).toBeTruthy()
    expect(formatCommitteeStatus(false)).toBeTruthy()
  })

  it('maps inactive membership dates without inventing delete semantics', () => {
    const inactive = mapCommitteeMemberDtoToViewModel({
      id: 'm2',
      centerId: 'c1',
      centerName: 'Test',
      districtId: 'd1',
      userId: null,
      fullName: 'Uwase Marie',
      position: 'Secretary',
      phone: null,
      startDate: '2025-01-01',
      endDate: '2026-06-30',
      isActive: false,
      notes: null,
      recordedById: 'u1',
      version: 2,
      createdAt: '2025-01-01',
      updatedAt: '2026-06-30',
    })
    expect(inactive.isActive).toBe(false)
    expect(inactive.endDate).toBe('2026-06-30')
  })

  it('formats educator gender and education labels from users-domain enums', () => {
    expect(PERSON_SEX_OPTIONS).toContain('male')
    expect(EDUCATION_LEVEL_OPTIONS).toContain('secondary')
    expect(formatPersonSex('female')).toBeTruthy()
    expect(formatEducationLevel('vocational')).toBeTruthy()
    expect(formatPersonSex(null)).toBe('—')
    expect(formatEducationLevel(undefined)).toBe('—')
  })
})
