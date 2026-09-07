import { ncdaFollowUpPath, ncdaNutritionAlertsPath } from '@/lib/ncda-drill-down'
import { resolveAbsentDaysInWindow } from '@/lib/attendance-absence-days'
import { buildChildDetailPath, slugifyChildName } from '@/lib/child-routes'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { notificationsLocale as t } from '@/locales/rw/notifications'
import type { FollowUpAlertViewModel, FollowUpAlertsViewModel } from '@/models/alerts'
import type { Child } from '@/types'

export type FollowUpAlertKind =
  | 'referral_pending'
  | 'compliance_overdue'
  | 'attendance_missing_today'
  | 'attendance_absence_risk'
  | 'attendance_low_rate'
  | 'never_screened'
  | 'nutrition_severe'
  | 'nutrition_overdue'
  | 'nutrition_generic'
  | 'attendance_generic'
  | 'sted_generic'
  | 'transfer_generic'
  | 'compliance_generic'
  | 'capacity_generic'
  | 'data_quality_generic'
  | 'referral_generic'
  | 'generic'

export interface FormattedFollowUpAlert {
  heading: string
  detail: string
}

export type FollowUpAlertCounts = FollowUpAlertsViewModel['counts']

export interface ActionableFollowUpSummary {
  items: FollowUpAlertViewModel[]
  total: number
  counts: FollowUpAlertCounts
}

type ChildRef = Pick<Child, 'id' | 'status' | 'fullName'>

/** True when API put a registration/code placeholder in the child name field. */
export function isSyntheticChildLabel(name: string | null | undefined): boolean {
  if (!name?.trim()) return true
  const n = name.trim()
  if (/child-/i.test(n)) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(n)) {
    return true
  }
  // Codes like "S59A-msq74in5" with no real personal name
  if (!/\s/.test(n) && /\d/.test(n) && /[A-Za-z]/.test(n) && n.length >= 10) {
    return true
  }
  // "S59A Child-S59A-msq74in5" — token before Child- looks like a site code
  if (/^[A-Z0-9]{2,}\s+Child-/i.test(n)) return true
  return false
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]+/g, '_')
}

export function getFollowUpAlertKind(alert: FollowUpAlertViewModel): FollowUpAlertKind {
  const code = normalizeCode(alert.code)
  const blob = `${alert.title} ${alert.description}`.toLowerCase()

  if (
    code.includes('REFERRAL') ||
    blob.includes('referral pending') ||
    (alert.category === 'referral' && blob.includes('pending'))
  ) {
    return 'referral_pending'
  }
  if (
    code.includes('COMPLIANCE') ||
    blob.includes('compliance assessment') ||
    blob.includes('no recent compliance')
  ) {
    return 'compliance_overdue'
  }
  if (
    code.includes('ABSENCE_RISK') ||
    code.includes('REPEATED_ABSENCE') ||
    blob.includes('repeated absence') ||
    (blob.includes('absent') && blob.includes('last 7'))
  ) {
    return 'attendance_absence_risk'
  }
  if (
    code.includes('LOW_RATE') ||
    code.includes('LOW_ATTENDANCE') ||
    blob.includes('low attendance') ||
    (blob.includes('attendance is') && blob.includes('%'))
  ) {
    return 'attendance_low_rate'
  }
  if (
    code.includes('NO_ATTENDANCE_TODAY') ||
    code.includes('MISSING_TODAY') ||
    blob.includes('no attendance recorded') ||
    blob.includes('no attendance today')
  ) {
    return 'attendance_missing_today'
  }
  if (
    code.includes('NEVER_SCREEN') ||
    code.includes('STED_NEVER') ||
    blob.includes('never been screened') ||
    blob.includes('never screened') ||
    blob.includes('has never been screened')
  ) {
    return 'never_screened'
  }
  if (
    code.includes('NUTRITION_OVERDUE') ||
    code.includes('SCREENING_OVERDUE') ||
    code.includes('ASSESSMENT_OVERDUE') ||
    blob.includes("hasn't been screened") ||
    blob.includes('has not been screened') ||
    blob.includes('not been screened') ||
    blob.includes('screening overdue') ||
    blob.includes('assessment overdue') ||
    (blob.includes('screened') && blob.includes('days'))
  ) {
    return 'nutrition_overdue'
  }
  if (code.includes('NUTRITION_SEVERE') || blob.includes('severe malnutrition')) {
    return 'nutrition_severe'
  }
  if (code.includes('NUTRITION') || alert.category === 'nutrition') {
    return 'nutrition_generic'
  }
  if (alert.category === 'attendance') return 'attendance_generic'
  if (alert.category === 'sted') return 'sted_generic'
  if (alert.category === 'transfer') return 'transfer_generic'
  if (alert.category === 'compliance') return 'compliance_generic'
  if (alert.category === 'capacity') return 'capacity_generic'
  if (alert.category === 'data_quality') return 'data_quality_generic'
  if (alert.category === 'referral') return 'referral_generic'
  return 'generic'
}

function isCenterLevelKind(kind: FollowUpAlertKind): boolean {
  return (
    kind === 'attendance_missing_today' ||
    kind === 'attendance_low_rate' ||
    kind === 'attendance_generic' ||
    kind === 'compliance_overdue' ||
    kind === 'compliance_generic' ||
    kind === 'capacity_generic' ||
    kind === 'data_quality_generic'
  )
}

/**
 * Drop child alerts that are not actionable at this centre:
 * archived / transferred / missing from the local roster, or synthetic-only names.
 * Center-level alerts (attendance, compliance, …) always pass.
 */
export function isActionableFollowUpAlert(
  alert: FollowUpAlertViewModel,
  enrolledChildren?: readonly ChildRef[],
): boolean {
  const kind = getFollowUpAlertKind(alert)

  if (!alert.childId) {
    if (isCenterLevelKind(kind)) return true
    // Child-shaped copy without an id — hide synthetic placeholders
    return !isSyntheticChildLabel(alert.childName)
  }

  // Without a local roster (district/NCDA national views), keep the alert.
  if (!enrolledChildren) return true

  const local = enrolledChildren.find((c) => c.id === alert.childId)
  if (!local) return false
  return local.status === 'active'
}

/** Filter actionable alerts and recompute totals/category/high counts from that list. */
export function summarizeActionableFollowUpAlerts(
  alerts: readonly FollowUpAlertViewModel[],
  enrolledChildren?: readonly ChildRef[],
): ActionableFollowUpSummary {
  const items = alerts.filter((alert) => isActionableFollowUpAlert(alert, enrolledChildren))
  const counts: FollowUpAlertCounts = {
    nutrition: 0,
    attendance: 0,
    referral: 0,
    data_quality: 0,
    sted: 0,
    transfer: 0,
    compliance: 0,
    capacity: 0,
    high: 0,
  }

  for (const alert of items) {
    if (alert.category in counts) {
      counts[alert.category as keyof Omit<FollowUpAlertCounts, 'high'>] += 1
    }
    if (alert.priority === 'high') counts.high += 1
  }

  return { items, total: items.length, counts }
}

export function followUpChildDisplayName(
  alert: FollowUpAlertViewModel,
  enrolledChildren?: readonly ChildRef[],
): string {
  const local = alert.childId
    ? enrolledChildren?.find((c) => c.id === alert.childId)
    : undefined
  if (local?.fullName && !isSyntheticChildLabel(local.fullName)) {
    return local.fullName.trim()
  }
  if (alert.childName && !isSyntheticChildLabel(alert.childName)) {
    return alert.childName.trim()
  }
  return t.alerts.unnamedChild
}

function replaceTokens(
  template: string,
  tokens: Record<string, string | number>,
): string {
  return Object.entries(tokens).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

/** Translate common English API metric labels; leave unknown labels as-is. */
export function localizeFollowUpMetricLabel(label: string): string {
  const key = label.trim().toLowerCase().replace(/[\s_-]+/g, '')
  const map = t.alerts.metricLabels
  const byNormalized: Record<string, string> = {
    rate: map.rate,
    attendancerate: map.attendanceRate,
    attendance: map.attendance,
    days: map.days,
    absentdays: map.absentDays,
    daysabsent: map.absentDays,
    children: map.children,
    enrolled: map.enrolled,
    present: map.present,
    absent: map.absent,
    overdue: map.overdue,
    lastscreening: map.lastScreening,
    lastassessment: map.lastScreening,
    muac: map.muac,
    weight: map.weight,
    weightkg: map.weight,
    severity: map.severity,
  }
  return byNormalized[key] ?? label
}

function extractDays(text: string): number | null {
  const match = text.match(/(\d+)\s*\+?\s*days?/i)
  return match ? Number(match[1]) : null
}

function extractMonths(text: string): number | null {
  const match = text.match(/(\d+)\s*\+?\s*months?/i)
  return match ? Number(match[1]) : null
}

function extractRate(text: string): number | null {
  const match = text.match(/(\d{1,3})\s*%/)
  return match ? Number(match[1]) : null
}

/**
 * Localize follow-up alert copy and prefer real names from the local roster.
 */
export function formatFollowUpAlert(
  alert: FollowUpAlertViewModel,
  enrolledChildren?: readonly ChildRef[],
): FormattedFollowUpAlert {
  const kind = getFollowUpAlertKind(alert)
  const child = followUpChildDisplayName(alert, enrolledChildren)
  const center = alert.centerName?.trim() || t.alerts.unnamedCenter
  const days = extractDays(alert.description) ?? extractDays(alert.title)
  const months = extractMonths(alert.description) ?? extractMonths(alert.title) ?? 6
  const messages = t.alerts.messages

  switch (kind) {
    case 'referral_pending':
      return {
        heading: child,
        detail: replaceTokens(messages.referralPending, {
          name: child,
          days: days ?? '—',
        }),
      }
    case 'compliance_overdue':
      return {
        heading: messages.complianceOverdueTitle,
        detail: replaceTokens(messages.complianceOverdue, {
          center,
          months,
        }),
      }
    case 'attendance_missing_today':
      return {
        heading: messages.attendanceMissingTitle,
        detail: replaceTokens(messages.attendanceMissing, { center }),
      }
    case 'attendance_absence_risk':
      return {
        heading: child,
        detail: replaceTokens(messages.attendanceAbsenceRisk, {
          name: child,
          days: resolveAbsentDaysInWindow({
            description: alert.description,
            title: alert.title,
            metrics: alert.metrics,
          }),
        }),
      }
    case 'attendance_low_rate':
      return {
        heading: messages.attendanceLowRateTitle,
        detail: replaceTokens(messages.attendanceLowRate, {
          center,
          rate: extractRate(alert.description) ?? '—',
        }),
      }
    case 'never_screened':
      return {
        heading: child,
        detail: replaceTokens(messages.neverScreened, { name: child }),
      }
    case 'nutrition_severe':
      return {
        heading: child,
        detail: replaceTokens(messages.nutritionSevere, { name: child }),
      }
    case 'nutrition_overdue':
      return {
        heading: child !== t.alerts.unnamedChild ? child : messages.nutritionTitle,
        detail: replaceTokens(messages.nutritionOverdue, {
          name: child,
          days: days ?? '—',
        }),
      }
    case 'nutrition_generic':
      return {
        heading: child !== t.alerts.unnamedChild ? child : messages.nutritionTitle,
        detail: replaceTokens(messages.nutritionGeneric, { name: child, center }),
      }
    case 'attendance_generic':
      return {
        heading: messages.attendanceTitle,
        detail: replaceTokens(messages.attendanceGeneric, { center }),
      }
    case 'sted_generic':
      return {
        heading: child !== t.alerts.unnamedChild ? child : messages.stedTitle,
        detail: replaceTokens(messages.stedGeneric, { name: child }),
      }
    case 'transfer_generic':
      return {
        heading: child !== t.alerts.unnamedChild ? child : messages.transferTitle,
        detail: replaceTokens(messages.transferGeneric, { name: child }),
      }
    case 'compliance_generic':
      return {
        heading: messages.complianceTitle,
        detail: replaceTokens(messages.complianceGeneric, { center }),
      }
    case 'capacity_generic':
      return {
        heading: messages.capacityTitle,
        detail: replaceTokens(messages.capacityGeneric, { center }),
      }
    case 'data_quality_generic':
      return {
        heading: messages.dataQualityTitle,
        detail: replaceTokens(messages.dataQualityGeneric, { center }),
      }
    case 'referral_generic':
      return {
        heading: child,
        detail: replaceTokens(messages.referralGeneric, { name: child }),
      }
    default: {
      const scrub = (text: string) => {
        if (!text) return text
        let out = text
        if (alert.childName && isSyntheticChildLabel(alert.childName)) {
          out = out.split(alert.childName).join(child)
        }
        out = out.replace(/\b[A-Z0-9]{2,}\s+Child-[A-Za-z0-9_-]+\b/gi, child)
        out = out.replace(/\bChild-[A-Za-z0-9_-]+\b/gi, child)
        return out
      }
      const headingSource =
        child !== t.alerts.unnamedChild ? child : scrub(alert.title)
      return {
        heading:
          headingSource.trim() ||
          t.alerts.categories[alert.category] ||
          messages.genericTitle,
        detail: scrub(alert.description).trim() || scrub(alert.title),
      }
    }
  }
}

function childDetailHref(
  rolePrefix: string,
  alert: FollowUpAlertViewModel,
  enrolledChildren?: readonly ChildRef[],
  tab?: string,
): string | null {
  const local = alert.childId
    ? enrolledChildren?.find((c) => c.id === alert.childId && c.status === 'active')
    : undefined
  if (local) {
    return buildChildDetailPath(`${rolePrefix}/abana`, local, tab)
  }
  if (alert.childId) {
    const base = `${rolePrefix}/abana/${alert.childId}`
    return tab ? `${base}?tab=${encodeURIComponent(tab)}` : base
  }
  return null
}

/**
 * Deep-link each follow-up to the workflow page that resolves it.
 */
export function resolveFollowUpAlertPath(
  alert: FollowUpAlertViewModel,
  rolePrefix: string,
  enrolledChildren?: readonly ChildRef[],
): string {
  const kind = getFollowUpAlertKind(alert)
  const prefix = rolePrefix.replace(/\/$/, '') || '/caretaker'
  const childHref = (tab?: string) => childDetailHref(prefix, alert, enrolledChildren, tab)
  const local = alert.childId
    ? enrolledChildren?.find((c) => c.id === alert.childId && c.status === 'active')
    : undefined

  if (prefix === '/caretaker') {
    switch (kind) {
      case 'attendance_missing_today':
      case 'attendance_low_rate':
      case 'attendance_generic':
        return '/caretaker/ubwitabire'
      case 'attendance_absence_risk':
        return childHref('attendance') ?? '/caretaker/ubwitabire'
      case 'compliance_overdue':
      case 'compliance_generic':
        return '/caretaker/isuzuma'
      case 'never_screened':
      case 'sted_generic':
        if (local) {
          return `/caretaker/sted/new?child=${encodeURIComponent(slugifyChildName(local.fullName))}`
        }
        return '/caretaker/sted'
      case 'nutrition_severe':
      case 'nutrition_generic':
        return childHref('growth') ?? '/caretaker/imikurire'
      case 'referral_pending':
      case 'referral_generic':
        return childHref() ?? '/caretaker/abana'
      case 'transfer_generic':
        return '/caretaker/kwimura'
      case 'capacity_generic':
      case 'data_quality_generic':
        return '/caretaker/abana'
      default:
        return childHref() ?? '/caretaker/impugukirwa'
    }
  }

  if (prefix === '/district') {
    switch (kind) {
      case 'attendance_missing_today':
      case 'attendance_low_rate':
      case 'attendance_generic':
        return DISTRICT_PATHS.monitoringAttendance
      case 'attendance_absence_risk':
        return childHref('attendance') ?? DISTRICT_PATHS.monitoringAttendance
      case 'compliance_overdue':
      case 'compliance_generic':
        return DISTRICT_PATHS.followup
      case 'never_screened':
      case 'sted_generic':
        return childHref() ?? DISTRICT_PATHS.monitoringSted
      case 'nutrition_severe':
      case 'nutrition_generic':
        return childHref() ?? DISTRICT_PATHS.monitoringGrowth
      case 'referral_pending':
      case 'referral_generic':
        return `${DISTRICT_PATHS.followup}/ivuriro`
      case 'transfer_generic':
        return childHref() ?? DISTRICT_PATHS.followup
      case 'capacity_generic':
      case 'data_quality_generic':
        return alert.centerId
          ? `${DISTRICT_PATHS.centers}/${alert.centerId}`
          : DISTRICT_PATHS.centers
      default:
        return childHref() ??
          (alert.centerId
            ? `${DISTRICT_PATHS.centers}/${alert.centerId}`
            : DISTRICT_PATHS.followup)
    }
  }

  if (prefix === '/ncda') {
    switch (kind) {
      case 'compliance_overdue':
      case 'compliance_generic':
        return NCDA_PATHS.inspections
      case 'nutrition_severe':
      case 'nutrition_generic':
      case 'never_screened':
      case 'sted_generic':
      case 'referral_pending':
      case 'referral_generic':
        if (alert.childId) return `${NCDA_PATHS.children}/${alert.childId}`
        if (kind === 'nutrition_severe' || kind === 'nutrition_generic') {
          return ncdaNutritionAlertsPath(
            kind === 'nutrition_severe' ? { status: 'severe_nutrition' } : {},
          )
        }
        if (kind === 'referral_pending' || kind === 'referral_generic') {
          return ncdaFollowUpPath('referral')
        }
        return NCDA_PATHS.children
      case 'attendance_missing_today':
      case 'attendance_low_rate':
      case 'attendance_generic':
        return NCDA_PATHS.monitoringAttendance
      case 'attendance_absence_risk':
        return alert.childId
          ? `${NCDA_PATHS.children}/${alert.childId}`
          : NCDA_PATHS.monitoringAttendance
      case 'capacity_generic':
      case 'data_quality_generic':
        return alert.centerId ? `${NCDA_PATHS.centers}/${alert.centerId}` : NCDA_PATHS.centers
      default:
        return alert.childId
          ? `${NCDA_PATHS.children}/${alert.childId}`
          : alert.centerId
            ? `${NCDA_PATHS.centers}/${alert.centerId}`
            : NCDA_PATHS.followUp
    }
  }

  return childHref() ?? (prefix === '/ncda' ? NCDA_PATHS.followUp : `${prefix}/impugukirwa`)
}
