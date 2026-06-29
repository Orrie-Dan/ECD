import { Loader2, Search, X } from 'lucide-react'
import { common } from '@/locales/rw/common'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  loading?: boolean
  clearable?: boolean
}

export function SearchInput({
  value,
  onChange,
  placeholder = common.ui.searchPlaceholder,
  className = '',
  loading = false,
  clearable = true,
}: SearchInputProps) {
  const showClear = clearable && value.length > 0

  return (
    <div className={`relative ${className}`}>
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        size={18}
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full min-h-11 sm:min-h-10 pl-10 text-body rounded-xl border border-border
          bg-surface text-text placeholder:text-text-muted input-focus shadow-sm
          transition-shadow duration-200 hover:shadow-md focus:shadow-md
        "
        style={{ paddingRight: showClear || loading ? '2.75rem' : '0.875rem' }}
        aria-label={placeholder}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {loading && (
          <Loader2 size={18} className="text-primary animate-spin" aria-label={common.ui.searching} />
        )}
        {showClear && !loading && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="touch-target flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-background-subtle transition-colors"
            aria-label={common.ui.clearSearch}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
