import { describe, expect, it } from 'vitest'
import {
  formatFollowUpAlert,
  isActionableFollowUpAlert,
  isSyntheticChildLabel,
  resolveFollowUpAlertPath,
  summarizeActionableFollowUpAlerts,
} from '@/lib/follow-up-alerts'
import type { FollowUpAlertViewModel } from '@/models/alerts'
import type { Child } from '@/types'

function alert(overrides: Partial<FollowUpAlertViewModel> = {}): FollowUpAlertViewModel {
  return {
    id: 'a1',
    category: 'referral',
    priority: 'high',
    code: 'REFERRAL_PENDING',
    title: 'S59A Child-S59A-msq74in5',
    description: 'S59A Child-S59A-msq74in5 referral pending for 28 days',
    centerId: 'c1',
    centerName: 'APPEK Kamuhoza',
    childId: 'child-archived',
    childName: 'S59A Child-S59A-msq74in5',
    entityType: 'child',
    entityId: 'child-archived',
    detectedAt: '2026-08-20T00:00:00.000Z',
    metrics: [],
    ...overrides,
  }
}

const activePaul: Pick<Child, 'id' | 'status' | 'fullName'> = {
  id: 'child-paul',
  status: 'active',
  fullName: 'Paul Victor',
}

const archivedSynth: Pick<Child, 'id' | 'status' | 'fullName'> = {
  id: 'child-archived',
  status: 'archived',
  fullName: 'S59A Child-S59A-msq74in5',
}

describe('follow-up alert formatting', () => {
  it('detects synthetic child labels', () => {
    expect(isSyntheticChildLabel('S59A Child-S59A-msq74in5')).toBe(true)
    expect(isSyntheticChildLabel('Paul Victor')).toBe(false)
  })

  it('hides raw ids and translates referral pending', () => {
    const copy = formatFollowUpAlert(alert())
    expect(copy.heading).toBe('Umwana')
    expect(copy.detail).toContain('Umwana')
    expect(copy.detail).toContain('28')
    expect(copy.detail).not.toMatch(/S59A|msq74in5/i)
    expect(copy.detail).not.toMatch(/referral pending/i)
  })

  it('prefers local roster names over synthetic API names', () => {
    const copy = formatFollowUpAlert(
      alert({
        childId: 'child-paul',
        childName: 'S59A Child-S59A-msq74in5',
        title: 'S59A Child-S59A-msq74in5',
        description: 'S59A Child-S59A-msq74in5 has never been screened',
        category: 'sted',
        code: 'STED_NEVER_SCREENED',
      }),
      [activePaul],
    )
    expect(copy.heading).toBe('Paul Victor')
    expect(copy.detail).toContain('Paul Victor')
  })

  it('translates center attendance and compliance alerts', () => {
    const attendance = formatFollowUpAlert(
      alert({
        category: 'attendance',
        code: 'ATTENDANCE_MISSING_TODAY',
        title: 'No attendance recorded today',
        description: 'APPEK Kamuhoza has active children but no attendance today',
        childId: null,
        childName: null,
        entityType: 'center',
      }),
    )
    expect(attendance.heading).toMatch(/bwitabire/i)
    expect(attendance.detail).toContain('APPEK Kamuhoza')
    expect(attendance.detail).not.toMatch(/attendance/i)

    const compliance = formatFollowUpAlert(
      alert({
        category: 'compliance',
        code: 'COMPLIANCE_OVERDUE',
        title: 'No recent compliance assessment',
        description: 'APPEK Kamuhoza has no compliance assessment in 6+ months',
        childId: null,
        childName: null,
      }),
    )
    expect(compliance.heading).toMatch(/isuzuma/i)
    expect(compliance.detail).toContain('APPEK Kamuhoza')
    expect(compliance.detail).not.toMatch(/compliance/i)
  })
})

describe('follow-up alert filtering', () => {
  it('drops archived / missing children when roster is provided', () => {
    expect(isActionableFollowUpAlert(alert(), [archivedSynth])).toBe(false)
    expect(isActionableFollowUpAlert(alert(), [activePaul])).toBe(false)
    expect(
      isActionableFollowUpAlert(
        alert({ childId: 'child-paul', childName: 'Paul Victor' }),
        [activePaul],
      ),
    ).toBe(true)
  })

  it('keeps center-level alerts', () => {
    expect(
      isActionableFollowUpAlert(
        alert({
          category: 'attendance',
          code: 'ATTENDANCE_MISSING_TODAY',
          childId: null,
          childName: null,
          title: 'No attendance recorded today',
          description: 'APPEK Kamuhoza has active children but no attendance today',
        }),
        [activePaul],
      ),
    ).toBe(true)
  })

  it('recomputes counts without archived children', () => {
    const summary = summarizeActionableFollowUpAlerts(
      [
        alert(), // archived / missing → dropped
        alert({
          id: 'a2',
          childId: 'child-paul',
          childName: 'Paul Victor',
          category: 'sted',
          code: 'STED_NEVER_SCREENED',
          priority: 'medium',
          title: 'Paul Victor',
          description: 'Paul Victor has never been screened',
        }),
        alert({
          id: 'a3',
          category: 'attendance',
          code: 'ATTENDANCE_MISSING_TODAY',
          priority: 'high',
          childId: null,
          childName: null,
          title: 'No attendance recorded today',
          description: 'no attendance today',
        }),
      ],
      [activePaul, archivedSynth],
    )

    expect(summary.total).toBe(2)
    expect(summary.counts.high).toBe(1)
    expect(summary.counts.sted).toBe(1)
    expect(summary.counts.attendance).toBe(1)
    expect(summary.counts.referral).toBe(0)
  })
})

describe('follow-up alert routing', () => {
  it('wires caretaker follow-ups to workflow pages', () => {
    expect(
      resolveFollowUpAlertPath(
        alert({
          category: 'attendance',
          code: 'ATTENDANCE_MISSING_TODAY',
          childId: null,
          childName: null,
          title: 'No attendance recorded today',
          description: 'no attendance today',
        }),
        '/caretaker',
      ),
    ).toBe('/caretaker/ubwitabire')

    expect(
      resolveFollowUpAlertPath(
        alert({
          category: 'compliance',
          code: 'COMPLIANCE_OVERDUE',
          childId: null,
          childName: null,
          title: 'No recent compliance assessment',
          description: 'no compliance assessment in 6+ months',
        }),
        '/caretaker',
      ),
    ).toBe('/caretaker/isuzuma')

    expect(
      resolveFollowUpAlertPath(
        alert({
          category: 'sted',
          code: 'STED_NEVER_SCREENED',
          childId: 'child-paul',
          childName: 'Paul Victor',
          title: 'Paul Victor',
          description: 'Paul Victor has never been screened',
        }),
        '/caretaker',
        [activePaul],
      ),
    ).toBe('/caretaker/sted/new?child=paul-victor')

    expect(
      resolveFollowUpAlertPath(
        alert({
          childId: 'child-paul',
          childName: 'Paul Victor',
          category: 'referral',
          code: 'REFERRAL_PENDING',
        }),
        '/caretaker',
        [activePaul],
      ),
    ).toContain('/caretaker/abana/')
  })
})
