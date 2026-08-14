import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { caretaker } from '@/locales/rw/caretaker'
import { common, gender as genderLabels } from '@/locales/rw/common'
import { calculateAge } from '@/lib/mock-data'
import {
  buildDefaultOutcome,
  getMilestoneCodes,
  isAnswered,
  requiresStedReferral,
  STED_PHYSICAL_PARTS,
} from '@/lib/sted-utils'
import { getTodayDate } from '@/lib/nutrition-utils'
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

  const problemParts = STED_PHYSICAL_PARTS.filter((part) => physical[part] === 'problem')
  const oyaCodes = codes.filter((code) => milestones[code] === 'oya')
  const referred = requiresStedReferral(physical, milestones)
  const outcome = buildDefaultOutcome(physical, milestones, getTodayDate())

  return (
    <div className="space-y-6">
      <p className="text-body text-text-secondary">{caretaker.sted.reviewHint}</p>

      <section
        className={`rounded-xl border p-4 space-y-2 ${
          referred
            ? 'border-warning/40 bg-warning-light/25'
            : 'border-success/35 bg-success-light/20'
        }`}
        role="status"
      >
        <h3 className="text-label text-text">{caretaker.sted.outcomePreviewTitle}</h3>
        <div className="flex items-start gap-3">
          {referred ? (
            <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" aria-hidden />
          ) : (
            <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" aria-hidden />
          )}
          <div className="min-w-0 space-y-1">
            <p className={`text-body font-semibold ${referred ? 'text-warning' : 'text-success'}`}>
              {referred
                ? caretaker.sted.outcomePreviewReferral
                : caretaker.sted.outcomePreviewNormal}
            </p>
            {outcome.followUpIn6Months && outcome.followUpDueDate && (
              <p className="text-caption text-text-secondary">
                {caretaker.sted.outcomeFollowUp}
              </p>
            )}
            {referred && (
              <p className="text-caption text-text-secondary">
                {caretaker.sted.referralCreateHint}
              </p>
            )}
          </div>
        </div>
      </section>

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

      <section className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-label text-primary">{caretaker.sted.stepPhysical}</h3>
          <Button variant="tertiary" size="sm" onClick={onEditPhysical}>
            {caretaker.sted.reviewEditPhysical}
          </Button>
        </div>
        {problemParts.length === 0 ? (
          <p className="text-body text-success font-semibold">
            {caretaker.sted.reviewAllClearPhysical}
          </p>
        ) : (
          <>
            <p className="text-caption font-semibold text-text-secondary">
              {caretaker.sted.reviewAttentionSection}
            </p>
            <ul className="space-y-2">
              {problemParts.map((part) => (
                <li
                  key={part}
                  className="flex items-center justify-between gap-3 rounded-lg border border-error/30 bg-error-light/25 px-3 py-2.5"
                >
                  <span className="text-body text-text">{PART_LABELS[part]}</span>
                  <span className="text-caption font-semibold text-error shrink-0">
                    {caretaker.sted.problem}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-label text-primary">{caretaker.sted.reviewMilestonesSection}</h3>
          <Button variant="tertiary" size="sm" onClick={onEditMilestones}>
            {caretaker.sted.reviewEditMilestones}
          </Button>
        </div>
        {unanswered.length > 0 ? (
          <ul className="space-y-2">
            {unanswered.map((code) => (
              <li
                key={code}
                className="rounded-lg border border-error/40 bg-error-light/30 px-3 py-3"
              >
                <p className="text-body text-text">
                  <span className="text-caption font-bold text-text-muted mr-2">
                    {codes.indexOf(code) + 1}.
                  </span>
                  {milestoneLabel(ageBand, code)}
                </p>
                <p className="text-caption font-bold text-error mt-1">
                  {caretaker.sted.reviewNoAnswer}
                </p>
              </li>
            ))}
          </ul>
        ) : oyaCodes.length === 0 ? (
          <p className="text-body text-success font-semibold">{caretaker.sted.reviewAllYego}</p>
        ) : (
          <>
            <p className="text-caption font-semibold text-text-secondary">
              {caretaker.sted.reviewAttentionSection}
            </p>
            <ul className="space-y-2">
              {oyaCodes.map((code) => (
                <li
                  key={code}
                  className="rounded-lg border border-warning/30 bg-warning-light/20 px-3 py-3 space-y-1"
                >
                  <p className="text-body text-text">
                    <span className="text-caption font-bold text-text-muted mr-2">
                      {codes.indexOf(code) + 1}.
                    </span>
                    {milestoneLabel(ageBand, code)}
                  </p>
                  <p className="text-caption font-bold text-warning">{caretaker.sted.oya}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
