import { ChildInfoCard, DetailRow } from '@/components/children/ChildInfoCard'
import { caretaker } from '@/locales/rw/caretaker'
import { common, getGuardianRelationLabel, normalizeGuardianRelation } from '@/locales/rw/common'
import type { Child } from '@/types'

interface GuardianCardProps {
  child: Child
  which: 1 | 2
}

export function GuardianCard({ child, which }: GuardianCardProps) {
  if (which === 2) {
    if (!child.guardian2Name) return null
    return (
      <ChildInfoCard title={caretaker.registration.guardian2Section}>
        <DetailRow label={common.labels.name} value={child.guardian2Name} />
        <DetailRow label={common.labels.phone} value={child.guardian2Phone ?? ''} />
        <DetailRow
          label={common.labels.relation}
          value={
            child.guardian2Relation
              ? getGuardianRelationLabel(
                  normalizeGuardianRelation(child.guardian2Relation) ?? child.guardian2Relation,
                )
              : ''
          }
        />
      </ChildInfoCard>
    )
  }

  return (
    <ChildInfoCard title={caretaker.registration.guardian1Section}>
      <DetailRow label={common.labels.name} value={child.guardianName} />
      <DetailRow label={common.labels.phone} value={child.guardianPhone} />
      <DetailRow
        label={common.labels.relation}
        value={getGuardianRelationLabel(
          normalizeGuardianRelation(child.guardianRelation) ?? child.guardianRelation,
        )}
      />
    </ChildInfoCard>
  )
}
