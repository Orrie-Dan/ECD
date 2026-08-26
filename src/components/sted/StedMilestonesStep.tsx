import { useEffect, useRef, useState, type RefObject } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { StedBinaryChoice } from '@/components/sted/StedBinaryChoice'
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

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}

function MilestoneProgress({
  answeredCount,
  total,
}: {
  answeredCount: number
  total: number
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p
          className={`text-caption font-semibold tabular-nums ${
            answeredCount === total ? 'text-success' : 'text-text-secondary'
          }`}
          role="status"
        >
          {caretaker.sted.milestonesProgress
            .replace('{answered}', String(answeredCount))
            .replace('{total}', String(total))}
        </p>
      </div>
      <div
        className="h-2 rounded-full bg-background-subtle overflow-hidden"
        role="progressbar"
        aria-valuenow={answeredCount}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            answeredCount === total ? 'bg-success' : 'bg-primary'
          }`}
          style={{
            width: `${total ? Math.round((answeredCount / total) * 100) : 0}%`,
          }}
        />
      </div>
    </div>
  )
}

interface MilestoneCardProps {
  index: number
  label: string
  answer: StedAnswer | undefined
  needsAttention: boolean
  onAnswer: (answer: StedAnswer) => void
  cardRef?: RefObject<HTMLDivElement | null>
}

function MilestoneCard({
  index,
  label,
  answer,
  needsAttention,
  onAnswer,
  cardRef,
}: MilestoneCardProps) {
  const answered = isAnswered(answer)

  return (
    <div
      ref={cardRef}
      aria-invalid={needsAttention || undefined}
      className={`rounded-xl border p-4 space-y-4 transition-colors ${
        needsAttention
          ? 'border-error bg-error-light/40 ring-1 ring-error/25'
          : 'border-border bg-surface'
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.875rem] font-bold ${
            needsAttention
              ? 'bg-error !text-white'
              : answered
                ? 'bg-success !text-white'
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
      <StedBinaryChoice
        value={answer}
        onChange={onAnswer}
        ariaLabel={label}
        options={[
          { value: 'yego', label: caretaker.sted.yego, tone: 'positive' },
          { value: 'oya', label: caretaker.sted.oya, tone: 'negative' },
        ]}
      />
    </div>
  )
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
  const isMobile = useIsMobile()
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!showIncomplete || incompleteCodes.length === 0) return
    const idx = codes.indexOf(incompleteCodes[0]!)
    if (idx >= 0) setCurrentIndex(idx)
    firstIncompleteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [showIncomplete, incompleteCodes, codes])

  const handleAnswer = (code: string, answer: StedAnswer) => {
    onChange(code, answer)
    if (isMobile) {
      const idx = codes.indexOf(code)
      if (idx >= 0 && idx < codes.length - 1) {
        window.setTimeout(() => setCurrentIndex(idx + 1), 180)
      }
    }
  }

  const bandHint =
    ageBand === '1_3' ? caretaker.sted.ageBand1_3Hint : caretaker.sted.ageBand4_6Hint

  const renderMilestoneCard = (
    code: string,
    index: number,
    ref?: RefObject<HTMLDivElement | null>,
  ) => {
    const label = milestoneLabel(ageBand, code)
    const needsAttention = showIncomplete && !isAnswered(milestones[code])
    return (
      <MilestoneCard
        key={code}
        index={index}
        label={label}
        answer={milestones[code]}
        needsAttention={needsAttention}
        onAnswer={(answer) => handleAnswer(code, answer)}
        cardRef={ref}
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-caption text-text-secondary">{bandHint}</p>

      <MilestoneProgress answeredCount={answeredCount} total={codes.length} />

      {showIncomplete && incompleteCodes.length > 0 && (
        <Alert variant="error">
          {caretaker.sted.milestonesIncompleteAlert.replace(
            '{count}',
            String(incompleteCodes.length),
          )}
        </Alert>
      )}

      {isMobile ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-label text-text">
              {caretaker.sted.milestoneQuestionNav} {currentIndex + 1}/{codes.length}
            </p>
            <div className="flex gap-1">
              <Button
                variant="tertiary"
                size="sm"
                icon={<ChevronLeft size={16} />}
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                aria-label={caretaker.sted.milestonePrevQuestion}
              >
                <span className="sr-only">{caretaker.sted.milestonePrevQuestion}</span>
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                icon={<ChevronRight size={16} />}
                disabled={currentIndex >= codes.length - 1}
                onClick={() => setCurrentIndex((i) => Math.min(codes.length - 1, i + 1))}
                aria-label={caretaker.sted.milestoneNextQuestion}
              >
                <span className="sr-only">{caretaker.sted.milestoneNextQuestion}</span>
              </Button>
            </div>
          </div>
          {renderMilestoneCard(
            codes[currentIndex]!,
            currentIndex,
            showIncomplete && incompleteCodes[0] === codes[currentIndex]
              ? firstIncompleteRef
              : undefined,
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code, index) =>
            renderMilestoneCard(
              code,
              index,
              showIncomplete && incompleteCodes[0] === code ? firstIncompleteRef : undefined,
            ),
          )}
        </div>
      )}
    </div>
  )
}
