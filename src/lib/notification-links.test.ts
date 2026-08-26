import { describe, expect, it } from 'vitest'
import { getNotificationLinkFor } from '@/lib/notification-links'

describe('notification links', () => {
  it('routes attendance absence to child attendance tab', () => {
    expect(
      getNotificationLinkFor({
        type: 'attendance_absence',
        entityType: 'child',
        entityId: 'child-1',
        rolePrefix: '/caretaker',
      }),
    ).toBe('/caretaker/abana/child-1?tab=attendance')
  })

  it('routes caretaker low-rate alerts to attendance page', () => {
    expect(
      getNotificationLinkFor({
        type: 'attendance_low_rate',
        entityType: 'ecd_center',
        entityId: 'c1',
        rolePrefix: '/caretaker',
      }),
    ).toBe('/caretaker/ubwitabire')
  })

  it('routes district low-rate alerts to centre detail', () => {
    expect(
      getNotificationLinkFor({
        type: 'attendance_low_rate',
        entityType: 'ecd_center',
        entityId: 'c1',
        rolePrefix: '/district',
      }),
    ).toBe('/district/ibigo/c1')
  })
})
