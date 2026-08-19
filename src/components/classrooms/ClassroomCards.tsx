import { type ReactNode } from 'react'
import { Users, ChevronRight } from 'lucide-react'
import { caretaker } from '@/locales/rw/caretaker'
import { getGradeLabel } from '@/lib/child-filters'
import type { ClassroomGrade, Child } from '@/types'

const GRADES: ClassroomGrade[] = ['grade_1', 'grade_2', 'grade_3']

export interface ClassroomStat {
  grade: ClassroomGrade
  total: number
  detail?: ReactNode
}

interface ClassroomCardsProps {
  children: Child[]
  onSelect: (grade: ClassroomGrade) => void
  /** Per-grade detail line (rendered below the child count). Falls back to nothing. */
  getDetail?: (grade: ClassroomGrade, kids: Child[]) => ReactNode
  title?: string
  description?: string
  className?: string
}

export function ClassroomCards({
  children,
  onSelect,
  getDetail,
  title = caretaker.classrooms.title,
  description = caretaker.classrooms.filterByGrade,
  className = '',
}: ClassroomCardsProps) {
  const gradeStats = GRADES.map((grade) => {
    const kids = children.filter((c) => c.classroomGrade === grade)
    return { grade, total: kids.length, kids }
  })

  const unassigned = children.filter((c) => !c.classroomGrade)

  return (
    <div className={className}>
      <h3 className="text-subheading text-text mb-1">{title}</h3>
      <p className="text-body text-text-secondary mb-4">{description}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {gradeStats.map(({ grade, total, kids }) => (
          <button
            key={grade}
            type="button"
            onClick={() => onSelect(grade)}
            className="
              text-left rounded-xl border border-border bg-surface p-4 transition-all
              hover:shadow-md hover:border-primary/40 active:scale-[0.99]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            "
          >
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-2 text-heading font-bold text-text">
                <Users size={20} className="text-primary" />
                {getGradeLabel(grade)}
              </span>
              <ChevronRight size={18} className="text-text-muted" />
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-text">{total}</span>
              <span className="text-caption text-text-secondary">{caretaker.classrooms.childrenCount}</span>
            </div>

            {getDetail && (
              <div className="mt-3">{getDetail(grade, kids)}</div>
            )}
          </button>
        ))}
      </div>

      {unassigned.length > 0 && (
        <p className="mt-3 text-caption text-text-muted">
          {caretaker.classrooms.noClassroom}: {unassigned.length} {caretaker.classrooms.childrenCount.toLowerCase()}
        </p>
      )}
    </div>
  )
}
