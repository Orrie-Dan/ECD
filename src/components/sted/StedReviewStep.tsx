import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { caretaker } from '@/locales/rw/caretaker'
import { common, gender as genderLabels } from '@/locales/rw/common'
import { calculateAge } from '@/lib/mock-data'
import {
  getMilestoneCodes,
  isAnswered,
  STED_PHYSICAL_PARTS,
} from '@/lib/sted-utils'
import type {
  Child,
  StedAgeBand,
  StedAnswer,
  StedPhysicalCheck,
  StedPhysicalPart,
} from '@/types'

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

function milestoneLabel(ageBand: StedAgeBand, code: string): string {
  if (ageBand === '1_3') {
    return (caretaker.sted.milestones1_3 as Record<string, string>)[code] ?? code
  }
  return (caretaker.sted.milestones4_6 as Record<string, string>)[code] ?? code
}

interface StedReviewStepProps {
  child: Child
  ageBand: StedAgeBand
  physical: StedPhysicalCheck
  milestones: Record<string, StedAnswer>
  onEditPhysical: () => void
  onEditMilestones: () => void
}

export function StedReviewStep({
  child,
  ageBand,
  physical,
  milestones,
  onEditPhysical,
  onEditMilestones,
}: StedReviewStepProps) {
  const codes = getMilestoneCodes(ageBand)
  const unanswered = codes.filter((code) => !isAnswered(milestones[code]))
  const bandLabel =
    ageBand === '1_3' ? caretaker.sted.ageBand1_3 : caretaker.sted.ageBand4_6
  const genderLabel =
    genderLabels[child.gender as keyof typeof genderLabels] ?? child.gender

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-subheading text-text">{caretaker.sted.stepReview}</h2>
        <p className="text-body text-text-secondary">{caretaker.sted.reviewHint}</p>
      </div>

      {unanswered.length > 0 && (
        <Alert
          variant="error"
          title={caretaker.sted.reviewUnanswered.replace('{count}', String(unanswered.length))}
        >
          <Button variant="secondary" size="sm" onClick={onEditMilestones}>
            {caretaker.sted.reviewEditMilestones}
          </Button>
        </Alert>
      )}

      {/* Child */}
      <section className="rounded-xl border border-border bg-background-subtle/50 p-4 space-y-3">
        <h3 className="text-label text-primary">{caretaker.sted.reviewChildSection}</h3>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <dt className="text-caption text-text-muted">{caretaker.sted.childName}</dt>
            <dd className="text-body font-semibold text-text mt-0.5">{child.fullName}</dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted">{caretaker.sted.childAge}</dt>
            <dd className="text-body font-semibold text-text mt-0.5 tabular-nums">
              {calculateAge(child.dateOfBirth)} {caretaker.sted.years}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted">{caretaker.sted.ageBand}</dt>
            <dd className="text-body font-semibold text-text mt-0.5">{bandLabel}</dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted">{common.labels.gender}</dt>
            <dd className="text-body font-semibold text-text mt-0.5">{genderLabel}</dd>
          </div>
        </dl>
      </section>

      {/* Physical */}
      <section className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-label text-primary">{caretaker.sted.stepPhysical}</h3>
          <Button variant="tertiary" size="sm" onClick={onEditPhysical}>
            {caretaker.sted.reviewEditPhysical}
          </Button>
        </div>
        <ul className="space-y-2">
          {STED_PHYSICAL_PARTS.map((part) => {
            const isProblem = physical[part] === 'problem'
            return (
              <li
                key={part}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                  isProblem
                    ? 'border-error/30 bg-error-light/25'
                    : 'border-border bg-background-subtle/40'
                }`}
              >
                <span className="text-body text-text">{PART_LABELS[part]}</span>
                <span
                  className={`text-caption font-semibold shrink-0 ${
                    isProblem ? 'text-error' : 'text-success'
                  }`}
                >
                  {isProblem ? caretaker.sted.problem : caretaker.sted.normal}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Development questions */}
      <section className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-label text-primary">{caretaker.sted.reviewMilestonesSection}</h3>
          <Button variant="tertiary" size="sm" onClick={onEditMilestones}>
            {caretaker.sted.reviewEditMilestones}
          </Button>
        </div>
        <ul className="space-y-2">
          {codes.map((code, index) => {
            const answer = milestones[code]
            const answered = isAnswered(answer)
            const isOya = answer === 'oya'
            return (
              <li
                key={code}
                className={`rounded-lg border px-3 py-3 space-y-2 ${
                  !answered
                    ? 'border-error/40 bg-error-light/30 ring-1 ring-error/20'
                    : isOya
                      ? 'border-warning/30 bg-warning-light/20'
                      : 'border-border bg-background-subtle/40'
                }`}
              >
                <p className="text-body text-text">
                  <span className="text-caption font-bold text-text-muted mr-2">
                    {index + 1}.
                  </span>
                  {milestoneLabel(ageBand, code)}
                </p>
                <p
                  className={`text-caption font-bold ${
                    !answered
                      ? 'text-error'
                      : isOya
                        ? 'text-warning'
                        : 'text-success'
                  }`}
                >
                  {answered
                    ? answer === 'yego'
                      ? caretaker.sted.yego
                      : caretaker.sted.oya
                    : caretaker.sted.reviewNoAnswer}
                </p>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
