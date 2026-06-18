type OptionLayout = 'stacked' | 'inline'

interface OptionPickerOption {
  value: string
  label: string
  icon?: string
}

interface OptionPickerProps {
  label: string
  hint?: string
  step?: number
  value: string
  onChange: (value: string) => void
  options: OptionPickerOption[]
  name: string
  layout?: OptionLayout
}

export function OptionPicker({
  label,
  hint,
  step,
  value,
  onChange,
  options,
  name,
  layout = 'stacked',
}: OptionPickerProps) {
  const isInline = layout === 'inline'

  return (
    <fieldset className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3 mb-4">
        {step !== undefined && (
          <span
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-light text-primary text-body font-bold shrink-0"
            aria-hidden="true"
          >
            {step}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <legend className="text-subheading text-text block">{label}</legend>
          {hint && (
            <p className="text-caption text-text-secondary mt-1">{hint}</p>
          )}
        </div>
      </div>

      <div
        className={
          isInline
            ? 'grid grid-cols-1 sm:grid-cols-3 gap-3'
            : 'flex flex-col gap-2'
        }
        role="radiogroup"
        aria-label={label}
      >
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              name={name}
              onClick={() => onChange(opt.value)}
              className={`
                interactive-chip w-full rounded-xl border-2 font-semibold
                transition-all duration-200 ease-out
                focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
                ${isInline
                  ? 'flex flex-col items-center justify-center gap-2 min-h-[72px] px-4 py-4 text-center sm:min-h-[80px]'
                  : 'flex items-center gap-3 min-h-[56px] px-4 py-3 text-left'}
                ${selected
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-background-subtle/60 text-text border-border hover:border-primary/40 hover:bg-primary-light/40'}
              `}
            >
              {opt.icon && (
                <span className="text-2xl leading-none shrink-0" aria-hidden="true">
                  {opt.icon}
                </span>
              )}
              <span className={`text-body leading-snug ${isInline ? 'break-words' : 'flex-1'}`}>
                {opt.label}
              </span>
              {selected && (
                <span className={`text-lg leading-none shrink-0 ${isInline ? '' : 'ml-auto'}`} aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
