import type {
  Child,
  Referral,
  StedAgeBand,
  StedAnswer,
  StedAssessment,
  StedBodyPartStatus,
  StedPhysicalCheck,
  StedPhysicalPart,
  StedOutcome,
} from '@/types'
import { getTodayDate } from '@/lib/nutrition-utils'

export const STED_PHYSICAL_PARTS: StedPhysicalPart[] = [
  'headFace',
  'neck',
  'arms',
  'chest',
  'abdomenBack',
  'hips',
  'legsFeet',
  'genitals',
  'skinHair',
]

export const MILESTONES_1_3 = [
  'pickStandStep',
  'chooseStack',
  'imitatePicture',
  'scribble',
  'knowsTools',
  'understandsCommands',
  'socialPlay',
] as const

export const MILESTONES_4_6 = [
  'grossMotorPeers',
  'selfCare',
  'sensory',
  'canLearn',
  'emotionControl',
  'speechClarity',
  'attention',
  'receptiveLanguage',
  'peerFriends',
  'toiletHygiene',
] as const

export type MilestoneCode1_3 = (typeof MILESTONES_1_3)[number]
export type MilestoneCode4_6 = (typeof MILESTONES_4_6)[number]

export function emptyPhysicalCheck(): StedPhysicalCheck {
  return {
    headFace: 'normal',
    neck: 'normal',
    arms: 'normal',
    chest: 'normal',
    abdomenBack: 'normal',
    hips: 'normal',
    legsFeet: 'normal',
    genitals: 'normal',
    skinHair: 'normal',
  }
}

export function isPhysicalClear(physical: StedPhysicalCheck): boolean {
  return STED_PHYSICAL_PARTS.every((part) => physical[part] === 'normal')
}

export function ageInYears(dateOfBirth: string, onDate = getTodayDate()): number {
  const dob = new Date(dateOfBirth)
  const on = new Date(onDate)
  let years = on.getFullYear() - dob.getFullYear()
  const m = on.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && on.getDate() < dob.getDate())) years--
  return years
}

export function getStedAgeBand(
  dateOfBirth: string,
  onDate = getTodayDate(),
): StedAgeBand | null {
  const years = ageInYears(dateOfBirth, onDate)
  if (years >= 1 && years < 4) return '1_3'
  if (years >= 4 && years <= 6) return '4_6'
  return null
}

export function getMilestoneCodes(ageBand: StedAgeBand): readonly string[] {
  return ageBand === '1_3' ? MILESTONES_1_3 : MILESTONES_4_6
}

export function isAnswered(answer: StedAnswer | undefined): boolean {
  return answer === 'yego' || answer === 'oya'
}

export function emptyMilestones(ageBand: StedAgeBand): Record<string, StedAnswer> {
  const codes = getMilestoneCodes(ageBand)
  const result: Record<string, StedAnswer> = {}
  for (const code of codes) result[code] = 'yego'
  return result
}

export function hasAnyOya(milestones: Record<string, StedAnswer>): boolean {
  return Object.values(milestones).some((a) => a === 'oya')
}

export function hasPhysicalProblem(physical: StedPhysicalCheck): boolean {
  return STED_PHYSICAL_PARTS.some((part) => physical[part] === 'problem')
}

export function requiresStedReferral(
  physical: StedPhysicalCheck,
  milestones: Record<string, StedAnswer>,
): boolean {
  return hasPhysicalProblem(physical) || hasAnyOya(milestones)
}

export function addMonths(date: string, months: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

export function buildDefaultOutcome(
  physical: StedPhysicalCheck,
  milestones: Record<string, StedAnswer>,
  assessmentDate = getTodayDate(),
): StedOutcome {
  const referred = requiresStedReferral(physical, milestones)
  if (referred) {
    return {
      normal: false,
      referred: true,
      counseling: true,
      other: false,
      followUpIn6Months: false,
    }
  }
  return {
    normal: true,
    referred: false,
    counseling: true,
    other: false,
    followUpIn6Months: true,
    followUpDueDate: addMonths(assessmentDate, 6),
  }
}

export function getLatestStedAssessment(
  assessments: StedAssessment[],
  childId: string,
): StedAssessment | undefined {
  return [...assessments]
    .filter((a) => a.childId === childId)
    .sort(
      (a, b) =>
        b.assessmentDate.localeCompare(a.assessmentDate) || b.id.localeCompare(a.id),
    )[0]
}

export function getChildrenDueForStedFollowUp(
  children: Child[],
  assessments: StedAssessment[],
  today = getTodayDate(),
): { child: Child; assessment: StedAssessment }[] {
  const rows: { child: Child; assessment: StedAssessment }[] = []
  for (const child of children) {
    if (child.status !== 'active') continue
    const latest = getLatestStedAssessment(assessments, child.id)
    if (!latest?.outcome.followUpDueDate) continue
    if (latest.outcome.followUpDueDate <= today) {
      rows.push({ child, assessment: latest })
    }
  }
  return rows.sort((a, b) =>
    (a.assessment.outcome.followUpDueDate ?? '').localeCompare(
      b.assessment.outcome.followUpDueDate ?? '',
    ),
  )
}

export function getEligibleStedChildren(
  children: Child[],
  onDate = getTodayDate(),
): Child[] {
  return children.filter(
    (c) => c.status === 'active' && getStedAgeBand(c.dateOfBirth, onDate) != null,
  )
}

export interface StedCenterSummaryStats {
  eligible: number
  assessed: number
  dueFollowUp: number
  referred: number
  coverageRate: number
}

export function computeStedCenterSummary(
  children: Child[],
  assessments: StedAssessment[],
  today = getTodayDate(),
): StedCenterSummaryStats {
  const eligible = getEligibleStedChildren(children, today)
  const assessedIds = new Set(
    assessments
      .filter((a) => eligible.some((c) => c.id === a.childId))
      .map((a) => a.childId),
  )
  const assessed = eligible.filter((c) => assessedIds.has(c.id)).length
  const dueFollowUp = getChildrenDueForStedFollowUp(children, assessments, today).length

  const latestByChild = new Map<string, StedAssessment>()
  for (const a of [...assessments].sort((x, y) =>
    y.assessmentDate.localeCompare(x.assessmentDate),
  )) {
    if (!latestByChild.has(a.childId)) latestByChild.set(a.childId, a)
  }
  let referred = 0
  for (const child of eligible) {
    const latest = latestByChild.get(child.id)
    if (latest?.outcome.referred) referred++
  }

  return {
    eligible: eligible.length,
    assessed,
    dueFollowUp,
    referred,
    coverageRate: eligible.length === 0 ? 0 : Math.round((assessed / eligible.length) * 100),
  }
}

export function countOyaResponses(assessment: StedAssessment): number {
  return Object.values(assessment.milestones).filter((a) => a === 'oya').length
}

export type StedListFilter = 'all' | 'due' | 'referred' | 'assessed'

export function filterStedChildren(
  children: Child[],
  assessments: StedAssessment[],
  filter: StedListFilter,
  today = getTodayDate(),
): Child[] {
  const eligible = getEligibleStedChildren(children, today)
  const dueIds = new Set(
    getChildrenDueForStedFollowUp(children, assessments, today).map(({ child }) => child.id),
  )

  const latestByChild = new Map<string, StedAssessment>()
  for (const a of [...assessments].sort((x, y) =>
    y.assessmentDate.localeCompare(x.assessmentDate),
  )) {
    if (!latestByChild.has(a.childId)) latestByChild.set(a.childId, a)
  }

  switch (filter) {
    case 'due':
      return eligible.filter((c) => dueIds.has(c.id))
    case 'referred':
      return eligible.filter((c) => latestByChild.get(c.id)?.outcome.referred)
    case 'assessed':
      return eligible.filter((c) => latestByChild.has(c.id))
    case 'all':
    default:
      return eligible
  }
}

export interface CenterStedComparison {
  centerId: string
  centerName: string
  sector: string
  eligible: number
  assessed: number
  coverageRate: number
  oyaResponses: number
  referralsCreated: number
  referralsCompleted: number
  referred: number
  openReferrals: number
  overdueFollowUp: number
}

export function computeCenterStedComparison(
  children: Child[],
  assessments: StedAssessment[],
  referrals: Referral[],
  centers: { id: string; name: string; sector: string }[],
  today = getTodayDate(),
): CenterStedComparison[] {
  return centers.map((center) => {
    const centerChildren = children.filter(
      (c) => c.centerId === center.id && c.status === 'active',
    )
    const eligible = getEligibleStedChildren(centerChildren, today)
    const centerAssessments = assessments.filter((a) => a.centerId === center.id)
    const assessedIds = new Set(centerAssessments.map((a) => a.childId))
    const assessed = eligible.filter((c) => assessedIds.has(c.id)).length
    const oyaResponses = centerAssessments.reduce(
      (sum, a) => sum + countOyaResponses(a),
      0,
    )
    const referred = centerAssessments.filter((a) => a.outcome.referred).length
    const childIds = new Set(centerChildren.map((c) => c.id))
    const centerReferrals = referrals.filter(
      (r) => r.sourceType === 'sted' && childIds.has(r.childId),
    )
    const referralsCreated = centerReferrals.length
    const referralsCompleted = centerReferrals.filter((r) => r.status === 'completed').length
    const openReferrals = centerReferrals.filter((r) => r.status === 'pending').length
    const overdueFollowUp = getChildrenDueForStedFollowUp(
      centerChildren,
      assessments,
      today,
    ).length
    return {
      centerId: center.id,
      centerName: center.name,
      sector: center.sector,
      eligible: eligible.length,
      assessed,
      coverageRate:
        eligible.length === 0 ? 0 : Math.round((assessed / eligible.length) * 100),
      oyaResponses,
      referralsCreated,
      referralsCompleted,
      referred,
      openReferrals,
      overdueFollowUp,
    }
  })
}

export function computeStedDistrictSummary(
  children: Child[],
  assessments: StedAssessment[],
  referrals: Referral[],
  today = getTodayDate(),
): {
  eligible: number
  screened: number
  coverageRate: number
  oyaResponses: number
  referralsCreated: number
  referralsCompleted: number
} {
  const eligible = getEligibleStedChildren(children.filter((c) => c.status === 'active'), today)
  const assessedIds = new Set(assessments.map((a) => a.childId))
  const screened = eligible.filter((c) => assessedIds.has(c.id)).length
  const oyaResponses = assessments.reduce((sum, a) => sum + countOyaResponses(a), 0)
  const stedReferrals = referrals.filter((r) => r.sourceType === 'sted')
  return {
    eligible: eligible.length,
    screened,
    coverageRate: eligible.length === 0 ? 0 : Math.round((screened / eligible.length) * 100),
    oyaResponses,
    referralsCreated: stedReferrals.length,
    referralsCompleted: stedReferrals.filter((r) => r.status === 'completed').length,
  }
}

export function setPhysicalPart(
  physical: StedPhysicalCheck,
  part: StedPhysicalPart,
  status: StedBodyPartStatus,
): StedPhysicalCheck {
  return { ...physical, [part]: status }
}

/** Reset all body parts to normal (bulk action in physical step). */
export function markAllPhysicalNormal(): StedPhysicalCheck {
  return emptyPhysicalCheck()
}
