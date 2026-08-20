import { classroomsControllerFindAllByCenter } from '@/api/generated/endpoints/classrooms/classrooms'
import type { ClassroomGrade } from '@/types'

/** Map a grade selection to the center's classroom UUID (null if unavailable offline / missing). */
export async function resolveClassroomIdForGrade(
  centerId: string,
  grade: ClassroomGrade,
): Promise<string | null> {
  try {
    const classrooms = await classroomsControllerFindAllByCenter(centerId)
    return classrooms.find((c) => c.grade === grade)?.id ?? null
  } catch {
    return null
  }
}
