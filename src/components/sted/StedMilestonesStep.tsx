import { useEffect, useRef } from 'react'
import { Alert } from '@/components/ui/Alert'
import { caretaker } from '@/locales/rw/caretaker'
import { getMilestoneCodes, isAnswered } from '@/lib/sted-utils'
import type { StedAgeBand, StedAnswer } from '@/types'

interface StedMilestonesStepProps {
  ageBand: StedAgeBand
  milestones: Record<string, StedAnswer>
  onChange: (code: string, answer: StedAnswer) => void
  /** When true, unanswered items are highlighted after a failed Next attempt. */
  showIncomplete?: boolean
}

function milestoneLabel(ageBand: StedAgeBand, code: string): string {
  if (ageBand === '1_3') {
    return (caretaker.sted.milestones1_3 as Record<string, string>)[code] ?? code
  }
  return (caretaker.sted.milestones4_6 as Record<string, string>)[code] ?? code
}

export function StedMilestonesStep({
  ageBand,
  milestones,
  onChange,
  showIncomplete = false,
}: StedMilestonesStepProps) {
  const codes = getMilestoneCodes(ageBand)
  const answeredCount = codes.filter((code) => isAnswered(milestones[code])).length
  const incompleteCodes = codes.filter((code) => !isAnswered(milestones[code]))
  const firstIncompleteRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!showIncomplete || incompleteCodes.length === 0) return
    firstIncompleteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [showIncomplete, incompleteCodes.length])

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-subheading text-text">{caretaker.sted.stepMilestones}</h2>
            <p className="text-caption text-text-secondary mt-0.5">
              {ageBand === '1_3' ? caretaker.sted.ageBand1_3Hint : caretaker.sted.ageBand4_6Hint}
            </p>
          </div>
          <p
            className={`text-caption font-semibold tabular-nums ${
              answeredCount === codes.length ? 'text-success' : 'text-text-secondary'
            }`}
            role="status"
          >
            {caretaker.sted.milestonesProgress
              .replace('{answered}', String(answeredCount))
              .replace('{total}', String(codes.length))}
          </p>
        </div>

        <div
          className="h-2 rounded-full bg-background-subtle overflow-hidden"
          role="progressbar"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={codes.length}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              answeredCount === codes.length ? 'bg-success' : 'bg-primary'
            }`}
            style={{
              width: `${codes.length ? Math.round((answeredCount / codes.length) * 100) : 0}%`,
            }}
          />
        </div>
      </div>

      {showIncomplete && incompleteCodes.length > 0 && (
        <Alert variant="error">
          {caretaker.sted.milestonesIncompleteAlert.replace(
            '{count}',
            String(incompleteCodes.length),
          )}
        </Alert>
      )}

      <div className="space-y-3">
        {codes.map((code, index) => {
          const label = milestoneLabel(ageBand, code)
          const isYego = milestones[code] === 'yego'
          const isOya = milestones[code] === 'oya'
          const answered = isAnswered(milestones[code])
          const needsAttention = showIncomplete && !answered
          const isFirstIncomplete = needsAttention && incompleteCodes[0] === code

          return (
            <div
              key={code}
              ref={isFirstIncomplete ? firstIncompleteRef : undefined}
              aria-invalid={needsAttention || undefined}
              className={`rounded-xl border p-4 space-y-3 transition-colors ${
                needsAttention
                  ? 'border-error bg-error-light/40 ring-1 ring-error/25'
                  : 'border-border bg-surface hover:border-primary/25 hover:bg-background-subtle/60'
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-bold ${
                    needsAttention
                      ? 'bg-error text-white'
                      : answered
                        ? 'bg-success-light text-success'
                        : 'bg-background-subtle text-text-muted'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-body font-medium text-text">{label}</p>
                  {needsAttention && (
                    <p className="text-caption font-semibold text-error">
                      {caretaker.sted.milestoneRequired}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2" role="group" aria-label={label}>
                <button
                  type="button"
                  onClick={() => onChange(code, 'yego')}
                  aria-pressed={isYego}
                  className={`min-h-11 min-w-22 rounded-lg px-4 py-2.5 text-caption font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40 focus-visible:ring-offset-1 ${
                    isYego
                      ? 'border-success/40 bg-success-light text-success hover:bg-success/15'
                      : 'border-transparent bg-background-subtle text-text-secondary hover:border-success/30 hover:bg-success-light hover:text-success'
                  }`}
                >
                  {caretaker.sted.yego}
                </button>
                <button
                  type="button"
                  onClick={() => onChange(code, 'oya')}
                  aria-pressed={isOya}
                  className={`min-h-11 min-w-22 rounded-lg px-4 py-2.5 text-caption font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40 focus-visible:ring-offset-1 ${
                    isOya
                      ? 'border-error/40 bg-error-light text-error hover:bg-error/15'
                      : 'border-transparent bg-background-subtle text-text-secondary hover:border-error/30 hover:bg-error-light hover:text-error'
                  }`}
                >
                  {caretaker.sted.oya}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
