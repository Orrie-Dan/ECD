import { Building2, CheckCircle2, AlertTriangle, Users, User, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { district } from '@/locales/rw/district'

interface SchoolsSummaryCardsProps {
  summary: {
    totalSchools: number
    goodSchools: number
    schoolsToFollowup: number
    totalChildren: number
    totalCaretakers: number
  }
  isLoading?: boolean
}

interface CardConfig {
  key: keyof SchoolsSummaryCardsProps['summary']
  label: string
  icon: LucideIcon
  variant: 'default' | 'success' | 'warning' | 'info'
}

const cards: CardConfig[] = [
  {
    key: 'totalSchools',
    label: district.schools.totalSchools,
    icon: Building2,
    variant: 'default',
  },
  {
    key: 'goodSchools',
    label: district.schools.goodSchools,
    icon: CheckCircle2,
    variant: 'success',
  },
  {
    key: 'schoolsToFollowup',
    label: district.schools.schoolsToFollowup,
    icon: AlertTriangle,
    variant: 'warning',
  },
  {
    key: 'totalChildren',
    label: district.schools.totalChildren,
    icon: Users,
    variant: 'info',
  },
  {
    key: 'totalCaretakers',
    label: district.schools.totalCaretakers,
    icon: User,
    variant: 'default',
  },
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

export function SchoolsSummaryCards({ summary, isLoading = false }: SchoolsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
      {cards.map(({ key, label, icon: Icon, variant }) => {
        const value = summary[key]
        const displayValue = value.toLocaleString()
        return (
          <Card
            key={key}
            padding="sm"
            className={`
              ${variantStyles[variant]}
              transition-all duration-200 hover:shadow-md
              ${isLoading ? 'opacity-60 pointer-events-none animate-pulse' : ''}
            `}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${iconStyles[variant]}`}
              >
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-caption font-medium text-text-secondary leading-tight line-clamp-2">
                  {label}
                </p>
                <p className="text-subheading sm:text-heading text-text mt-0.5">
                  {displayValue}
                </p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
