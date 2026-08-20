import { describe, expect, it } from 'vitest'
import { filterEnrolledChildren, isEnrolledChild } from '@/lib/children-utils'
import type { Child } from '@/types'

function child(overrides: Partial<Child> = {}): Child {
  return {
    id: 'c1',
    fullName: 'Test Child',
    dateOfBirth: '2020-01-01',
    gender: 'Umuhungu',
    guardianName: 'Guardian',
    guardianPhone: '0780000000',
    guardianRelation: 'umubyeyi_mama',
    province: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    registeredAt: '2024-01-01',
    status: 'active',
    registrationNumber: 'REG-1',
    centerId: 'center-a',
    centerName: 'Center A',
    ...overrides,
  }
}

describe('enrollment helpers', () => {
  it('isEnrolledChild is true only for active children', () => {
    expect(isEnrolledChild(child())).toBe(true)
    expect(isEnrolledChild(child({ status: 'transferred' }))).toBe(false)
    expect(isEnrolledChild(child({ status: 'archived' }))).toBe(false)
  })

  it('filterEnrolledChildren drops transferred/archived and pending outgoing ids', () => {
    const rows = [
      child({ id: 'a' }),
      child({ id: 'b', status: 'transferred' }),
      child({ id: 'c', status: 'archived' }),
      child({ id: 'd' }),
    ]
    expect(filterEnrolledChildren(rows).map((c) => c.id)).toEqual(['a', 'd'])
    expect(filterEnrolledChildren(rows, new Set(['d'])).map((c) => c.id)).toEqual(['a'])
  })
})
