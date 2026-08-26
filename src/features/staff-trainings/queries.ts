import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { queryStaleTimes, staffTrainings } from '@/api/query-keys'
import {
  createStaffTraining,
  getStaffTraining,
  listStaffTrainings,
  updateStaffTraining,
} from '@/api/resources/staff-trainings'
import type {
  CreateStaffTrainingInput,
  StaffTrainingListFilters,
  UpdateStaffTrainingInput,
} from '@/models/staff-trainings'
import { hasRegisterListScope } from '@/lib/register-scope'

function listKey(filters: StaffTrainingListFilters) {
  return staffTrainings.keys.list({
    centerId: filters.centerId,
    districtId: filters.districtId,
    traineeUserId: filters.traineeUserId,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  })
}

export function useStaffTrainingsList(filters: StaffTrainingListFilters, enabled = true) {
  return useQuery({
    queryKey: listKey(filters),
    queryFn: () => listStaffTrainings(filters),
    enabled: env.isLive && enabled && hasRegisterListScope(filters),
    staleTime: queryStaleTimes.staffTrainings,
  })
}

export function useStaffTrainingDetail(id: string | undefined, enabled = true) {
  const trainingId = id?.trim() ?? ''
  return useQuery({
    queryKey: staffTrainings.keys.detail(trainingId),
    queryFn: () => getStaffTraining(trainingId),
    enabled: env.isLive && enabled && Boolean(trainingId),
    staleTime: queryStaleTimes.staffTrainings,
  })
}

function invalidateTrainingQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  void queryClient.invalidateQueries({ queryKey: staffTrainings.keys.all })
  if (id) {
    void queryClient.invalidateQueries({ queryKey: staffTrainings.keys.detail(id) })
  }
}

export function useCreateStaffTraining() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateStaffTrainingInput) => createStaffTraining(input),
    onSuccess: () => invalidateTrainingQueries(queryClient),
  })
}

export function useUpdateStaffTraining(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateStaffTrainingInput) => updateStaffTraining(id, input),
    onSuccess: () => invalidateTrainingQueries(queryClient, id),
  })
}
