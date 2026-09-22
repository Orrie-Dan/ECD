import { customInstance } from '@/api/client'
import type {
  CaregiverWorkExperienceViewModel,
  CreateCaregiverWorkExperienceInput,
  UpdateCaregiverWorkExperienceInput,
} from '@/models/caregiver-work-experiences'

type ApiExperience = {
  id: string
  userId: string
  employer: string
  jobTitle: string
  startDate: string
  endDate: string | null
  description: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

function toDateOnly(iso: string | null | undefined): string | null {
  if (!iso) return null
  return iso.slice(0, 10)
}

function mapDto(row: ApiExperience): CaregiverWorkExperienceViewModel {
  return {
    id: row.id,
    userId: row.userId,
    employer: row.employer,
    jobTitle: row.jobTitle,
    startDate: toDateOnly(row.startDate) ?? '',
    endDate: toDateOnly(row.endDate),
    description: row.description,
    recordedById: row.recordedById,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listCaregiverWorkExperiences(
  userId: string,
): Promise<CaregiverWorkExperienceViewModel[]> {
  const res = await customInstance<{ items: ApiExperience[] }>({
    url: `/api/v1/users/${userId}/work-experiences`,
    method: 'GET',
  })
  return (res.items ?? []).map(mapDto)
}

export async function createCaregiverWorkExperience(
  userId: string,
  input: CreateCaregiverWorkExperienceInput,
): Promise<CaregiverWorkExperienceViewModel> {
  const row = await customInstance<ApiExperience>({
    url: `/api/v1/users/${userId}/work-experiences`,
    method: 'POST',
    data: input,
  })
  return mapDto(row)
}

export async function updateCaregiverWorkExperience(
  userId: string,
  experienceId: string,
  input: UpdateCaregiverWorkExperienceInput,
): Promise<CaregiverWorkExperienceViewModel> {
  const row = await customInstance<ApiExperience>({
    url: `/api/v1/users/${userId}/work-experiences/${experienceId}`,
    method: 'PATCH',
    data: input,
  })
  return mapDto(row)
}
