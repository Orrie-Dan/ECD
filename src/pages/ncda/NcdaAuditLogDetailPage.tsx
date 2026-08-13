import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { env } from '@/config/env'
import { useNcdaUserNames } from '@/features/ncda/audit-logs/queries'
import {
  actionLabel,
  collectUserIds,
  entityDisplayName,
  entityTypeLabel,
  formatDateTime,
  readStashedAuditLog,
  snapshotToRows,
} from '@/features/ncda/audit-logs/format'
import type { AuditLogResponseDto } from '@/api/generated/models'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'

type LocationState = { log?: AuditLogResponseDto }

export function NcdaAuditLogDetailPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.auditLogs.detailTitle}
          subtitle={ncda.auditLogs.detailSubtitle}
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

  return <NcdaAuditLogDetailLive />
}

function NcdaAuditLogDetailLive() {
  const { logId = '' } = useParams<{ logId: string }>()
  const location = useLocation()
  const fromState = (location.state as LocationState | null)?.log
  const log =
    fromState && fromState.id === logId ? fromState : readStashedAuditLog(logId)

  const userIds = log ? collectUserIds(log) : []
  const { names, isLoading: namesLoading } = useNcdaUserNames(userIds, Boolean(log))

  const backLink = (
    <Link
      to={NCDA_PATHS.auditLogs}
      className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary hover:underline"
    >
      <ArrowLeft size={14} aria-hidden />
      {ncda.auditLogs.backToList}
    </Link>
  )

  if (!log) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.auditLogs.detailTitle}
          subtitle={ncda.auditLogs.detailSubtitle}
          size="compact"
        />
        <PageContent>
          {backLink}
          <div className="mt-4">
            <LiveUnavailableState
              title={ncda.auditLogs.notFound}
              description={ncda.auditLogs.notFoundBody}
            />
          </div>
        </PageContent>
      </PageContainer>
    )
  }

  const actorName = log.changedById
    ? (names.get(log.changedById) ?? (namesLoading ? '…' : ncda.auditLogs.unknownActor))
    : ncda.auditLogs.unknownActor
  const oldRows = snapshotToRows(log.oldValues, names)
  const newRows = snapshotToRows(log.newValues, names)
  const extraRows = snapshotToRows(log.metadata, names)
  const changeRows = mergeChangeRows(oldRows, newRows)

  return (
    <PageContainer>
      <PageHeader
        title={entityDisplayName(log)}
        subtitle={ncda.auditLogs.detailSubtitle}
        size="compact"
      />
      <PageContent className="space-y-4">
        {backLink}

        <Card padding="md" className="border-border">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body">
            <div>
              <dt className="text-caption text-text-secondary">{ncda.auditLogs.colWhen}</dt>
              <dd className="font-semibold text-text">{formatDateTime(log.changedAt)}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-secondary">{ncda.auditLogs.colAction}</dt>
              <dd className="font-semibold text-text">{actionLabel(log.action)}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-secondary">{ncda.auditLogs.entityType}</dt>
              <dd className="font-semibold text-text">{entityTypeLabel(log.entityType)}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-secondary">{ncda.auditLogs.colActor}</dt>
              <dd className="font-semibold text-text">{actorName}</dd>
            </div>
          </dl>
        </Card>

        <Card padding="md" className="border-border space-y-3">
          <h2 className="text-subheading font-semibold text-text">{ncda.auditLogs.changesTitle}</h2>
          {changeRows.length === 0 && extraRows.length === 0 ? (
            <p className="text-body text-text-secondary">{ncda.auditLogs.noFields}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 text-left text-body">
                <thead>
                  <tr className="border-b border-border text-caption text-text-secondary">
                    <th className="py-2 pr-3 font-semibold">{ncda.auditLogs.field}</th>
                    {log.action !== 'create' ? (
                      <th className="py-2 pr-3 font-semibold">{ncda.auditLogs.oldValues}</th>
                    ) : null}
                    {log.action !== 'delete' ? (
                      <th className="py-2 font-semibold">{ncda.auditLogs.newValues}</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {changeRows.map((row) => (
                    <tr key={row.key} className="border-b border-border/70 align-top">
                      <td className="py-2.5 pr-3 font-medium text-text">{row.label}</td>
                      {log.action !== 'create' ? (
                        <td className="py-2.5 pr-3 text-text-secondary">{row.before || '—'}</td>
                      ) : null}
                      {log.action !== 'delete' ? (
                        <td className="py-2.5 text-text">{row.after || '—'}</td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              {extraRows.length > 0 ? (
                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-body">
                  {extraRows.map((row) => (
                    <div key={`meta-${row.key}`}>
                      <dt className="text-caption text-text-secondary">{row.label}</dt>
                      <dd className="text-text">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          )}
        </Card>
      </PageContent>
    </PageContainer>
  )
}

function mergeChangeRows(
  oldRows: ReturnType<typeof snapshotToRows>,
  newRows: ReturnType<typeof snapshotToRows>,
) {
  const byKey = new Map<
    string,
    { key: string; label: string; before: string; after: string }
  >()
  for (const row of oldRows) {
    byKey.set(row.key, { key: row.key, label: row.label, before: row.value, after: '' })
  }
  for (const row of newRows) {
    const existing = byKey.get(row.key)
    if (existing) {
      existing.after = row.value
      existing.label = row.label
    } else {
      byKey.set(row.key, { key: row.key, label: row.label, before: '', after: row.value })
    }
  }
  return [...byKey.values()].filter((row) => row.before !== row.after || row.after || row.before)
}
