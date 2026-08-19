import { useState, useMemo, useCallback } from 'react'
import type { Child, ClassroomGrade } from '@/types'

export function useClassroomGateway(children: Child[]) {
  const [selectedGrade, setSelectedGrade] = useState<ClassroomGrade | null>(null)

  const gradeChildren = useMemo(
    () => selectedGrade
      ? children.filter((c) => c.classroomGrade === selectedGrade)
      : children,
    [children, selectedGrade],
  )

  const goBack = useCallback(() => setSelectedGrade(null), [])

  return {
    selectedGrade,
    setSelectedGrade,
    gradeChildren,
    goBack,
    isGradeSelected: selectedGrade !== null,
  }
}
