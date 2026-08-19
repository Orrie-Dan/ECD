import { ArrowLeft } from 'lucide-react'
import { caretaker } from '@/locales/rw/caretaker'

interface ClassroomBackLinkProps {
  onClick: () => void
  label?: string
}

export function ClassroomBackLink({ onClick, label = caretaker.classrooms.allGrades }: ClassroomBackLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-body font-medium text-primary hover:text-primary-dark transition-colors mb-2"
      aria-label={label}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  )
}
