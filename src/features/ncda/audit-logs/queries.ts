import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import {
  listAuditLogsPage,
  type AuditLogsListFilters,
} from '@/api/resources/audit-logs'
import { getUser } from '@/api/resources/users'
import type { AuditNameMap } from './format'

export type NcdaAuditLogsListFilters = AuditLogsListFilters

/**
 * Paginated audit evidence — prefers a date window for national safety.
 * Caller should always pass from/to for NCDA defaults.
 */
export function useNcdaAuditLogsList(
  filters: NcdaAuditLogsListFilters = {},
  enabled = true,
) {
  const listFilters = useMemo(
    () => ({
      entityType: filters.entityType?.trim() || undefined,
      entityId: filters.entityId?.trim() || undefined,
      action: filters.action,
      userId: filters.userId,
      from: filters.from,
      to: filters.to,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
    }),
    [
      filters.entityType,
      filters.entityId,
      filters.action,
      filters.userId,
      filters.from,
      filters.to,
      filters.page,
      filters.pageSize,
    ],
  )

  return useQuery({
    queryKey: ncda.keys.auditLogs.list(listFilters as Record<string, unknown>),
    queryFn: () => listAuditLogsPage(listFilters),
    enabled: env.isLive && enabled && Boolean(listFilters.from && listFilters.to),
    staleTime: queryStaleTimes.ncdaAuditLogs,
  })
}

/** Resolve actor / created-by UUIDs to display names for the current page. */
export function useNcdaUserNames(userIds: Array<string | null | undefined>, enabled = true) {
  const idsKey = userIds
    .map((id) => id?.trim())
    .filter((id): id is string => Boolean(id))
    .sort()
    .join('|')
  const ids = useMemo(
    () => (idsKey ? idsKey.split('|') : []),
    [idsKey],
  )

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ncda.keys.users.detail(id),
      queryFn: () => getUser(id),
      enabled: env.isLive && enabled,
      staleTime: queryStaleTimes.ncdaUsers,
      retry: false,
    })),
  })

  const names = useMemo(() => {
    const map: AuditNameMap = new Map()
    ids.forEach((id, index) => {
      const user = results[index]?.data
      const label = user?.fullName?.trim() || user?.username?.trim()
      if (label) map.set(id, label)
      const createdBy = user?.createdBy
      const createdLabel = createdBy?.fullName?.trim() || createdBy?.username?.trim()
      if (createdBy?.id && createdLabel) map.set(createdBy.id, createdLabel)
    })
    return map
  }, [ids, results])

  return {
    names,
    isLoading: results.some((result) => result.isLoading),
  }
}
