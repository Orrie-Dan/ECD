import { Badge } from '@/components/ui/Badge'
import { childStatus } from '@/locales/rw/common'
import type { ChildStatus } from '@/types'

const VARIANT: Record<ChildStatus, 'success' | 'info' | 'neutral'> = {
  active: 'success',
  transferred: 'info',
  archived: 'neutral',
}

interface StatusBadgeProps {
  status: ChildStatus
  className?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, className = '', size = 'sm' }: StatusBadgeProps) {
  return (
    <Badge
      variant={VARIANT[status]}
      size={size}
      className={className}
      aria-label={childStatus[status]}
    >
      {childStatus[status]}
    </Badge>
  )
}
