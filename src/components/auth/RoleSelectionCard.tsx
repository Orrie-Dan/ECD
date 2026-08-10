import { ChevronRight, type LucideIcon } from 'lucide-react'

type RoleCardAccent = 'caretaker' | 'districtOfficer'

interface RoleSelectionCardProps {
  icon: LucideIcon
  title: string
  description: string
  accent: RoleCardAccent
  onSelect: () => void
}

const accentStyles: Record<
  RoleCardAccent,
  { card: string; icon: string; chevron: string; hover: string }
> = {
  caretaker: {
    card: 'border-l-[3px] border-l-primary',
    icon: 'bg-primary-light text-primary group-hover:bg-primary-light',
    chevron: 'group-hover:text-primary',
    hover: 'hover:border-primary/40 hover:bg-primary/[0.04]',
  },
  districtOfficer: {
    card: 'border-l-[3px] border-l-secondary',
    icon: 'bg-secondary-light text-secondary group-hover:bg-secondary-light',
    chevron: 'group-hover:text-secondary',
    hover: 'hover:border-secondary/40 hover:bg-secondary/[0.04]',
  },
}

export function RoleSelectionCard({
  icon: Icon,
  title,
  description,
  accent,
  onSelect,
}: RoleSelectionCardProps) {
  const styles = accentStyles[accent]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        group w-full min-h-[100px] flex items-start gap-4
        rounded-2xl border border-border bg-surface
        px-5 py-5 sm:px-6 sm:py-6
        text-left cursor-pointer
        transition-all duration-200 ease-out
        hover:shadow-lg hover:-translate-y-px
        focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
        active:translate-y-0 active:shadow-md
        ${styles.card}
        ${styles.hover}
      `}
    >
      <span
        className={`
          flex items-center justify-center w-12 h-12 rounded-xl shrink-0
          transition-colors duration-200
          ${styles.icon}
        `}
        aria-hidden="true"
      >
        <Icon size={24} strokeWidth={2} />
      </span>

      <span className="flex-1 min-w-0">
        <span className="block text-body-lg font-bold text-text leading-snug">
          {title}
        </span>
        <span className="block text-body text-text-secondary mt-1 leading-snug">
          {description}
        </span>
      </span>

      <ChevronRight
        size={24}
        strokeWidth={2}
        className={`shrink-0 mt-0.5 text-text-muted transition-colors duration-200 ${styles.chevron}`}
        aria-hidden="true"
      />
    </button>
  )
}
