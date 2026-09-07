import { Eye, CheckCircle2, Ban } from 'lucide-react'
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
  /** When omitted, falls back to mock DISTRICT_NAME (MOCK demo only). */
  districtLabel?: string
}

function locationLabel(school: SchoolTableData, districtLabel: string) {
  const parts = [districtLabel, school.sector, school.cell].filter(
    (part) => part && part !== '—',
  )
  return parts.join(' / ')
}

function CenterStatusBadge({ isActive }: { isActive: boolean }) {
  const config = isActive
    ? {
        bg: 'bg-success-light',
        text: 'text-success',
        label: district.schools.statusActive,
        icon: CheckCircle2,
      }
    : {
        bg: 'bg-background-subtle',
        text: 'text-text-muted',
        label: district.schools.statusInactive,
        icon: Ban,
      }

  const Icon = config.icon
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.text} text-caption font-semibold whitespace-nowrap`}
    >
      <Icon size={12} aria-hidden="true" />
      {config.label}
    </span>
  )
}

export function SchoolsTable({
  data,
  searchQuery = '',
  onViewSchool,
  districtLabel = DISTRICT_NAME,
}: SchoolsTableProps) {
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
        {pagination.items.map((school) => (
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
                  {locationLabel(school, districtLabel)}
                </p>
                <p className="text-caption text-text-muted mt-1">
                  {district.schools.lastUpdated}: {formatDate(school.lastActivity)}
                </p>
              </div>
              <div className="shrink-0">
                <CenterStatusBadge isActive={school.isActive} />
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
        ))}
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
            {pagination.items.map((school) => (
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
                    {locationLabel(school, districtLabel)}
                  </p>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <span className="text-body font-semibold text-text">{school.children}</span>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <span className="text-body font-semibold text-text">{school.caretakers}</span>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <CenterStatusBadge isActive={school.isActive} />
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
            ))}
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
