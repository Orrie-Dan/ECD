import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  /** Explicit control id. Defaults to a stable useId value. */
  htmlFor?: string
  children: ReactNode
}

type ControlProps = {
  id?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  'aria-describedby'?: string
  'aria-required'?: boolean | 'true' | 'false'
}

function mergeDescribedBy(existing: string | undefined, ...ids: Array<string | undefined>) {
  const parts = [existing, ...ids].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : undefined
}

/**
 * Accessible field wrapper: wires label htmlFor → control id and
 * aria-describedby for hint / error messages.
 */
export function FormField({
  label,
  error,
  hint,
  required,
  htmlFor,
  children,
}: FormFieldProps) {
  const generatedId = useId()
  const fieldId = htmlFor ?? generatedId
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`

  const enhanced = Children.map(children, (child) => {
    if (!isValidElement(child)) return child

    const el = child as ReactElement<ControlProps>
    const existingId = el.props.id
    const describedBy = mergeDescribedBy(
      el.props['aria-describedby'],
      error ? errorId : undefined,
      hint && !error ? hintId : undefined,
    )

    return cloneElement(el, {
      id: existingId ?? fieldId,
      'aria-invalid': error ? true : el.props['aria-invalid'],
      'aria-describedby': describedBy,
      'aria-required': required ? true : el.props['aria-required'],
    })
  })

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-label">
        {label}
        {required && (
          <span className="text-error ml-1 font-bold" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {enhanced}
      {hint && !error && (
        <p id={hintId} className="text-caption">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="text-caption text-error font-semibold flex items-center gap-1.5"
          role="alert"
        >
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </div>
  )
}

const inputBase = `
  w-full min-h-11 sm:min-h-10 px-3.5 text-body rounded-lg border border-border bg-surface text-text
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

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function TextArea({ error, className = '', ...props }: TextAreaProps) {
  return (
    <textarea
      className={`${inputBase} min-h-24 py-3 resize-y ${error ? 'border-error focus:border-error' : ''} ${className}`}
      {...props}
    />
  )
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  placeholder?: string
}

export function SelectInput({
  error,
  placeholder,
  children,
  className = '',
  ...props
}: SelectInputProps) {
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
  disabled?: boolean
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  'aria-required'?: boolean | 'true' | 'false'
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  error,
  disabled = false,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
}: RadioGroupProps) {
  return (
    <div
      id={id}
      className={`flex flex-col gap-2 ${error ? 'rounded-xl border border-error p-3 bg-error-light/30' : ''} ${disabled ? 'opacity-60' : ''}`}
      role="radiogroup"
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid ?? (error ? true : undefined)}
      aria-required={ariaRequired}
      aria-disabled={disabled || undefined}
    >
      {options.map((opt) => {
        const selected = value === opt.value
        const optionId = id ? `${id}-${opt.value}` : undefined
        return (
          <label
            key={opt.value}
            htmlFor={optionId}
            className={`
              flex items-center gap-4 min-h-14 px-4 rounded-xl border
              transition-all duration-200 ease-out
              ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              ${selected
                ? 'border-primary bg-primary-light shadow-sm scale-[1.01]'
                : 'border-border bg-surface hover:border-primary/30 hover:bg-background-subtle hover:shadow-sm active:scale-[0.99]'}
              focus-within:outline-3 focus-within:outline-primary focus-within:outline-offset-2
            `}
          >
            <input
              id={optionId}
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              disabled={disabled}
              onChange={() => {
                if (!disabled) onChange(opt.value)
              }}
              className="sr-only"
            />
            <span
              className={`
                flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0
                ${selected ? 'border-primary' : 'border-border'}
              `}
              aria-hidden="true"
            >
              {selected && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </span>
            <span className="text-body font-medium text-text">{opt.label}</span>
          </label>
        )
      })}
    </div>
  )
}
