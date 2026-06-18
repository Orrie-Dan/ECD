import { type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}

export function FormField({ label, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-label">
        {label}
        {required && (
          <span className="text-error ml-1 font-bold" aria-hidden="true">*</span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="text-caption">{hint}</p>
      )}
      {error && (
        <p className="text-caption text-error font-semibold flex items-center gap-1.5" role="alert">
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </div>
  )
}

const inputBase = `
  w-full min-h-10 px-3.5 text-body rounded-lg border border-border bg-surface text-text
  placeholder:text-text-muted input-focus
`

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function TextInput({ error, className = '', ...props }: TextInputProps) {
  return (
    <input
      className={`${inputBase} ${error ? 'border-error focus:border-error' : ''} ${className}`}
      {...props}
    />
  )
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  placeholder?: string
}

export function SelectInput({ error, placeholder, children, className = '', ...props }: SelectInputProps) {
  return (
    <select
      className={`${inputBase} ${error ? 'border-error' : ''} ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  )
}

interface RadioGroupProps {
  name: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  error?: boolean
}

export function RadioGroup({ name, value, onChange, options, error }: RadioGroupProps) {
  return (
    <div
      className={`flex flex-col gap-2 ${error ? 'rounded-xl border border-error p-3 bg-error-light/30' : ''}`}
      role="radiogroup"
    >
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <label
            key={opt.value}
            className={`
              flex items-center gap-4 min-h-14 px-4 rounded-xl border cursor-pointer
              transition-all duration-200 ease-out
              ${selected
                ? 'border-primary bg-primary-light shadow-sm scale-[1.01]'
                : 'border-border bg-surface hover:border-primary/30 hover:bg-background-subtle hover:shadow-sm active:scale-[0.99]'}
              focus-within:outline-3 focus-within:outline-primary focus-within:outline-offset-2
            `}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="w-5 h-5 accent-primary shrink-0"
            />
            <span className={`text-body ${selected ? 'font-semibold text-text' : 'text-text-secondary'}`}>
              {opt.label}
            </span>
          </label>
        )
      })}
    </div>
  )
}
