import { Eye, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePagination } from '@/hooks/usePagination'
import { district } from '@/locales/rw/district'
import { DISTRICT_NAME, formatDate, type SchoolTableData } from '@/lib/mock-data'

interface SchoolsTableProps {
  data: SchoolTableData[]
  searchQuery?: string
  onViewSchool?: (centerId: string) => void
}

type MonitoringStatus = 'good' | 'followup' | 'critical'

function getMonitoringStatus(attentionStatus: SchoolTableData['attentionStatus']): MonitoringStatus {
  if (attentionStatus === 'high') return 'critical'
  if (attentionStatus === 'medium' || attentionStatus === 'low') return 'followup'
  return 'good'
}

function MonitoringBadge({ status }: { status: MonitoringStatus }) {
  const config = {
    good: {
      bg: 'bg-success-light',
      text: 'text-success',
      label: district.schools.statusGood,
      icon: CheckCircle2,
    },
    followup: {
      bg: 'bg-warning-light',
      text: 'text-warning',
      label: district.schools.statusFollowup,
      icon: AlertTriangle,
    },
    critical: {
      bg: 'bg-error/10',
      text: 'text-error',
      label: district.schools.statusCritical,
      icon: ShieldAlert,
    },
  } as const

  const Icon = config[status].icon
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config[status].bg} ${config[status].text} text-caption font-semibold whitespace-nowrap`}
    >
      <Icon size={12} aria-hidden="true" />
      {config[status].label}
    </span>
  )
}

export function SchoolsTable({ data, searchQuery = '', onViewSchool }: SchoolsTableProps) {
  const pagination = usePagination(data, {
    initialPageSize: 10,
    resetDeps: [searchQuery],
  })

  if (data.length === 0) {
    return (
      <EmptyState
        title={district.schools.emptyTitle}
        description={district.schools.emptyDescription}
      />
    )
  }

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Mobile: cards (no horizontal scrolling) */}
      <div className="lg:hidden p-4 space-y-3">
        {pagination.items.map((school) => {
          const status = getMonitoringStatus(school.attentionStatus)
          return (
            <div
              key={school.id}
              className="rounded-xl border border-border bg-surface shadow-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-body-lg font-semibold text-text line-clamp-2">
                    {school.name}
                  </p>
                  <p className="text-caption text-text-muted mt-1">
                    {DISTRICT_NAME} / {school.sector} / {school.cell}
                  </p>
                  <p className="text-caption text-text-muted mt-1">
                    {district.schools.lastUpdated}: {formatDate(school.lastActivity)}
                  </p>
                </div>
                <div className="shrink-0">
                  <MonitoringBadge status={status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-lg bg-background-subtle/50 p-3">
                  <p className="text-caption text-text-muted">{district.schools.tableChildren}</p>
                  <p className="text-heading text-text font-bold">{school.children}</p>
                </div>
                <div className="rounded-lg bg-background-subtle/50 p-3">
                  <p className="text-caption text-text-muted">{district.schools.tableCaretakers}</p>
                  <p className="text-heading text-text font-bold">{school.caretakers}</p>
                </div>
              </div>

              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full"
                  icon={<Eye size={16} />}
                  onClick={() => onViewSchool?.(school.id)}
                >
                  {district.schools.viewDetails}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: compact table (no horizontal scrolling) */}
      <div className="hidden lg:block">
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className="bg-background-subtle border-b border-border">
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary" scope="col">
                {district.schools.tableSchool}
              </th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary" scope="col">
                {district.schools.tableLocation}
              </th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary text-center" scope="col">
                {district.schools.tableChildren}
              </th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary text-center" scope="col">
                {district.schools.tableCaretakers}
              </th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary text-center" scope="col">
                {district.schools.tableStatus}
              </th>
              <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary text-right" scope="col">
                {district.schools.tableActions}
              </th>
            </tr>
          </thead>
          <tbody>
            {pagination.items.map((school) => {
              const status = getMonitoringStatus(school.attentionStatus)
              return (
                <tr
                  key={school.id}
                  className="border-b border-border last:border-b-0 hover:bg-background-subtle/60 transition-colors"
                >
                  <td className="px-4 py-3 align-top">
                    <p className="text-body font-semibold text-text wrap-break-word">
                      {school.name}
                    </p>
                    <p className="text-caption text-text-muted mt-1">
                      {district.schools.lastUpdated}: {formatDate(school.lastActivity)}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-body text-text wrap-break-word">
                      {DISTRICT_NAME} / {school.sector} / {school.cell}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center align-top">
                    <span className="text-body font-semibold text-text">{school.children}</span>
                  </td>
                  <td className="px-4 py-3 text-center align-top">
                    <span className="text-body font-semibold text-text">{school.caretakers}</span>
                  </td>
                  <td className="px-4 py-3 text-center align-top">
                    <MonitoringBadge status={status} />
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye size={16} />}
                      onClick={() => onViewSchool?.(school.id)}
                    >
                      {district.schools.viewDetails}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4">
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          hasPrevious={pagination.hasPrevious}
          hasNext={pagination.hasNext}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          pageSizeSelectId="schools-table-page-size"
        />
      </div>
    </Card>
  )
}
