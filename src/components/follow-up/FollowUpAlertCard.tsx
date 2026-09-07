import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EnhancedPieChart } from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import {
  formatFollowUpAlert,
  getFollowUpAlertKind,
  isSyntheticChildLabel,
  localizeFollowUpMetricLabel,
} from '@/lib/follow-up-alerts'
import { buildChildDetailPath } from '@/lib/child-routes'
import type { FollowUpAlertCategory, FollowUpAlertViewModel } from '@/models/alerts'

export const OPERATIONAL_FOLLOW_UP_CATEGORIES = [
  'attendance',
  'nutrition',
  'data_quality',
] as const

export type OperationalFollowUpCategory = (typeof OPERATIONAL_FOLLOW_UP_CATEGORIES)[number]

export type FollowUpCopy = {
  filterAttendance: string
  filterNutrition: string
  filterDataQuality: string
  priorityHigh: string
  priorityMedium: string
  priorityLow: string
  detectedAt: string
  suggestedAction: string
  viewChild: string
  viewCenter: string
  totalAlerts: string
  highPriority: string
  chartByCategory: string
  chartByPriority: string
  chartEmpty: string
  chartEmptyDesc: string
  contactCenter: string
  verifyRecords: string
  supportCaretaker: string
  reviewNutrition: string
  actionAttendanceMissing: string
  actionAttendanceLowRate: string
  actionAttendanceAbsenceRisk: string
  actionNutritionSevere: string
  actionNutritionScreen: string
  actionDataQuality: string
}

const priorityStyles = {
  high: { emoji: '🔴', badge: 'bg-error !text-white border-error' },
  medium: { emoji: '🟡', badge: 'bg-warning !text-white border-warning' },
  low: { emoji: '🟢', badge: 'bg-success !text-white border-success' },
} as const

export function isOperationalFollowUpCategory(
  category: FollowUpAlertCategory,
): category is OperationalFollowUpCategory {
  return (OPERATIONAL_FOLLOW_UP_CATEGORIES as readonly string[]).includes(category)
}

export function suggestedActionForFollowUp(
  alert: FollowUpAlertViewModel,
  copy: FollowUpCopy,
): string {
  const kind = getFollowUpAlertKind(alert)
  switch (kind) {
    case 'attendance_missing_today':
      return copy.actionAttendanceMissing
    case 'attendance_low_rate':
      return copy.actionAttendanceLowRate
    case 'attendance_absence_risk':
      return copy.actionAttendanceAbsenceRisk
    case 'attendance_generic':
      return copy.contactCenter
    case 'nutrition_severe':
      return copy.actionNutritionSevere
    case 'nutrition_generic':
    case 'nutrition_overdue':
    case 'never_screened':
      return copy.actionNutritionScreen
    case 'data_quality_generic':
      return copy.actionDataQuality
    default:
      if (alert.category === 'attendance') return copy.contactCenter
      if (alert.category === 'nutrition') return copy.reviewNutrition
      if (alert.category === 'data_quality') return copy.verifyRecords
      return copy.supportCaretaker
  }
}

function formatDetectedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('rw-RW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function omitLeadingSubject(text: string, subjects: Array<string | null | undefined>): string {
  let out = text.trim()
  for (const subject of subjects) {
    const name = subject?.trim()
    if (!name || name.length < 2) continue
    if (out.toLowerCase().startsWith(name.toLowerCase())) {
      out = out.slice(name.length).replace(/^[\s,.:;—–-]+/u, '').trim()
      if (out) out = out.charAt(0).toUpperCase() + out.slice(1)
    }
  }
  return out || text.trim()
}

export function LiveFollowUpAlertCard({
  alert,
  copy,
  childrenBasePath,
  centersBasePath,
}: {
  alert: FollowUpAlertViewModel
  copy: FollowUpCopy
  childrenBasePath: string
  centersBasePath: string
}) {
  const style = priorityStyles[alert.priority]
  const formatted = formatFollowUpAlert(alert)
  const categoryLabels: Record<OperationalFollowUpCategory, string> = {
    attendance: copy.filterAttendance,
    nutrition: copy.filterNutrition,
    data_quality: copy.filterDataQuality,
  }
  const categoryLabel = isOperationalFollowUpCategory(alert.category)
    ? categoryLabels[alert.category]
    : alert.category

  const centerName = alert.centerName?.trim() || null
  const childName =
    alert.childName && !isSyntheticChildLabel(alert.childName) ? alert.childName.trim() : null

  const title = centerName || childName || formatted.heading
  const showChildLine = Boolean(childName && centerName && childName !== title)

  const bodyText = (() => {
    if (centerName && formatted.detail.includes(centerName) && formatted.heading !== centerName) {
      return formatted.heading
    }
    if (childName && (formatted.heading === childName || formatted.detail.includes(childName))) {
      return omitLeadingSubject(formatted.detail, [childName, centerName])
    }
    if (formatted.heading === title) {
      return omitLeadingSubject(formatted.detail, [title, centerName, childName])
    }
    const stripped = omitLeadingSubject(formatted.detail, [
      centerName,
      childName,
      formatted.heading,
    ])
    return stripped === formatted.heading ? formatted.heading : stripped
  })()

  const childHref =
    alert.childId && alert.childName
      ? buildChildDetailPath(childrenBasePath, {
          id: alert.childId,
          fullName: alert.childName,
        })
      : null
  const centerHref = alert.centerId ? `${centersBasePath}/${alert.centerId}` : null

  const body = (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-body font-bold text-text truncate">{title}</h3>
          <p className="text-caption text-text-secondary mt-1">
            {categoryLabel}
            {alert.detectedAt
              ? ` · ${copy.detectedAt} ${formatDetectedAt(alert.detectedAt)}`
              : ''}
          </p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full border shrink-0 text-[0.875rem] font-semibold ${style.badge}`}
        >
          <span aria-hidden>{style.emoji} </span>
          {alert.priority === 'high'
            ? copy.priorityHigh
            : alert.priority === 'medium'
              ? copy.priorityMedium
              : copy.priorityLow}
        </span>
      </div>

      {showChildLine ? (
        <p className="text-body font-semibold text-text mb-1.5">{childName}</p>
      ) : null}

      <p className="text-body text-text mb-3">{bodyText}</p>

      {alert.metrics.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {alert.metrics.map((metric) => (
            <span
              key={`${metric.label}-${metric.value}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-subtle text-caption"
            >
              <span className="text-text-secondary">
                {localizeFollowUpMetricLabel(metric.label)}:
              </span>
              <span className="font-bold text-text">{metric.value}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border border-primary/30 bg-primary-light shadow-sm px-4 py-3">
        <p className="text-[0.875rem] font-semibold text-primary mb-1">{copy.suggestedAction}</p>
        <p className="text-body text-primary leading-snug">
          {suggestedActionForFollowUp(alert, copy)}
        </p>
      </div>
    </div>
  )

  const footer = (label: string) => (
    <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-background-subtle/50 rounded-b-xl">
      <span className="text-caption font-semibold text-primary">{label}</span>
      <ChevronRight
        size={16}
        className="text-primary opacity-60 group-hover:opacity-100"
        aria-hidden
      />
    </div>
  )

  if (childHref) {
    return (
      <Link
        to={childHref}
        className="block rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-md transition-all group"
      >
        {body}
        {footer(copy.viewChild)}
      </Link>
    )
  }

  if (centerHref) {
    return (
      <Link
        to={centerHref}
        className="block rounded-xl border border-border bg-surface hover:border-primary/40 hover:shadow-md transition-all group"
      >
        {body}
        {footer(copy.viewCenter)}
      </Link>
    )
  }

  return <div className="rounded-xl border border-border bg-surface">{body}</div>
}

export function FollowUpCharts({
  categorySlices,
  items,
  copy,
}: {
  categorySlices: Array<{ name: string; value: number; color?: string }>
  items: Array<{ priority: 'high' | 'medium' | 'low' }>
  copy: FollowUpCopy
}) {
  const prioritySlices = [
    {
      name: copy.priorityHigh,
      value: items.filter((item) => item.priority === 'high').length,
      color: CHART_METRIC_COLORS.dropouts,
    },
    {
      name: copy.priorityMedium,
      value: items.filter((item) => item.priority === 'medium').length,
      color: CHART_METRIC_COLORS.alerts,
    },
    {
      name: copy.priorityLow,
      value: items.filter((item) => item.priority === 'low').length,
      color: CHART_METRIC_COLORS.attendance,
    },
  ]
  const emptyChart = {
    emptyMessage: copy.chartEmpty,
    emptyDescription: copy.chartEmptyDesc,
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card padding="md" className="space-y-2 bg-white">
        <h2 className="text-body font-semibold text-text">{copy.chartByCategory}</h2>
        <EnhancedPieChart
          data={categorySlices}
          ariaLabel={copy.chartByCategory}
          centerValue={String(categorySlices.reduce((sum, slice) => sum + slice.value, 0))}
          centerLabel={copy.totalAlerts}
          tone="white"
          {...emptyChart}
        />
      </Card>
      <Card padding="md" className="space-y-2 bg-white">
        <h2 className="text-body font-semibold text-text">{copy.chartByPriority}</h2>
        <EnhancedPieChart
          data={prioritySlices}
          ariaLabel={copy.chartByPriority}
          centerValue={String(prioritySlices[0]?.value ?? 0)}
          centerLabel={copy.highPriority}
          tone="white"
          {...emptyChart}
        />
      </Card>
    </div>
  )
}
