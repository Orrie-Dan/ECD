import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ecdCenter, queryStaleTimes } from '@/api/query-keys'
import {
  createCenterCaregiver,
  getUser,
  listUsersPage,
  resetUserPassword,
  updateUser,
  type UsersListFilters,
} from '@/api/resources/users'
import type {
  CreateCenterCaregiverDto,
  UpdateCenterUserDto,
} from '@/api/resources/users'

export type CenterUsersListFilters = Omit<UsersListFilters, 'role' | 'districtId'>

export function useCenterUsersList(
  filters: CenterUsersListFilters = {},
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
    queryKey: ecdCenter.keys.users.list(listFilters as Record<string, unknown>),
    queryFn: () => listUsersPage(listFilters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ecdCenterUsers,
  })
}

export function useCenterUserDetail(userId: string | undefined, enabled = true) {
  const id = userId?.trim() ?? ''
  return useQuery({
    queryKey: ecdCenter.keys.users.detail(id),
    queryFn: () => getUser(id),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ecdCenterUsers,
  })
}

function invalidateCenterUserQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: ecdCenter.keys.users.all })
  if (userId) {
    void queryClient.invalidateQueries({ queryKey: ecdCenter.keys.users.detail(userId) })
  }
}

export function useCenterCreateCaregiver() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCenterCaregiverDto) => createCenterCaregiver(dto),
    onSuccess: () => {
      invalidateCenterUserQueries(queryClient)
    },
  })
}

export function useCenterUpdateUser(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateCenterUserDto) => updateUser(userId, dto),
    onSuccess: () => {
      invalidateCenterUserQueries(queryClient, userId)
    },
  })
}

export function useCenterResetUserPassword(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (newPassword?: string) => resetUserPassword(userId, newPassword),
    onSuccess: () => invalidateCenterUserQueries(queryClient, userId),
  })
}
