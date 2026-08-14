import { Baby, CheckCircle2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { caretaker } from '@/locales/rw/caretaker'
import { getMilestoneCodes } from '@/lib/sted-utils'
import type { StedAgeBand } from '@/types'

interface StedAgeRoutingStepProps {
  ageBand: StedAgeBand
}

export function StedAgeRoutingStep({ ageBand }: StedAgeRoutingStepProps) {
  const bandLabel =
    ageBand === '1_3' ? caretaker.sted.ageBand1_3 : caretaker.sted.ageBand4_6
  const questionCount = getMilestoneCodes(ageBand).length
  const confirmText = caretaker.sted.ageRoutingConfirm.replace('{band}', bandLabel)
  const nextHint = caretaker.sted.ageRoutingNext.replace('{count}', String(questionCount))

  return (
    <div className="space-y-4">
      <p className="text-body text-text-secondary">{caretaker.sted.ageRoutingHint}</p>

      <div className="rounded-xl border-2 border-primary bg-primary-light/40 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/15 text-primary shrink-0"
            aria-hidden
          >
            <Baby size={22} />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
              {caretaker.sted.ageRoutingSelectedLabel}
            </p>
            <p className="text-subheading font-bold text-text">{bandLabel}</p>
            <p className="text-caption text-text-secondary">
              {ageBand === '1_3'
                ? caretaker.sted.ageBand1_3Hint
                : caretaker.sted.ageBand4_6Hint}
            </p>
          </div>
          <CheckCircle2 size={22} className="text-primary shrink-0 mt-1" aria-hidden />
        </div>

        <Alert variant="success" icon={null}>
          <p className="font-semibold text-text">{confirmText}</p>
          <p className="text-caption text-text-secondary mt-1">{nextHint}</p>
        </Alert>
      </div>

      <p className="text-caption text-text-muted">{caretaker.sted.ageRoutingContinueHint}</p>
    </div>
  )
}
