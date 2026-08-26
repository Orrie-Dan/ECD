import { describe, it, expect } from 'vitest'
import { monthRange } from '@/lib/contribution-format'
import {
  mapCreateStaffTrainingInputToDto,
  mapStaffTrainingDtoToViewModel,
} from '@/api/mappers/staff-trainings.mapper'
import {
  isUnknownListQueryProperty,
  listStaffTrainingParams,
  paginateTraineeFallback,
} from '@/api/resources/staff-trainings'
import type { StaffTrainingViewModel } from '@/models/staff-trainings'
import {
  formatCertificateStatus,
  formatTrainingDuration,
  validateDurationDays,
} from '@/lib/staff-training-format'

describe('FE-6 — staff trainings helpers', () => {
  it('builds inclusive month date bounds for API from/to', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('maps training DTO dates, duration, and certificate without inventing extra fields', () => {
    const vm = mapStaffTrainingDtoToViewModel({
      id: 'st-1',
      centerId: 'c1',
      centerName: 'Test',
      districtId: 'd1',
      traineeUserId: 'cg-1',
      traineeName: 'Uwimana Claire',
      traineeRole: 'Caregiver',
      trainingDate: '2026-02-10T00:00:00.000Z',
      trainingProvider: 'NCDA / District',
      topic: 'Early stimulation',
      durationDays: 3,
      certificateReceived: true,
      notes: null,
      recordedById: 'dir-1',
      version: 1,
      createdAt: '2026-02-10T10:00:00.000Z',
      updatedAt: '2026-02-10T10:00:00.000Z',
    })
    expect(vm.trainingDate).toBe('2026-02-10')
    expect(vm.traineeUserId).toBe('cg-1')
    expect(vm.durationDays).toBe(3)
    expect(vm.certificateReceived).toBe(true)
    expect(formatTrainingDuration(1)).toBeTruthy()
    expect(formatTrainingDuration(3)).toContain('3')
    expect(formatCertificateStatus(true)).toBeTruthy()
    expect(formatCertificateStatus(false)).toBeTruthy()
  })

  it('validates durationDays as a positive integer up to 365', () => {
    expect(validateDurationDays('')).toBeTruthy()
    expect(validateDurationDays('0')).toBeTruthy()
    expect(validateDurationDays('1.5')).toBeTruthy()
    expect(validateDurationDays('366')).toBeTruthy()
    expect(validateDurationDays('3')).toBeNull()
  })

  it('create payload includes traineeUserId only when linked to a platform user', () => {
    const linked = mapCreateStaffTrainingInputToDto({
      centerId: 'c1',
      traineeUserId: 'cg-1',
      traineeName: 'Uwimana Claire',
      traineeRole: 'Caregiver',
      trainingDate: '2026-02-10',
      trainingProvider: 'NCDA',
      topic: 'Early stimulation',
      durationDays: 3,
      certificateReceived: true,
    })
    expect(linked.traineeUserId).toBe('cg-1')
    expect(linked.certificateReceived).toBe(true)

    const unlinked = mapCreateStaffTrainingInputToDto({
      centerId: 'c1',
      traineeName: 'Guest trainer attendee',
      traineeRole: 'Volunteer',
      trainingDate: '2026-02-10',
      trainingProvider: 'NCDA',
      topic: 'WASH',
      durationDays: 1,
      certificateReceived: false,
    })
    expect(unlinked.traineeUserId).toBeUndefined()
    expect(unlinked.certificateReceived).toBe(false)
  })
})

describe('FE-6 — list query compatibility', () => {
  it('sends traineeUserId on the list query when provided', () => {
    const params = listStaffTrainingParams({
      centerId: 'c1',
      traineeUserId: 'cg-1',
      from: '2026-08-01',
      to: '2026-08-31',
      page: 1,
      pageSize: 10,
    })
    expect(params.traineeUserId).toBe('cg-1')
    expect(params.centerId).toBe('c1')
  })

  it('detects Nest forbidNonWhitelisted traineeUserId 400s', () => {
    expect(
      isUnknownListQueryProperty(
        {
          statusCode: 400,
          message: 'property traineeUserId should not exist',
          messages: ['property traineeUserId should not exist'],
          isNetworkError: false,
          isUnauthorized: false,
          isForbidden: false,
          isConflict: false,
          isValidationError: true,
          isNotFound: false,
        },
        'traineeUserId',
      ),
    ).toBe(true)
    expect(
      isUnknownListQueryProperty(
        {
          statusCode: 400,
          message: 'trainingDate must be a valid ISO 8601 date string',
          messages: ['trainingDate must be a valid ISO 8601 date string'],
          isNetworkError: false,
          isUnauthorized: false,
          isForbidden: false,
          isConflict: false,
          isValidationError: true,
          isNotFound: false,
        },
        'traineeUserId',
      ),
    ).toBe(false)
  })

  it('client-paginates a trainee fallback so profile history stays scoped', () => {
    const rows = [
      { traineeUserId: 'cg-1', topic: 'A' },
      { traineeUserId: 'cg-2', topic: 'B' },
      { traineeUserId: 'cg-1', topic: 'C' },
    ] as unknown as StaffTrainingViewModel[]
    const page1 = paginateTraineeFallback(rows, 'cg-1', 1, 1)
    expect(page1.total).toBe(2)
    expect(page1.totalPages).toBe(2)
    expect(page1.items).toHaveLength(1)
    expect(page1.items[0]?.topic).toBe('A')
    const page2 = paginateTraineeFallback(rows, 'cg-1', 2, 1)
    expect(page2.items[0]?.topic).toBe('C')
  })
})
