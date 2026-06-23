import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { caretaker } from '@/locales/rw/caretaker'

interface FilterResultsBarProps {
  count: number
  summary?: string | null
  onClear: () => void
  showClear?: boolean
}

export function FilterResultsBar({ count, summary, onClear, showClear = true }: FilterResultsBarProps) {
  return (
    <div className="mb-5 rounded-xl border border-primary/20 bg-primary-light/40 px-4 py-4 sm:px-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-body font-bold text-text m-0">
            {caretaker.filters.resultsFound.replace('{count}', String(count))}
          </p>
          {summary && (
            <p className="text-body text-text-secondary leading-relaxed m-0">{summary}</p>
          )}
        </div>
        {showClear && (
          <Button
            variant="tertiary"
            size="md"
            icon={<X size={18} />}
            onClick={onClear}
            className="shrink-0 self-start"
          >
            {caretaker.filters.clearAll}
          </Button>
        )}
      </div>
    </div>
  )
}
