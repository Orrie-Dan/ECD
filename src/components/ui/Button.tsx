import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'danger'
  | 'outline'
  | 'ghost'

type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
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
    'bg-primary text-white border-primary shadow-sm enabled:hover:bg-primary-dark enabled:hover:border-primary-dark',
  secondary:
    'bg-surface text-primary border-2 border-primary shadow-sm enabled:hover:bg-primary-light enabled:hover:border-primary-dark',
  tertiary:
    'bg-transparent text-text-secondary border-transparent enabled:hover:bg-background-subtle enabled:hover:text-text enabled:hover:shadow-sm',
  success:
    'bg-success text-white border-success shadow-sm enabled:hover:bg-green-800 enabled:hover:border-green-800',
  danger:
    'bg-error text-white border-error shadow-sm enabled:hover:bg-red-800 enabled:hover:border-red-800',
  outline:
    'bg-surface text-primary border-2 border-primary shadow-sm enabled:hover:bg-primary-light enabled:hover:border-primary-dark',
  ghost:
    'bg-transparent text-text-secondary border-transparent enabled:hover:bg-background-subtle enabled:hover:text-text enabled:hover:shadow-sm',
}

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: '[&_svg]:size-4',
  md: '[&_svg]:size-5',
  lg: '[&_svg]:size-5',
  xl: '[&_svg]:size-6',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-3.5 text-sm rounded-lg',
  md: 'min-h-10 px-4 text-body rounded-xl',
  lg: 'min-h-11 px-5 text-body-lg rounded-xl',
  xl: 'min-h-12 px-6 text-subheading rounded-xl font-bold',
}

function resolveVariant(variant: ButtonVariant): ButtonVariant {
  if (variant === 'outline') return 'secondary'
  if (variant === 'ghost') return 'tertiary'
  return variant
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const resolved = resolveVariant(variant)

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
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0 flex items-center" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  )
}
