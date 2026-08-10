import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { caretaker } from '@/locales/rw/caretaker'
import { STED_PHYSICAL_PARTS } from '@/lib/sted-utils'
import type { StedBodyPartStatus, StedPhysicalCheck, StedPhysicalPart } from '@/types'

const PART_LABELS: Record<StedPhysicalPart, string> = {
  headFace: caretaker.sted.headFace,
  neck: caretaker.sted.neck,
  arms: caretaker.sted.arms,
  chest: caretaker.sted.chest,
  abdomenBack: caretaker.sted.abdomenBack,
  hips: caretaker.sted.hips,
  legsFeet: caretaker.sted.legsFeet,
  genitals: caretaker.sted.genitals,
  skinHair: caretaker.sted.skinHair,
}

interface StedPhysicalStepProps {
  physical: StedPhysicalCheck
  onChange: (part: StedPhysicalPart, status: StedBodyPartStatus) => void
  noProblem: boolean
}

export function StedPhysicalStep({ physical, onChange, noProblem }: StedPhysicalStepProps) {
  const problemCount = STED_PHYSICAL_PARTS.filter((part) => physical[part] === 'problem').length

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-subheading text-text">{caretaker.sted.stepPhysical}</h2>
        <p className="text-body text-text-secondary">{caretaker.sted.physicalHint}</p>
      </div>

      {noProblem ? (
        <div
          className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-light/40 px-4 py-3"
          role="status"
        >
          <CheckCircle2 size={20} className="text-success shrink-0" aria-hidden />
          <p className="text-body font-semibold text-success">{caretaker.sted.noProblem}</p>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-light/40 px-4 py-3"
          role="status"
        >
          <AlertTriangle size={20} className="text-warning shrink-0" aria-hidden />
          <p className="text-body font-semibold text-warning">
            {problemCount} · {caretaker.sted.problem}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {STED_PHYSICAL_PARTS.map((part) => {
          const isNormal = physical[part] === 'normal'
          const isProblem = physical[part] === 'problem'
          return (
            <div
              key={part}
              className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                isProblem
                  ? 'border-error/35 bg-error-light/20'
                  : isNormal
                    ? 'border-success/25 bg-success-light/15'
                    : 'border-border bg-surface hover:border-primary/25 hover:bg-background-subtle/60'
              }`}
            >
              <p className="text-body font-semibold text-text">{PART_LABELS[part]}</p>
              <div className="flex gap-2 w-full sm:w-auto" role="group" aria-label={PART_LABELS[part]}>
                <button
                  type="button"
                  onClick={() => onChange(part, 'normal')}
                  aria-pressed={isNormal}
                  className={`flex-1 sm:flex-none min-h-11 min-w-22 rounded-lg px-4 py-2.5 text-caption font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40 focus-visible:ring-offset-1 ${
                    isNormal
                      ? 'border-success/40 bg-success-light text-success'
                      : 'border-transparent bg-background-subtle text-text-secondary hover:border-success/30 hover:bg-success-light hover:text-success'
                  }`}
                >
                  {caretaker.sted.normal}
                </button>
                <button
                  type="button"
                  onClick={() => onChange(part, 'problem')}
                  aria-pressed={isProblem}
                  className={`flex-1 sm:flex-none min-h-11 min-w-22 rounded-lg px-4 py-2.5 text-caption font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40 focus-visible:ring-offset-1 ${
                    isProblem
                      ? 'border-error/40 bg-error-light text-error'
                      : 'border-transparent bg-background-subtle text-text-secondary hover:border-error/30 hover:bg-error-light hover:text-error'
                  }`}
                >
                  {caretaker.sted.problem}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
