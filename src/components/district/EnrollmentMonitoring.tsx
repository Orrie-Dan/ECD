import { Link } from 'react-router-dom'
import { Baby, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ENROLLMENT_STATS } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'

interface EnrollmentMonitoringProps {
  compact?: boolean
}

export function EnrollmentMonitoring({ compact = false }: EnrollmentMonitoringProps) {
  const maxCount = Math.max(...ENROLLMENT_STATS.monthlyTrend.map((m) => m.count))

  if (compact) {
    return (
      <Card padding="md" className="h-full flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-body font-semibold text-text">{district.dashboard.enrollmentTitle}</h3>
          <Link
            to="/district/abana"
            className="text-caption font-semibold text-primary hover:underline shrink-0"
          >
            {district.dashboard.viewEnrollment}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg border border-border bg-background-subtle/50 px-3 py-2">
            <p className="text-caption text-text-secondary">{district.dashboard.newChildrenMonth}</p>
            <p className="text-heading text-text flex items-center gap-1.5 mt-0.5">
              <Baby size={16} className="text-primary" aria-hidden />
              {ENROLLMENT_STATS.newThisMonth}
            </p>
          </div>
          <div className="rounded-lg border border-success/20 bg-success-light/30 px-3 py-2">
            <p className="text-caption text-text-secondary">{district.dashboard.enrollmentGrowth}</p>
            <p className="text-heading text-success flex items-center gap-1.5 mt-0.5">
              <TrendingUp size={16} aria-hidden />
              +{ENROLLMENT_STATS.growthPercent}%
            </p>
          </div>
        </div>

        <div className="flex items-end gap-2 h-16 mb-3">
          {ENROLLMENT_STATS.monthlyTrend.map((month) => (
            <div key={month.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div
                className="w-full bg-primary rounded-t-md min-h-[4px]"
                style={{ height: `${(month.count / maxCount) * 100}%` }}
              />
              <span className="text-caption text-text-muted leading-none">{month.month.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        <ul className="space-y-1 mt-auto">
          {ENROLLMENT_STATS.topCenters.map((center) => (
            <li
              key={center.name}
              className="flex items-center justify-between px-2 py-1 rounded-md bg-background-subtle"
            >
              <span className="text-caption text-text truncate">{center.name}</span>
              <span className="text-caption font-bold text-primary shrink-0 ml-2">+{center.newChildren}</span>
            </li>
          ))}
        </ul>
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <h3 className="text-subheading text-text mb-5">{district.dashboard.enrollmentTitle}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-background-subtle/50 p-4">
          <p className="text-caption text-text-secondary">{district.dashboard.newChildrenMonth}</p>
          <p className="text-display text-text mt-1">{ENROLLMENT_STATS.newThisMonth}</p>
        </div>
        <div className="rounded-xl border border-success/20 bg-success-light/30 p-4">
          <p className="text-caption text-text-secondary">{district.dashboard.enrollmentGrowth}</p>
          <p className="text-display text-success mt-1">+{ENROLLMENT_STATS.growthPercent}%</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-body font-semibold text-text mb-3">{district.dashboard.enrollmentTrend}</p>
        <div className="flex items-end gap-3 h-32">
          {ENROLLMENT_STATS.monthlyTrend.map((month) => (
            <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-caption font-semibold text-primary">{month.count}</span>
              <div
                className="w-full bg-primary rounded-t-lg transition-all min-h-[8px]"
                style={{ height: `${(month.count / maxCount) * 100}%` }}
              />
              <span className="text-caption text-text-muted text-center leading-tight">{month.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-body font-semibold text-text mb-3">{district.dashboard.newChildrenMonth}</p>
        <ul className="space-y-2">
          {ENROLLMENT_STATS.topCenters.map((center) => (
            <li
              key={center.name}
              className="flex items-center justify-between p-3 rounded-lg bg-background-subtle"
            >
              <span className="text-body text-text">{center.name}</span>
              <span className="text-body font-bold text-primary">+{center.newChildren}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
