import type { ReactNode } from 'react'
import { Users } from 'lucide-react'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { caretaker } from '@/locales/rw/caretaker'

interface AttendanceGridProps {
  children: ReactNode
  empty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  loading?: boolean
  className?: string
  'aria-label'?: string
}

export function AttendanceGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
      aria-busy="true"
      aria-label={caretaker.children.loading}
      role="status"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} heightClass="h-60" lines={2} />
      ))}
    </div>
  )
}

/** Responsive equal-height grid for attendance cards. */
export function AttendanceGrid({
  children,
  empty = false,
  emptyTitle = caretaker.attendance.noChildren,
  emptyDescription = caretaker.attendance.noChildrenDesc,
  loading = false,
  className = '',
  'aria-label': ariaLabel,
}: AttendanceGridProps) {
  if (loading) {
    return <AttendanceGridSkeleton />
  }

  if (empty) {
    return (
      <EmptyState
        icon={<Users size={48} className="text-text-muted" strokeWidth={1.5} />}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}
