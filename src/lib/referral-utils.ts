import type { Child, Referral, StedAssessment } from '@/types'
import { getTodayDate } from '@/lib/nutrition-utils'
import { getChildrenDueForStedFollowUp } from '@/lib/sted-utils'

/** Days after referral creation before a pending follow-up is overdue. */
export const REFERRAL_FOLLOW_UP_DAYS = 14

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function isReferralFollowUpOverdue(
  referral: Referral,
  today = getTodayDate(),
): boolean {
  if (referral.status !== 'pending') return false
  return addDays(referral.date, REFERRAL_FOLLOW_UP_DAYS) <= today
}

export function computeReferralDistrictSummary(
  referrals: Referral[],
  children: Child[],
  stedAssessments: StedAssessment[],
  today = getTodayDate(),
): {
  open: number
  completed: number
  overdueFollowUps: number
  cancelled: number
  bySource: { nutrition: number; sted: number }
} {
  const open = referrals.filter((r) => r.status === 'pending').length
  const completed = referrals.filter((r) => r.status === 'completed').length
  const cancelled = referrals.filter((r) => r.status === 'cancelled').length
  const overdueReferrals = referrals.filter((r) =>
    isReferralFollowUpOverdue(r, today),
  ).length
  const overdueSted = getChildrenDueForStedFollowUp(
    children.filter((c) => c.status === 'active'),
    stedAssessments,
    today,
  ).length

  return {
    open,
    completed,
    overdueFollowUps: overdueReferrals + overdueSted,
    cancelled,
    bySource: {
      nutrition: referrals.filter((r) => r.sourceType === 'nutrition').length,
      sted: referrals.filter((r) => r.sourceType === 'sted').length,
    },
  }
}

export interface CenterReferralComparison {
  centerId: string
  centerName: string
  sector: string
  open: number
  completed: number
  overdueFollowUps: number
}

export function computeCenterReferralComparison(
  centers: { id: string; name: string; sector: string }[],
  children: Child[],
  referrals: Referral[],
  stedAssessments: StedAssessment[],
  today = getTodayDate(),
): CenterReferralComparison[] {
  return centers.map((center) => {
    const centerChildren = children.filter(
      (c) => c.centerId === center.id && c.status === 'active',
    )
    const childIds = new Set(centerChildren.map((c) => c.id))
    const centerReferrals = referrals.filter((r) => childIds.has(r.childId))
    const overdueReferrals = centerReferrals.filter((r) =>
      isReferralFollowUpOverdue(r, today),
    ).length
    const overdueSted = getChildrenDueForStedFollowUp(
      centerChildren,
      stedAssessments,
      today,
    ).length

    return {
      centerId: center.id,
      centerName: center.name,
      sector: center.sector,
      open: centerReferrals.filter((r) => r.status === 'pending').length,
      completed: centerReferrals.filter((r) => r.status === 'completed').length,
      overdueFollowUps: overdueReferrals + overdueSted,
    }
  })
}

export interface ReferralListRow {
  referral: Referral
  childName: string
  centerName: string
  sector: string
  overdue: boolean
}

export function buildReferralListRows(
  referrals: Referral[],
  children: Child[],
  centers: { id: string; name: string; sector: string }[],
  today = getTodayDate(),
): ReferralListRow[] {
  const childMap = new Map(children.map((c) => [c.id, c]))
  const centerMap = new Map(centers.map((c) => [c.id, c]))

  return referrals
    .map((referral) => {
      const child = childMap.get(referral.childId)
      const center = child ? centerMap.get(child.centerId) : undefined
      return {
        referral,
        childName: child?.fullName ?? referral.childId,
        centerName: center?.name ?? '—',
        sector: center?.sector ?? child?.sector ?? '—',
        overdue: isReferralFollowUpOverdue(referral, today),
      }
    })
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
      return b.referral.date.localeCompare(a.referral.date)
    })
}
