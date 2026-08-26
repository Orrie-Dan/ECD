import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { common } from '@/locales/rw/common'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'danger'
  | 'ghost'
  | 'success'
  | 'tertiary'

type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

const baseClasses = `
  inline-flex items-center justify-center gap-2.5 border font-semibold
  transition-all duration-200 ease-out
  cursor-pointer select-none
  enabled:hover:scale-[1.02] enabled:hover:shadow-md
  enabled:active:scale-[0.98] enabled:active:shadow-sm
  disabled:opacity-55 disabled:cursor-not-allowed
  disabled:hover:scale-100 disabled:hover:shadow-none disabled:active:scale-100
  focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
`

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary !text-white border-primary shadow-sm enabled:hover:bg-primary-dark enabled:hover:border-primary-dark [&_*]:!text-white',
  secondary:
    'bg-primary-light text-primary border-primary/30 shadow-sm enabled:hover:bg-primary-light enabled:hover:border-primary enabled:hover:shadow-md',
  outline:
    'bg-surface text-primary border-2 border-primary shadow-sm enabled:hover:bg-primary-light enabled:hover:border-primary-dark',
  danger:
    'bg-error !text-white border-error shadow-sm enabled:hover:bg-error-dark enabled:hover:border-error-dark [&_*]:!text-white',
  ghost:
    'bg-transparent text-text-secondary border-transparent enabled:hover:bg-surface-muted enabled:hover:text-text enabled:hover:shadow-sm',
  success:
    'bg-success !text-white border-success shadow-sm enabled:hover:bg-success-dark enabled:hover:border-success-dark [&_*]:!text-white',
  tertiary:
    'bg-transparent text-text-secondary border-transparent enabled:hover:bg-surface-muted enabled:hover:text-text enabled:hover:shadow-sm',
}

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: '[&_svg]:size-4',
  md: '[&_svg]:size-5',
  lg: '[&_svg]:size-5',
  xl: '[&_svg]:size-6',
}

/** Caretaker targets ≥52px (md+); sm stays ≥44px for compact chrome. */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3.5 text-[0.875rem] leading-5 rounded-lg',
  md: 'min-h-[3.25rem] px-5 text-body rounded-xl',
  lg: 'min-h-[3.25rem] px-5 text-body-lg rounded-xl',
  xl: 'min-h-14 px-6 text-subheading rounded-xl font-bold',
}

function resolveVariant(variant: ButtonVariant): ButtonVariant {
  if (variant === 'tertiary') return 'ghost'
  return variant
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const resolved = resolveVariant(variant)
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      className={`
        ${baseClasses}
        ${variantClasses[resolved]}
        ${sizeClasses[size]}
        ${iconSizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {icon && !loading && (
        <span className="shrink-0 flex items-center" aria-hidden="true">
          {icon}
        </span>
      )}
      {loading ? common.loading : children}
    </button>
  )
}
