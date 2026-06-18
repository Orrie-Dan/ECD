import { type InputHTMLAttributes, useId } from 'react'

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function InputField({ label, error, id, className = '', ...props }: InputFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const errorId = `${fieldId}-error`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-label text-text">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`
          w-full min-h-11 px-3.5 text-body rounded-lg border bg-surface text-text
          placeholder:text-text-muted
          transition-colors duration-150 ease-out
          hover:border-border-strong
          focus:outline-none focus:border-gov-primary focus:ring-[3px] focus:ring-gov-primary/15
          disabled:opacity-60 disabled:cursor-not-allowed
          ${error ? 'border-error focus:border-error focus:ring-error/15' : 'border-border'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-body text-error font-semibold" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
