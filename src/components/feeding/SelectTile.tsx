import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

interface SelectTileProps {
  selected: boolean
  onChange: (selected: boolean) => void
  label: string
  icon?: ReactNode
  /** Highlight as missing after a blocked save. */
  missing?: boolean
}

export function SelectTile({
  selected,
  onChange,
  label,
  icon,
  missing = false,
}: SelectTileProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={() => onChange(!selected)}
      className={`
        interactive-chip w-full rounded-xl border-2 font-semibold
        flex items-center gap-3 min-h-[3.25rem] px-4 py-3 text-left
        transition-all duration-200 ease-out
        focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
        ${
          missing
            ? 'bg-error-light/40 text-error border-error'
            : selected
              ? 'bg-primary-light text-primary border-primary shadow-sm'
              : 'bg-surface text-text border-border hover:border-primary/40 hover:bg-primary-light/40'
        }
      `}
    >
      {icon && (
        <span
          className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
            missing
              ? 'bg-error-light text-error'
              : selected
                ? 'bg-primary/15 text-primary'
                : 'bg-background-subtle text-text-muted'
          }`}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <span className={`flex-1 min-w-0 text-body ${missing ? 'font-semibold' : ''}`}>
        {label}
      </span>
      {selected && (
        <Check size={18} strokeWidth={2.5} className="shrink-0" aria-hidden />
      )}
    </button>
  )
}
