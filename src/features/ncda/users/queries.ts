import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import {
  createUser,
  fetchUsersTotal,
  getUser,
  listUsersPage,
  resetUserPassword,
  updateUser,
  type UsersListFilters,
} from '@/api/resources/users'
import { listDistrictsPage, listCentersByDistrictPage } from '@/api/resources/geo'
import type { CreateUserDto, UpdateUserDto } from '@/api/generated/models'

export type NcdaUsersListFilters = UsersListFilters

export function useNcdaUsersList(filters: NcdaUsersListFilters = {}, enabled = true) {
  const listFilters: UsersListFilters = {
    search: filters.search?.trim() || undefined,
    role: filters.role,
    status: filters.status,
    districtId: filters.districtId,
    centerId: filters.centerId,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  }
  return useQuery({
    queryKey: ncda.keys.users.list(listFilters as Record<string, unknown>),
    queryFn: () => listUsersPage(listFilters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaUsers,
  })
}

export function useNcdaUsersNetwork(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.users.network({}),
    queryFn: async () => {
      const [users, activeUsers] = await Promise.all([
        fetchUsersTotal(),
        fetchUsersTotal({ status: 'ACTIVE' }),
      ])
      return { users, activeUsers }
    },
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaUsers,
  })
}

export function useNcdaUserDistrictOptions(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.users.network({ districtOptions: true }),
    queryFn: () => listDistrictsPage({ page: 1, pageSize: 100 }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaUsers,
  })
}

export function useNcdaUserCenterOptions(
  districtId: string | undefined,
  search?: string,
  enabled = true,
) {
  const id = districtId?.trim() ?? ''
  const q = search?.trim() || undefined
  return useQuery({
    queryKey: ncda.keys.users.network({ centerOptions: id, search: q }),
    queryFn: () =>
      listCentersByDistrictPage({
        districtId: id,
        search: q,
        page: 1,
        pageSize: 100,
      }),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaUsers,
  })
}

export function useNcdaUserDetail(userId: string | undefined, enabled = true) {
  const id = userId?.trim() ?? ''
  return useQuery({
    queryKey: ncda.keys.users.detail(id),
    queryFn: () => getUser(id),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaUsers,
  })
}

function invalidateUsers(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: ncda.keys.users.all })
  if (id) {
    void queryClient.invalidateQueries({ queryKey: ncda.keys.users.detail(id) })
  }
}

export function useNcdaCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateUserDto) => createUser(dto),
    onSuccess: () => invalidateUsers(queryClient),
  })
}

export function useNcdaUpdateUser(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateUserDto) => updateUser(userId, dto),
    onSuccess: () => invalidateUsers(queryClient, userId),
  })
}

export function useNcdaResetUserPassword(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (newPassword?: string) => resetUserPassword(userId, newPassword),
    onSuccess: () => invalidateUsers(queryClient, userId),
  })
}
