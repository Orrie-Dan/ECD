/**
 * Audit logs resource — immutable evidence browser. Paginated only; no mutations.
 */
import { auditLogsControllerFindAll } from '@/api/generated/endpoints/audit-logs/audit-logs'
import type {
  AuditLogsControllerFindAllParams,
  PaginatedAuditLogsResponseDto,
  PrismaAuditAction,
} from '@/api/generated/models'

const MAX_PAGE_SIZE = 100

function clampPageSize(pageSize?: number): number {
  if (pageSize == null || Number.isNaN(pageSize)) return 20
  return Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE)
}

export type AuditLogsListFilters = {
  entityType?: string
  entityId?: string
  action?: PrismaAuditAction
  userId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export async function listAuditLogsPage(
  filters: AuditLogsListFilters = {},
): Promise<PaginatedAuditLogsResponseDto> {
  const params: AuditLogsControllerFindAllParams = {
    entityType: filters.entityType?.trim() || undefined,
    entityId: filters.entityId?.trim() || undefined,
    action: filters.action,
    userId: filters.userId,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 1,
    pageSize: clampPageSize(filters.pageSize),
  }
  return auditLogsControllerFindAll(params)
}

export const AUDIT_LOGS_MAX_PAGE_SIZE = MAX_PAGE_SIZE
