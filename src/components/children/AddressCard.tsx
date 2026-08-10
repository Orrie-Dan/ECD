import { ChildInfoCard, DetailRow } from '@/components/children/ChildInfoCard'
import { caretaker } from '@/locales/rw/caretaker'
import { location } from '@/locales/rw/common'
import type { Child } from '@/types'

interface AddressCardProps {
  child: Child
}

export function AddressCard({ child }: AddressCardProps) {
  return (
    <ChildInfoCard title={caretaker.registration.reviewLocation}>
      <DetailRow label={location.province} value={child.province} />
      <DetailRow label={location.district} value={child.district} />
      <DetailRow label={location.sector} value={child.sector} />
      <DetailRow label={location.cell} value={child.cell} />
      <DetailRow label={location.village} value={child.village} />
    </ChildInfoCard>
  )
}
