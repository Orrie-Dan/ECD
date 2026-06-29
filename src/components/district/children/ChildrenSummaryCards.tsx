import { Users, UserPlus, UserMinus, TrendingUp, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { TrendBadge } from '@/components/district/TrendBadge'
import { district } from '@/locales/rw/district'
import type { EnrollmentPeriodSummary } from '@/types'

interface ChildrenSummaryCardsProps {
  summary: EnrollmentPeriodSummary
  isLoading?: boolean
}

const cards: {
  key: keyof EnrollmentPeriodSummary['trends']
  labelKey: 'totalEnrolled' | 'newRegistrations' | 'dropouts' | 'netGrowth'
  icon: LucideIcon
  variant: 'default' | 'info' | 'warning' | 'success'
}[] = [
  { key: 'totalEnrolled', labelKey: 'totalEnrolled', icon: Users, variant: 'default' },
  { key: 'newRegistrations', labelKey: 'newRegistrations', icon: UserPlus, variant: 'info' },
  { key: 'dropouts', labelKey: 'dropouts', icon: UserMinus, variant: 'warning' },
  { key: 'netGrowth', labelKey: 'netGrowth', icon: TrendingUp, variant: 'success' },
]

const variantStyles = {
  default: 'border-border bg-surface hover:border-primary/25',
  info: 'border-secondary/20 bg-secondary-light/30 hover:border-secondary/40',
  warning: 'border-warning/20 bg-warning-light/30 hover:border-warning/40',
  success: 'border-success/20 bg-success-light/30 hover:border-success/40',
}

const iconStyles = {
  default: 'bg-background-subtle text-primary',
  info: 'bg-secondary-light text-secondary',
  warning: 'bg-warning-light text-warning',
  success: 'bg-success-light text-success',
}

export function ChildrenSummaryCards({ summary, isLoading = false }: ChildrenSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {cards.map(({ key, labelKey, icon: Icon, variant }, index) => {
        const trend = summary.trends[key]
        const value = summary[key as keyof Pick<EnrollmentPeriodSummary, 'totalEnrolled' | 'newRegistrations' | 'dropouts' | 'netGrowth'>]
        const displayValue =
          key === 'netGrowth'
            ? (value as number) >= 0
              ? `+${value}`
              : String(value)
            : (value as number).toLocaleString()

        return (
          <Card
            key={key}
            padding="md"
            className={`
              ${variantStyles[variant]}
              transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
              ${isLoading ? 'opacity-60 pointer-events-none' : ''}
            `}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${iconStyles[variant]}`}
              >
                <Icon size={22} strokeWidth={2} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-caption font-medium text-text-secondary leading-tight">
                  {district.children[labelKey]}
                </p>
                <p
                  className="text-heading sm:text-display text-text mt-1 transition-all duration-500"
                  aria-live="polite"
                >
                  {displayValue}
                </p>
                <div className="mt-2">
                  <TrendBadge direction={trend.direction} change={trend.change} />
                </div>
                <p className="text-caption text-text-muted mt-1.5">{district.children.vsPreviousPeriod}</p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
