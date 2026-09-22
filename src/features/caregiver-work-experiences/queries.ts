import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { queryKeys, queryStaleTimes } from '@/api/query-keys'
import {
  createCaregiverWorkExperience,
  listCaregiverWorkExperiences,
  updateCaregiverWorkExperience,
} from '@/api/resources/caregiver-work-experiences'
import type {
  CreateCaregiverWorkExperienceInput,
  UpdateCaregiverWorkExperienceInput,
} from '@/models/caregiver-work-experiences'

export function useCaregiverWorkExperiences(userId: string | undefined, enabled = true) {
  const id = userId?.trim() ?? ''
  return useQuery({
    queryKey: queryKeys.caregiverWorkExperiences.byUser(id),
    queryFn: () => listCaregiverWorkExperiences(id),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.caregiverWorkExperiences,
  })
}

export function useCreateCaregiverWorkExperience(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCaregiverWorkExperienceInput) =>
      createCaregiverWorkExperience(userId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.caregiverWorkExperiences.byUser(userId),
      })
    },
  })
}

export function useUpdateCaregiverWorkExperience(userId: string, experienceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCaregiverWorkExperienceInput) =>
      updateCaregiverWorkExperience(userId, experienceId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.caregiverWorkExperiences.byUser(userId),
      })
    },
  })
}
