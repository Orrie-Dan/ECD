import { type HTMLAttributes } from 'react'
import { Card } from '@/components/ui/Card'
import { common } from '@/locales/rw/common'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional fixed width (CSS length). */
  width?: string | number
  /** Optional fixed height (CSS length). Default 1rem. */
  height?: string | number
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

const roundedClasses = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
}

/** Base shimmer block for loading placeholders. */
export function Skeleton({
  width,
  height = '1rem',
  rounded = 'md',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`bg-surface-muted animate-pulse ${roundedClasses[rounded]} ${className}`}
      style={{
        width: width ?? undefined,
        height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  )
}

interface SkeletonTextProps {
  lines?: number
  className?: string
}

/** Multi-line text placeholder. */
export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.875rem"
          width={i === lines - 1 && lines > 1 ? '66%' : '100%'}
        />
      ))}
    </div>
  )
}

interface SkeletonCardProps {
  className?: string
  /** Show avatar circle in the header row. */
  avatar?: boolean
  lines?: number
  /** Fixed card height (e.g. attendance cards). */
  heightClass?: string
}

/** Card-shaped loading placeholder using shared Card shell. */
export function SkeletonCard({
  className = '',
  avatar = true,
  lines = 2,
  heightClass = '',
}: SkeletonCardProps) {
  return (
    <Card padding="lg" className={`animate-pulse ${heightClass} ${className}`} elevated>
      <div className="flex gap-3">
        {avatar && <Skeleton width="3.5rem" height="3.5rem" rounded="lg" className="shrink-0" />}
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton height="1.125rem" width="70%" />
          <Skeleton height="0.75rem" width="40%" />
        </div>
      </div>
      {lines > 0 && (
        <div className="mt-4">
          <SkeletonText lines={lines} />
        </div>
      )}
    </Card>
  )
}

interface SkeletonPageProps {
  label?: string
  /** Number of summary/stat placeholders. */
  stats?: number
  /** Show a large content block (table/chart). */
  block?: boolean
  className?: string
}

/** Common page loading layout: stats row + optional large block. */
export function SkeletonPage({
  label = common.loading,
  stats = 4,
  block = true,
  className = '',
}: SkeletonPageProps) {
  return (
    <div className={`space-y-4 ${className}`} role="status" aria-busy="true" aria-label={label}>
      <div className={`grid gap-4 ${stats <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {Array.from({ length: stats }).map((_, i) => (
          <Skeleton key={i} height="6rem" rounded="lg" className="w-full" />
        ))}
      </div>
      {block && <Skeleton height="18rem" rounded="lg" className="w-full" />}
    </div>
  )
}
