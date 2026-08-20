import { useState, useMemo, useCallback } from 'react'
import type { Child, ClassroomGrade } from '@/types'

/** Grade filter, or children with no classroom assignment yet. */
export type ClassroomSelection = ClassroomGrade | 'unassigned'

export function useClassroomGateway(children: Child[]) {
  const [selectedGrade, setSelectedGrade] = useState<ClassroomSelection | null>(null)

  const gradeChildren = useMemo(() => {
    if (!selectedGrade) return children
    if (selectedGrade === 'unassigned') {
      return children.filter((c) => !c.classroomGrade)
    }
    return children.filter((c) => c.classroomGrade === selectedGrade)
  }, [children, selectedGrade])

  const goBack = useCallback(() => setSelectedGrade(null), [])

  return {
    selectedGrade,
    setSelectedGrade,
    gradeChildren,
    goBack,
    isGradeSelected: selectedGrade !== null,
  }
}
