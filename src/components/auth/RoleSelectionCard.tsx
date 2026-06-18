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
  { card: string; icon: string; chevron: string }
> = {
  caretaker: {
    card: 'border-l-[3px] border-l-gov-primary hover:border-l-gov-primary',
    icon: 'bg-[#d9ede4] text-gov-primary group-hover:bg-[#cce5d9]',
    chevron: 'group-hover:text-gov-primary',
  },
  districtOfficer: {
    card: 'border-l-[3px] border-l-secondary hover:border-l-secondary',
    icon: 'bg-[#e8eef8] text-secondary group-hover:bg-[#dce8f6]',
    chevron: 'group-hover:text-secondary',
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
        focus-visible:outline-3 focus-visible:outline-gov-primary focus-visible:outline-offset-2
        active:translate-y-0 active:shadow-md
        ${styles.card}
        ${accent === 'caretaker'
          ? 'hover:border-gov-primary/40 hover:bg-gov-primary/[0.04]'
          : 'hover:border-secondary/40 hover:bg-secondary/[0.04]'}
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
