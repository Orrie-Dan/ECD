import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextInput, SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { env } from '@/config/env'
import { useNcdaAuditLogsList, useNcdaUserNames } from '@/features/ncda/audit-logs/queries'
import {
  actionLabel,
  collectUserIds,
  entityDisplayName,
  entityTypeLabel,
  formatDateTime,
  stashAuditLog,
} from '@/features/ncda/audit-logs/format'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'
import type { PrismaAuditAction } from '@/api/generated/models'

type ActionFilter = 'all' | PrismaAuditAction

function defaultFrom(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 7)
  return d.toISOString().slice(0, 10)
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * NCDA Audit Logs — immutable evidence browser.
 * Requires a server date window; never loads the full national audit history.
 */
export function NcdaAuditLogsPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.auditLogs.title}
          subtitle={ncda.auditLogs.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.auditLogs.mockOnlyTitle}
            description={ncda.auditLogs.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaAuditLogsLive />
}

function NcdaAuditLogsLive() {
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [action, setAction] = useState<ActionFilter>('all')
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [userId, setUserId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const filters = useMemo(
    () => ({
      from,
      to,
      action: action === 'all' ? undefined : action,
      entityType: entityType.trim() || undefined,
      entityId: entityId.trim() || undefined,
      userId: userId.trim() || undefined,
      page,
      pageSize,
    }),
    [from, to, action, entityType, entityId, userId, page, pageSize],
  )

  const list = useNcdaAuditLogsList(filters, Boolean(from && to))
  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)

  const actorIds = useMemo(
    () => items.flatMap((row) => collectUserIds(row)),
    [items],
  )
  const { names, isLoading: namesLoading } = useNcdaUserNames(actorIds, items.length > 0)

  return (
    <PageContainer>
      <PageHeader
        title={ncda.sections.auditLogs.title}
        subtitle={ncda.auditLogs.subtitle}
        size="compact"
      />
      <PageContent>
        <p className="mb-4 text-caption text-text-muted">{ncda.auditLogs.immutableNote}</p>

        <Card padding="md" className="border-border space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.auditLogs.from}
              </label>
              <TextInput
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value)
                  setPage(1)
                }}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.auditLogs.to}
              </label>
              <TextInput
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value)
                  setPage(1)
                }}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.auditLogs.actionFilter}
              </label>
              <SelectInput
                value={action}
                onChange={(e) => {
                  setAction(e.target.value as ActionFilter)
                  setPage(1)
                }}
              >
                <option value="all">{ncda.auditLogs.actionAll}</option>
                <option value="create">{ncda.auditLogs.actions.create}</option>
                <option value="update">{ncda.auditLogs.actions.update}</option>
                <option value="delete">{ncda.auditLogs.actions.delete}</option>
              </SelectInput>
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.auditLogs.entityType}
              </label>
              <TextInput
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value)
                  setPage(1)
                }}
                placeholder="ecd_center, child, …"
              />
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.auditLogs.entityId}
              </label>
              <TextInput
                value={entityId}
                onChange={(e) => {
                  setEntityId(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-caption font-semibold text-text-secondary">
                {ncda.auditLogs.actorId}
              </label>
              <TextInput
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>

          {!from || !to ? (
            <p className="text-body text-text-secondary">{ncda.auditLogs.dateRequired}</p>
          ) : list.isError && !list.data ? (
            <div className="space-y-3">
              <p className="text-body text-text-secondary">{ncda.auditLogs.listError}</p>
              <Button type="button" variant="primary" onClick={() => void list.refetch()}>
                {ncda.auditLogs.retry}
              </Button>
            </div>
          ) : list.isLoading && !list.data ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height="2.75rem" className="w-full" rounded="md" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-body text-text-secondary">{ncda.auditLogs.empty}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-0 sm:min-w-[44rem] text-left text-body responsive-table-cards">
                  <thead>
                    <tr className="border-b border-border text-caption text-text-secondary">
                      <th className="py-2 pr-3 font-semibold">{ncda.auditLogs.colWhen}</th>
                      <th className="py-2 pr-3 font-semibold">{ncda.auditLogs.colAction}</th>
                      <th className="py-2 pr-3 font-semibold">{ncda.auditLogs.colEntity}</th>
                      <th className="py-2 pr-3 font-semibold">{ncda.auditLogs.colActor}</th>
                      <th className="py-2 font-semibold">{ncda.auditLogs.colActionBtn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id} className="border-b border-border/70">
                        <td
                          className="py-2.5 pr-3 text-text-secondary"
                          data-label={ncda.auditLogs.colWhen}
                        >
                          {formatDateTime(row.changedAt)}
                        </td>
                        <td
                          className="py-2.5 pr-3 font-medium text-text"
                          data-label={ncda.auditLogs.colAction}
                        >
                          {actionLabel(row.action)}
                        </td>
                        <td
                          className="py-2.5 pr-3 text-text-secondary"
                          data-label={ncda.auditLogs.colEntity}
                        >
                          <span className="block font-medium text-text">{entityDisplayName(row)}</span>
                          <span className="block text-caption">
                            {entityTypeLabel(row.entityType)}
                          </span>
                        </td>
                        <td
                          className="py-2.5 pr-3 text-text"
                          data-label={ncda.auditLogs.colActor}
                        >
                          {row.changedById
                            ? (names.get(row.changedById) ??
                              (namesLoading ? '…' : ncda.auditLogs.unknownActor))
                            : ncda.auditLogs.unknownActor}
                        </td>
                        <td className="py-2.5 td-actions" data-label={ncda.auditLogs.colActionBtn}>
                          <Link
                            to={`${NCDA_PATHS.auditLogs}/${row.id}`}
                            state={{ log: row }}
                            onClick={() => stashAuditLog(row)}
                            className="inline-flex items-center text-caption font-semibold text-primary hover:underline"
                          >
                            {ncda.auditLogs.viewDetail}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                totalPages={totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                hasPrevious={page > 1}
                hasNext={page < totalPages}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size as PageSizeOption)
                  setPage(1)
                }}
                pageSizeSelectId="ncda-audit-page-size"
              />
            </>
          )}
        </Card>
      </PageContent>
    </PageContainer>
  )
}
