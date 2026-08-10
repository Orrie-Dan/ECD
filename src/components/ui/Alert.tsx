import { type ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { common } from '@/locales/rw/common'

export type AlertVariant = 'success' | 'warning' | 'error' | 'info'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  /** Override default leading icon. Pass null to hide. */
  icon?: ReactNode | null
  onDismiss?: () => void
  className?: string
  role?: 'alert' | 'status'
}

const variantStyles: Record<
  AlertVariant,
  { shell: string; icon: string; title: string; body: string }
> = {
  success: {
    shell: 'border-success/30 bg-success-light/40',
    icon: 'text-success',
    title: 'text-success',
    body: 'text-success',
  },
  warning: {
    shell: 'border-warning/30 bg-warning-light/40',
    icon: 'text-warning',
    title: 'text-warning',
    body: 'text-warning',
  },
  error: {
    shell: 'border-danger/30 bg-danger-light',
    icon: 'text-danger',
    title: 'text-danger',
    body: 'text-danger',
  },
  info: {
    shell: 'border-secondary/30 bg-secondary-light/50',
    icon: 'text-secondary',
    title: 'text-secondary',
    body: 'text-secondary',
  },
}

const defaultIcons: Record<AlertVariant, ReactNode> = {
  success: <CheckCircle2 size={20} strokeWidth={2} aria-hidden />,
  warning: <AlertTriangle size={20} strokeWidth={2} aria-hidden />,
  error: <AlertCircle size={20} strokeWidth={2} aria-hidden />,
  info: <Info size={20} strokeWidth={2} aria-hidden />,
}

/**
 * Inline banner for validation, sync, offline, and feedback messages.
 */
export function Alert({
  variant = 'info',
  title,
  children,
  icon,
  onDismiss,
  className = '',
  role = variant === 'error' ? 'alert' : 'status',
}: AlertProps) {
  const styles = variantStyles[variant]
  const leading = icon === null ? null : (icon ?? defaultIcons[variant])

  return (
    <div
      className={`
        flex gap-3 rounded-xl border px-4 py-3
        ${styles.shell}
        ${className}
      `}
      role={role}
    >
      {leading && (
        <span className={`shrink-0 mt-0.5 ${styles.icon}`} aria-hidden="true">
          {leading}
        </span>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-body font-semibold ${styles.title}`}>{title}</p>
        )}
        <div className={`text-body font-medium ${styles.body} ${title ? 'mt-0.5' : ''}`}>
          {children}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={`
            shrink-0 touch-target inline-flex items-center justify-center rounded-lg
            ${styles.icon} hover:bg-surface/50
            focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
          `}
          aria-label={common.close}
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  )
}
