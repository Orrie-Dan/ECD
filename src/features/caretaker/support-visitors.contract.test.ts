import { describe, it, expect } from 'vitest'
import { monthRange } from '@/lib/contribution-format'
import { mapCenterSupportDtoToViewModel } from '@/api/mappers/center-support.mapper'
import { mapCenterVisitDtoToViewModel } from '@/api/mappers/center-visits.mapper'
import {
  formatReceivedBy,
  formatSupportCategory,
  formatSupportQuantity,
  validateSupportQuantity,
} from '@/lib/center-support-format'
import { formatVisitAffiliation } from '@/lib/center-visit-format'
import { CENTER_SUPPORT_CATEGORIES } from '@/models/center-support'

describe('FE-5 — centre support + visitors helpers', () => {
  it('builds inclusive month date bounds for API from/to', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthRange('2026-04')).toEqual({ from: '2026-04-01', to: '2026-04-30' })
  })

  it('maps support DTO dates, quantity, and received-by without inventing a signature', () => {
    const vm = mapCenterSupportDtoToViewModel({
      id: 'cs-1',
      centerId: 'c1',
      centerName: 'Test',
      districtId: 'd1',
      receivedDate: '2026-04-02T00:00:00.000Z',
      supportCategory: 'food',
      description: 'Maize flour donation',
      quantity: '50.5',
      unit: 'kg',
      providerName: 'Sector agronomist',
      providerOrganization: 'Sector office',
      receivedById: 'u-recv',
      receivedByName: 'Uwase Marie',
      notes: null,
      recordedById: 'u1',
      version: 1,
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z',
    })
    expect(vm.receivedDate).toBe('2026-04-02')
    expect(vm.quantity).toBe(50.5)
    expect(vm.receivedByName).toBe('Uwase Marie')
    expect(formatReceivedBy(vm)).toBe('Uwase Marie')
    expect(formatSupportCategory('food')).toBeTruthy()
    expect(formatSupportQuantity(50, 'kg')).toContain('50')
    expect(CENTER_SUPPORT_CATEGORIES).toEqual(['food', 'equipment', 'other'])
    expect('signature' in vm).toBe(false)
  })

  it('validates optional quantity with up to 3 decimal places', () => {
    expect(validateSupportQuantity('')).toBeNull()
    expect(validateSupportQuantity('12.5')).toBeNull()
    expect(validateSupportQuantity('1.234')).toBeNull()
    expect(validateSupportQuantity('1.2345')).toBeTruthy()
    expect(validateSupportQuantity('-1')).toBeTruthy()
    expect(validateSupportQuantity('abc')).toBeTruthy()
  })

  it('maps visitor DTO without a signature field and formats affiliation', () => {
    const vm = mapCenterVisitDtoToViewModel({
      id: 'cv-1',
      centerId: 'c1',
      centerName: 'Test',
      districtId: 'd1',
      visitDate: '2026-05-20T00:00:00.000Z',
      visitorName: 'Kalisa Patrick',
      organization: 'NCDA',
      occupationOrRole: 'District education officer',
      purposeOrMessage: 'Supportive supervision',
      hostedById: null,
      notes: null,
      recordedById: 'dir-1',
      version: 1,
      createdAt: '2026-05-20T09:00:00.000Z',
      updatedAt: '2026-05-20T09:00:00.000Z',
    })
    expect(vm.visitDate).toBe('2026-05-20')
    expect(vm.visitorName).toBe('Kalisa Patrick')
    expect(formatVisitAffiliation(vm)).toContain('NCDA')
    expect(formatVisitAffiliation(vm)).toContain('District education officer')
    expect('signature' in vm).toBe(false)
    expect('signedBy' in vm).toBe(false)
    expect(vm.recordedById).toBe('dir-1')
  })
})
