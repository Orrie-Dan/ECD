import { Check } from 'lucide-react'
import { common } from '@/locales/rw/common'

interface Step {
  title: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  /** Max numbered steps shown at once. Extra steps slide in as you progress. */
  maxVisible?: number
}

const DEFAULT_MAX_VISIBLE = 5

function visibleRange(currentStep: number, total: number, maxVisible: number) {
  if (total <= maxVisible) {
    return { start: 0, end: total }
  }

  const half = Math.floor(maxVisible / 2)
  let start = currentStep - 1 - half
  let end = start + maxVisible

  if (start < 0) {
    start = 0
    end = maxVisible
  }
  if (end > total) {
    end = total
    start = total - maxVisible
  }

  return { start, end }
}

export function Stepper({
  steps,
  currentStep,
  maxVisible = DEFAULT_MAX_VISIBLE,
}: StepperProps) {
  const total = steps.length
  const progress = total <= 1 ? 100 : ((currentStep - 1) / (total - 1)) * 100
  const { start, end } = visibleRange(currentStep, total, maxVisible)
  const visibleSteps = steps.slice(start, end)
  const hasBefore = start > 0
  const hasAfter = end < total
  const current = steps[currentStep - 1]

  return (
    <nav aria-label={common.ui.stepper} className="mb-8">
      <div className="bg-surface rounded-xl border border-border shadow-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <p className="text-label text-primary shrink-0">
            {common.ui.stepProgress
              .replace('{current}', String(currentStep))
              .replace('{total}', String(total))}
          </p>
          <p className="text-caption hidden sm:block min-w-0 truncate text-right">
            {current?.description ?? current?.title}
          </p>
        </div>

        <div className="h-2 bg-background-subtle rounded-full overflow-hidden mb-6" aria-hidden="true">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="hidden sm:flex items-start justify-center gap-2">
          {hasBefore && (
            <li className="flex flex-col items-center pt-2 text-text-muted" aria-hidden="true">
              <span className="text-subheading leading-none">…</span>
            </li>
          )}
          {visibleSteps.map((step, offset) => {
            const stepNum = start + offset + 1
            const isActive = stepNum === currentStep
            const isComplete = stepNum < currentStep

            return (
              <li
                key={`${stepNum}-${step.title}`}
                className="flex flex-col items-center flex-1 min-w-0 max-w-28 text-center"
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className={`
                    flex items-center justify-center w-9 h-9 rounded-full text-[0.875rem] font-bold mb-2
                    ${isComplete ? 'bg-success !text-white' : ''}
                    ${isActive ? 'bg-primary !text-white ring-4 ring-primary-light' : ''}
                    ${!isComplete && !isActive ? 'bg-background-subtle text-text-muted border border-border' : ''}
                  `}
                  aria-hidden="true"
                >
                  {isComplete ? <Check size={16} strokeWidth={3} /> : stepNum}
                </div>
                <p
                  className={`text-caption leading-tight line-clamp-2 ${
                    isActive ? 'font-semibold text-primary' : 'text-text-muted'
                  }`}
                >
                  {step.title}
                </p>
              </li>
            )
          })}
          {hasAfter && (
            <li className="flex flex-col items-center pt-2 text-text-muted" aria-hidden="true">
              <span className="text-subheading leading-none">…</span>
            </li>
          )}
        </ol>

        <div className="sm:hidden">
          <p className="text-subheading text-text">{current?.description ?? current?.title}</p>
          {current?.description && (
            <p className="text-caption text-text-muted mt-1">
              {common.ui.stepProgress
                .replace('{current}', String(currentStep))
                .replace('{total}', String(total))}
            </p>
          )}
        </div>
      </div>
    </nav>
  )
}
