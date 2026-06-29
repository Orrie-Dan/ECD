import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { common } from '@/locales/rw/common'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  loading?: boolean
}

export function PrimaryButton({
  children,
  loading = false,
  disabled,
  className = '',
  type = 'submit',
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`
        w-full min-h-11 px-5 rounded-lg
        bg-gov-primary text-white text-body font-bold
        border border-gov-primary shadow-sm
        transition-all duration-200 ease-out
        enabled:hover:bg-gov-primary-dark enabled:hover:border-gov-primary-dark enabled:hover:shadow-md
        enabled:active:shadow-sm
        disabled:opacity-55 disabled:cursor-not-allowed
        focus-visible:outline-3 focus-visible:outline-gov-primary focus-visible:outline-offset-2
        ${className}
      `}
      {...props}
    >
      {loading ? common.loading : children}
    </button>
  )
}
