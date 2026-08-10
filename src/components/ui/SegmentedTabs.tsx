import type { ReactNode } from 'react'

export interface SegmentedTabOption<T extends string> {
  id: T
  label: ReactNode
  /** Optional selected accent — default uses primary soft fill. */
  tone?: 'default' | 'danger'
}

interface SegmentedTabsProps<T extends string> {
  options: SegmentedTabOption<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  /** Desktop column count hint; stacks on mobile when > 3. */
  columns?: 2 | 3 | 4 | 5
  className?: string
}

const columnClass: Record<2 | 3 | 4 | 5, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
}

/**
 * Filter / view switcher matching Attendance option-tile language.
 * Selected = soft primary (or soft danger); never filled solid green pills.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  columns = 3,
  className = '',
}: SegmentedTabsProps<T>) {
  return (
    <div
      className={`grid grid-cols-1 gap-2 ${columnClass[columns]} ${className}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const selected = value === option.id
        const danger = option.tone === 'danger'
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={`min-h-11 rounded-xl border-2 px-3 py-2.5 text-body font-semibold transition-all focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 ${
              selected
                ? danger
                  ? 'bg-error-light text-error border-error shadow-sm'
                  : 'bg-primary-light text-primary border-primary shadow-sm'
                : 'bg-surface text-text-secondary border-border hover:border-primary/40 hover:bg-surface-muted'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
