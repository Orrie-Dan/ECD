import { type ReactNode, type HTMLAttributes } from 'react'

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary'

export type BadgeSize = 'sm' | 'md'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  children: ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-error-light text-error',
  info: 'bg-secondary-light text-secondary',
  neutral: 'bg-surface-muted text-text-muted',
  primary: 'bg-primary-light text-primary',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2.5 py-0.5 text-caption',
  md: 'px-3 py-1 text-caption',
}

/**
 * Shared status / label chip. Use semantic variants only.
 */
export function Badge({
  variant = 'neutral',
  size = 'sm',
  children,
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-semibold rounded-full whitespace-nowrap
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      role="status"
      {...props}
    >
      {children}
    </span>
  )
}
