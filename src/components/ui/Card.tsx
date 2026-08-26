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

interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/** Standard card header — title row / actions. Use with padding="none" on Card. */
export function CardHeader({ children, className = '', ...props }: CardSectionProps) {
  return (
    <div
      className={`flex flex-col gap-1 px-4 pt-4 pb-3 sm:px-5 sm:pt-5 border-b border-border ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

/** Standard card body. Use with padding="none" on Card. */
export function CardContent({ children, className = '', ...props }: CardSectionProps) {
  return (
    <div className={`px-4 py-4 sm:px-5 ${className}`} {...props}>
      {children}
    </div>
  )
}

/** Standard card footer — actions. Use with padding="none" on Card. */
export function CardFooter({ children, className = '', ...props }: CardSectionProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5 border-t border-border bg-surface-muted/40 ${className}`}
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
  teal: { bg: 'bg-success-light', icon: 'text-success', border: 'hover:border-success/40' },
  amber: { bg: 'bg-accent-light', icon: 'text-accent', border: 'hover:border-accent/40' },
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
          <h3 className="text-subheading text-text mb-1 wrap-break-word">{title}</h3>
          <p className="text-body text-text-secondary wrap-break-word">{description}</p>
        </div>
        <ChevronRight
          size={22}
          className="text-text-muted shrink-0"
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
  variant?: 'default' | 'success' | 'warning' | 'info' | 'danger'
  compact?: boolean
  /** Solid semantic fill with white numbers/labels. */
  filled?: boolean
  /** When set, the card becomes a filter/toggle control. */
  onClick?: () => void
  selected?: boolean
  'aria-label'?: string
}

const statVariants = {
  default: 'border-border',
  success: 'border-success/20 bg-success-light/30',
  warning: 'border-warning/20 bg-warning-light/30',
  info: 'border-secondary/20 bg-secondary-light/30',
  danger: 'border-error/20 bg-error-light/30',
}

const statFilledVariants = {
  default: '!border-primary !bg-primary',
  success: '!border-success !bg-success',
  warning: '!border-warning !bg-warning',
  info: '!border-secondary !bg-secondary',
  danger: '!border-error !bg-error',
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  variant = 'default',
  compact = false,
  filled = false,
  onClick,
  selected = false,
  'aria-label': ariaLabel,
}: StatCardProps) {
  const selectedRing = selected
    ? 'ring-2 ring-primary ring-offset-2 border-primary shadow-md'
    : ''
  const surface = filled ? statFilledVariants[variant] : statVariants[variant]

  const content = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p
          className={`font-medium uppercase tracking-wide leading-tight ${
            filled
              ? 'text-[0.875rem] !text-white/90'
              : `text-caption text-text-secondary ${compact ? 'leading-tight' : ''}`
          }`}
        >
          {label}
        </p>
        <p
          className={`tabular-nums break-all ${compact ? 'text-heading mt-0.5' : 'text-display mt-0.5'} ${
            filled ? '!text-white' : 'text-text'
          }`}
        >
          {value}
        </p>
        {trend && (
          <p className={`mt-1 ${filled ? 'text-[0.875rem] !text-white/90' : 'text-caption'}`}>{trend}</p>
        )}
      </div>
      {icon && (
        <div
          className={`flex items-center justify-center rounded-lg shrink-0 ${
            compact ? 'w-10 h-10' : 'w-12 h-12 rounded-xl'
          } ${
            filled
              ? 'bg-white/15 border border-white/25'
              : 'bg-surface shadow-sm border border-border'
          }`}
        >
          {icon}
        </div>
      )}
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        aria-label={ariaLabel ?? label}
        className={`w-full h-full text-left rounded-xl border transition-all focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 ${surface} ${selectedRing} ${
          compact ? 'p-3' : 'p-5'
        } hover:shadow-md`}
      >
        {content}
      </button>
    )
  }

  return (
    <Card className={`${surface} ${selectedRing}`} padding={compact ? 'sm' : 'md'}>
      {content}
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
    <Card padding="none">
      <CardHeader>
        <h2 className="text-heading text-text">{title}</h2>
        {description && (
          <p className="text-body text-text-secondary mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  )
}
