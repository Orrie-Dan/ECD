import { type ReactNode, type HTMLAttributes } from 'react'
import { ChevronRight } from 'lucide-react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  elevated?: boolean
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
}

export function Card({
  children,
  padding = 'md',
  hover = false,
  elevated = true,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-surface rounded-xl border border-border
        ${elevated ? 'shadow-card' : ''}
        ${paddingClasses[padding]}
        ${hover ? 'hover:border-primary/30 hover:shadow-md transition-all duration-150 cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

type ActionCardAccent = 'green' | 'blue' | 'teal' | 'amber'

interface ActionCardProps {
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
  accent?: ActionCardAccent
}

const accentStyles: Record<ActionCardAccent, { bg: string; icon: string; border: string }> = {
  green: { bg: 'bg-primary-light', icon: 'text-primary', border: 'hover:border-primary/40' },
  blue: { bg: 'bg-secondary-light', icon: 'text-secondary', border: 'hover:border-secondary/40' },
  teal: { bg: 'bg-emerald-50', icon: 'text-emerald-700', border: 'hover:border-emerald-300' },
  amber: { bg: 'bg-accent-light', icon: 'text-accent', border: 'hover:border-amber-300' },
}

export function ActionCard({ icon, title, description, onClick, accent = 'green' }: ActionCardProps) {
  const style = accentStyles[accent]

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left bg-surface rounded-xl border border-border p-4 sm:p-5
        shadow-card min-h-[88px] group
        transition-all duration-200 ease-out cursor-pointer
        hover:scale-[1.02] hover:shadow-md active:scale-[0.98] active:shadow-sm
        focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
        ${style.border}
      `}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-lg ${style.bg} ${style.icon} shrink-0 transition-transform group-hover:scale-105`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-subheading text-text mb-1">{title}</h3>
          <p className="text-body text-text-secondary">{description}</p>
        </div>
        <ChevronRight
          size={22}
          className="text-text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
          aria-hidden="true"
        />
      </div>
    </button>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: string
  variant?: 'default' | 'success' | 'warning' | 'info'
}

const statVariants = {
  default: 'border-border',
  success: 'border-success/20 bg-success-light/30',
  warning: 'border-warning/20 bg-warning-light/30',
  info: 'border-secondary/20 bg-secondary-light/30',
}

export function StatCard({ label, value, icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <Card className={statVariants[variant]} padding="md">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-caption font-medium uppercase tracking-wide">{label}</p>
          <p className="text-display text-text">{value}</p>
          {trend && <p className="text-caption mt-2">{trend}</p>}
        </div>
        {icon && (
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-surface shadow-sm border border-border shrink-0">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <Card padding="lg" className="space-y-6">
      <div className="pb-2 border-b border-border">
        <h2 className="text-heading text-text">{title}</h2>
        {description && (
          <p className="text-body text-text-secondary mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </Card>
  )
}
