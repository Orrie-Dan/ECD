import { type ReactNode, type HTMLAttributes } from 'react'

interface PageShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/**
 * Standard page root inside role layouts.
 * Layouts already provide max-width + padding — this only structures content.
 */
export function PageContainer({ children, className = '', ...props }: PageShellProps) {
  return (
    <div className={`page-container ${className}`} {...props}>
      {children}
    </div>
  )
}

/** Main content region below PageHeader. */
export function PageContent({ children, className = '', ...props }: PageShellProps) {
  return (
    <div className={`w-full min-w-0 ${className}`} {...props}>
      {children}
    </div>
  )
}
