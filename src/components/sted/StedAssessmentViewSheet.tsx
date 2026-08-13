import { useEffect } from 'react'
import { X, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'
import { common, gender as genderLabels } from '@/locales/rw/common'
import { calculateAge, formatDate } from '@/lib/mock-data'
import {
  getMilestoneCodes,
  isAnswered,
  STED_PHYSICAL_PARTS,
} from '@/lib/sted-utils'
import type {
  Child,
  StedAgeBand,
  StedAssessment,
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

function outcomeLabel(assessment: StedAssessment): string {
  if (assessment.outcome.referred) return caretaker.sted.outcomeReferred
  if (assessment.outcome.normal) return caretaker.sted.outcomeNormal
  if (assessment.outcome.counseling) return caretaker.sted.outcomeCounseling
  return caretaker.sted.outcomeOther
}

function outcomeBadgeVariant(
  assessment: StedAssessment,
): 'success' | 'warning' | 'neutral' {
  if (assessment.outcome.referred) return 'warning'
  if (assessment.outcome.normal) return 'success'
  return 'neutral'
}

interface StedAssessmentViewSheetProps {
  open: boolean
  child: Child | null
  assessment: StedAssessment | null
  onClose: () => void
}

export function StedAssessmentViewSheet({
  open,
  child,
  assessment,
  onClose,
}: StedAssessmentViewSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open || !child || !assessment) return null

  const bandLabel =
    assessment.ageBand === '1_3'
      ? caretaker.sted.ageBand1_3
      : caretaker.sted.ageBand4_6
  const genderLabel =
    genderLabels[child.gender as keyof typeof genderLabels] ?? child.gender
  const codes = getMilestoneCodes(assessment.ageBand)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sted-view-title"
    >
      <div
        className="absolute inset-0 bg-text/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <Card
        padding="none"
        className="relative w-full max-w-2xl max-h-[min(90vh,100dvh)] flex flex-col shadow-lg rounded-t-2xl sm:rounded-xl"
        elevated
      >
        <CardHeader className="shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <h2 id="sted-view-title" className="text-heading text-text truncate">
                {child.fullName}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={outcomeBadgeVariant(assessment)} size="sm">
                  {outcomeLabel(assessment)}
                </Badge>
                <Badge variant="neutral" size="sm">
                  {bandLabel}
                </Badge>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-text-muted hover:bg-surface-muted focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 shrink-0"
              aria-label={common.close}
            >
              <X size={22} />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted/60 border border-border">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-light text-primary shrink-0">
                <Calendar size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-caption text-text-muted">{caretaker.sted.assessmentDate}</p>
                <p className="text-body font-semibold text-text mt-0.5">
                  {formatDate(assessment.assessmentDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted/60 border border-border">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary-light text-secondary shrink-0">
                <User size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-caption text-text-muted">{caretaker.sted.assessedBy}</p>
                <p className="text-body font-semibold text-text mt-0.5 truncate">
                  {assessment.assessedBy ?? '—'}
                </p>
              </div>
            </div>
          </div>

          <section className="rounded-xl border border-border bg-background-subtle/50 p-4 space-y-3">
            <h3 className="text-label text-primary">{caretaker.sted.reviewChildSection}</h3>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-caption text-text-muted">{caretaker.sted.childAge}</dt>
                <dd className="text-body font-semibold text-text mt-0.5 tabular-nums">
                  {calculateAge(child.dateOfBirth)} {caretaker.sted.years}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-text-muted">{common.labels.gender}</dt>
                <dd className="text-body font-semibold text-text mt-0.5">{genderLabel}</dd>
              </div>
              <div>
                <dt className="text-caption text-text-muted">{caretaker.sted.ageBand}</dt>
                <dd className="text-body font-semibold text-text mt-0.5">{bandLabel}</dd>
              </div>
              <div>
                <dt className="text-caption text-text-muted">{caretaker.sted.stepConsent}</dt>
                <dd className="text-body font-semibold text-text mt-0.5">
                  {assessment.consentObtained ? caretaker.sted.yego : caretaker.sted.oya}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-label text-primary">{caretaker.sted.stepPhysical}</h3>
            {assessment.noProblem ? (
              <p className="text-body text-success font-semibold">{caretaker.sted.noProblem}</p>
            ) : null}
            <ul className="space-y-2">
              {STED_PHYSICAL_PARTS.map((part) => {
                const isProblem = assessment.physical[part] === 'problem'
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

          <section className="rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-label text-primary">
              {caretaker.sted.reviewMilestonesSection}
            </h3>
            <ul className="space-y-2">
              {codes.map((code, index) => {
                const answer = assessment.milestones[code]
                const answered = isAnswered(answer)
                const isOya = answer === 'oya'
                return (
                  <li
                    key={code}
                    className={`rounded-lg border px-3 py-3 space-y-2 ${
                      !answered
                        ? 'border-error/40 bg-error-light/30'
                        : isOya
                          ? 'border-warning/30 bg-warning-light/20'
                          : 'border-border bg-background-subtle/40'
                    }`}
                  >
                    <p className="text-body text-text">
                      <span className="text-caption font-bold text-text-muted mr-2">
                        {index + 1}.
                      </span>
                      {milestoneLabel(assessment.ageBand, code)}
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

          <section className="rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-label text-primary">{caretaker.sted.stepOutcome}</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-caption text-text-muted">{caretaker.sted.stepOutcome}</dt>
                <dd className="mt-1">
                  <Badge variant={outcomeBadgeVariant(assessment)} size="sm">
                    {outcomeLabel(assessment)}
                  </Badge>
                </dd>
              </div>
              {assessment.outcome.other && assessment.outcome.otherText && (
                <div>
                  <dt className="text-caption text-text-muted">{caretaker.sted.outcomeOther}</dt>
                  <dd className="text-body text-text mt-0.5">{assessment.outcome.otherText}</dd>
                </div>
              )}
              <div>
                <dt className="text-caption text-text-muted">{caretaker.sted.nextFollowUp}</dt>
                <dd className="text-body font-semibold text-text mt-0.5">
                  {assessment.outcome.followUpDueDate
                    ? formatDate(assessment.outcome.followUpDueDate)
                    : '—'}
                </dd>
              </div>
              {assessment.notes && (
                <div>
                  <dt className="text-caption text-text-muted">{caretaker.referral.notes}</dt>
                  <dd className="text-body text-text mt-0.5">{assessment.notes}</dd>
                </div>
              )}
            </dl>
          </section>
        </CardContent>

        <CardFooter className="shrink-0">
          <Button variant="secondary" size="lg" fullWidth onClick={onClose}>
            {common.close}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
