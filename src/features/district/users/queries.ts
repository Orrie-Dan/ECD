import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { district, queryKeys, queryStaleTimes } from '@/api/query-keys'
import { listCentersPage } from '@/api/resources/centers'
import {
  createDistrictCaregiver,
  getUser,
  listUsersPage,
  resetUserPassword,
  updateUser,
  type UsersListFilters,
} from '@/api/resources/users'
import type { CreateUserDto, UpdateUserDto } from '@/api/generated/models'

export type DistrictCaregiversListFilters = Omit<UsersListFilters, 'role'>

export function useDistrictCaregiversList(
  filters: DistrictCaregiversListFilters = {},
  enabled = true,
) {
  const listFilters: UsersListFilters = {
    search: filters.search?.trim() || undefined,
    status: filters.status,
    centerId: filters.centerId,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    role: 'caregiver',
  }
  return useQuery({
    queryKey: district.keys.users.list(listFilters as Record<string, unknown>),
    queryFn: () => listUsersPage(listFilters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.districtUsers,
  })
}

export function useDistrictCaregiverDetail(userId: string | undefined, enabled = true) {
  const id = userId?.trim() ?? ''
  return useQuery({
    queryKey: district.keys.users.detail(id),
    queryFn: () => getUser(id),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.districtUsers,
  })
}

export function useDistrictCaregiverCenterOptions(
  search?: string,
  enabled = true,
) {
  const q = search?.trim() || undefined
  return useQuery({
    queryKey: district.keys.users.centerOptions({ search: q }),
    queryFn: () =>
      listCentersPage({
        search: q,
        page: 1,
        pageSize: 100,
      }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.districtUsers,
  })
}

function invalidateCaregiverQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string,
  centerId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: district.keys.users.all })
  if (userId) {
    void queryClient.invalidateQueries({ queryKey: district.keys.users.detail(userId) })
  }
  if (centerId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.centersDirectory.detail(centerId),
    })
  }
}

export function useDistrictCreateCaregiver() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateUserDto) => createDistrictCaregiver(dto),
    onSuccess: (_data, variables) => {
      invalidateCaregiverQueries(queryClient, undefined, variables.centerId)
    },
  })
}

export function useDistrictUpdateCaregiver(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateUserDto) => updateUser(userId, dto),
    onSuccess: (data) => {
      invalidateCaregiverQueries(queryClient, userId, data.center?.id)
    },
  })
}

export function useDistrictResetCaregiverPassword(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (newPassword?: string) => resetUserPassword(userId, newPassword),
    onSuccess: () => invalidateCaregiverQueries(queryClient, userId),
  })
}
