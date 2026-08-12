import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import {
  listAuditLogsPage,
  type AuditLogsListFilters,
} from '@/api/resources/audit-logs'

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
