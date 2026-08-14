import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StedBinaryChoice } from '@/components/sted/StedBinaryChoice'
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

const PHYSICAL_GROUPS: { title: string; parts: StedPhysicalPart[] }[] = [
  {
    title: caretaker.sted.physicalSectionHeadNeck,
    parts: ['headFace', 'neck'],
  },
  {
    title: caretaker.sted.physicalSectionBody,
    parts: ['chest', 'abdomenBack', 'hips'],
  },
  {
    title: caretaker.sted.physicalSectionLimbs,
    parts: ['arms', 'legsFeet', 'genitals', 'skinHair'],
  },
]

interface StedPhysicalStepProps {
  physical: StedPhysicalCheck
  onChange: (part: StedPhysicalPart, status: StedBodyPartStatus) => void
  onMarkAllNormal: () => void
  noProblem: boolean
}

export function StedPhysicalStep({
  physical,
  onChange,
  onMarkAllNormal,
  noProblem,
}: StedPhysicalStepProps) {
  const problemCount = STED_PHYSICAL_PARTS.filter((part) => physical[part] === 'problem').length

  return (
    <div className="space-y-4">
      <p className="text-body text-text-secondary">{caretaker.sted.physicalHint}</p>

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

      {!noProblem && (
        <Button variant="secondary" size="md" fullWidth onClick={onMarkAllNormal}>
          {caretaker.sted.markAllNormal}
        </Button>
      )}

      {PHYSICAL_GROUPS.map((group) => (
        <section key={group.title} className="space-y-3">
          <h3 className="text-label text-text-secondary">{group.title}</h3>
          <div className="space-y-3">
            {group.parts.map((part) => {
              const isProblem = physical[part] === 'problem'
              return (
                <div
                  key={part}
                  className={`rounded-xl border p-4 space-y-3 transition-colors ${
                    isProblem
                      ? 'border-error/35 bg-error-light/20'
                      : 'border-border bg-surface'
                  }`}
                >
                  <p className="text-body font-semibold text-text">{PART_LABELS[part]}</p>
                  <StedBinaryChoice
                    value={physical[part]}
                    onChange={(status) => onChange(part, status)}
                    ariaLabel={PART_LABELS[part]}
                    options={[
                      {
                        value: 'normal',
                        label: caretaker.sted.normal,
                        tone: 'positive',
                      },
                      {
                        value: 'problem',
                        label: caretaker.sted.problem,
                        tone: 'negative',
                      },
                    ]}
                  />
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
