import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Shakisha...', className = '' }: SearchInputProps) {
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
          w-full min-h-10 pl-10 pr-3.5 text-body rounded-lg border border-border
          bg-surface text-text placeholder:text-text-muted input-focus shadow-sm
        "
        aria-label={placeholder}
      />
    </div>
  )
}
