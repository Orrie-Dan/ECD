import { Badge } from '@/components/ui/Badge'
import { caretaker } from '@/locales/rw/caretaker'
import type { NutritionStatus } from '@/types'

const VARIANT: Record<NutritionStatus, 'success' | 'warning' | 'danger'> = {
  normal: 'success',
  at_risk: 'warning',
  moderate: 'warning',
  severe: 'danger',
}

const LABELS: Record<NutritionStatus, string> = {
  normal: caretaker.growth.statusNormal,
  at_risk: caretaker.growth.statusAtRisk,
  moderate: caretaker.growth.statusModerate,
  severe: caretaker.growth.statusSevere,
}

interface GrowthStatusBadgeProps {
  status: NutritionStatus
  size?: 'sm' | 'md'
  className?: string
}

export function GrowthStatusBadge({
  status,
  size = 'sm',
  className = '',
}: GrowthStatusBadgeProps) {
  return (
    <Badge variant={VARIANT[status]} size={size} className={className} aria-label={LABELS[status]}>
      {LABELS[status]}
    </Badge>
  )
}
