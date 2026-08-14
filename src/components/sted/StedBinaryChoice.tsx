import { Check } from 'lucide-react'

export type StedChoiceTone = 'neutral' | 'positive' | 'negative'

export interface StedBinaryOption<T extends string = string> {
  value: T
  label: string
  tone?: StedChoiceTone
}

interface StedBinaryChoiceProps<T extends string> {
  value: T | undefined
  onChange: (value: T) => void
  options: [StedBinaryOption<T>, StedBinaryOption<T>]
  ariaLabel: string
}

function selectedClasses(tone: StedChoiceTone): string {
  switch (tone) {
    case 'positive':
      return 'border-success/50 bg-success-light text-success shadow-sm'
    case 'negative':
      return 'border-error/50 bg-error-light text-error shadow-sm'
    default:
      return 'border-primary bg-primary-light text-primary shadow-sm'
  }
}

function idleClasses(tone: StedChoiceTone): string {
  switch (tone) {
    case 'positive':
      return 'border-border bg-surface text-text-secondary hover:border-success/40 hover:bg-success-light/50 hover:text-success'
    case 'negative':
      return 'border-border bg-surface text-text-secondary hover:border-error/40 hover:bg-error-light/50 hover:text-error'
    default:
      return 'border-border bg-surface text-text-secondary hover:border-primary/40 hover:bg-primary-light/40'
  }
}

export function StedBinaryChoice<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: StedBinaryChoiceProps<T>) {
  return (
    <div className="grid grid-cols-2 gap-2 w-full" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const selected = value === opt.value
        const tone = opt.tone ?? 'neutral'
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={`
              interactive-chip min-h-[3.25rem] rounded-xl border-2 px-3 py-2.5
              text-body font-semibold transition-all duration-200 ease-out
              focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
              inline-flex items-center justify-center gap-2
              ${selected ? selectedClasses(tone) : idleClasses(tone)}
            `}
          >
            <span>{opt.label}</span>
            {selected && <Check size={16} strokeWidth={2.5} aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}
