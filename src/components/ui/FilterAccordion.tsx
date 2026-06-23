import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface FilterAccordionSectionProps {
  title: string
  description?: string
  preview?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function FilterAccordionSection({
  title,
  description,
  preview,
  defaultOpen = false,
  children,
}: FilterAccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <section className="rounded-xl border border-border bg-surface overflow-hidden shadow-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        className="
          flex w-full items-start gap-3 px-5 py-4 text-left min-h-14
          transition-colors hover:bg-background-subtle/80
          focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-[-2px]
        "
      >
        <div className="min-w-0 flex-1">
          <span className="text-subheading text-text block">{title}</span>
          {description && (
            <span className="text-caption text-text-secondary mt-0.5 block">{description}</span>
          )}
          {!open && preview && (
            <span className="text-caption text-primary font-semibold mt-1.5 block truncate">
              {preview}
            </span>
          )}
        </div>
        <ChevronDown
          size={20}
          className={`shrink-0 text-text-muted mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={panelId} className="px-5 pb-5 pt-1 border-t border-border/70 space-y-4">
          {children}
        </div>
      )}
    </section>
  )
}
