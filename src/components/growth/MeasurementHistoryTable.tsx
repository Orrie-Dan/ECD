import { useMemo } from 'react'
import { Ruler } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { GrowthStatusBadge } from '@/components/growth/GrowthStatusBadge'
import { usePagination } from '@/hooks/usePagination'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { formatDate } from '@/lib/mock-data'
import { classifyNutrition, sortMeasurementsDesc } from '@/lib/nutrition-utils'
import type { Child, GrowthMeasurement } from '@/types'

interface MeasurementHistoryTableProps {
  records: GrowthMeasurement[]
  childrenById?: Map<string, Child>
  showChildName?: boolean
  title?: string
  emptyMessage?: string
  emptyDescription?: string
  resetDeps?: unknown[]
  className?: string
  onEdit?: (record: GrowthMeasurement) => void
  canEdit?: boolean
  /** Visually emphasize the most recent measurement row */
  highlightLatest?: boolean
}

export function MeasurementHistoryTable({
  records,
  childrenById,
  showChildName = false,
  title = caretaker.growth.growthHistory,
  emptyMessage = caretaker.growth.noMeasurements,
  emptyDescription,
  resetDeps = [],
  className = '',
  onEdit,
  canEdit = false,
  highlightLatest = false,
}: MeasurementHistoryTableProps) {
  const sorted = useMemo(() => sortMeasurementsDesc(records), [records])
  const pagination = usePagination(sorted, { resetDeps: [sorted.length, ...resetDeps] })
  const latestId = sorted[0]?.id

  return (
    <Card padding="lg" className={className}>
      <h3 className="text-label text-primary mb-4">{title}</h3>
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Ruler size={48} className="text-text-muted" strokeWidth={1.5} />}
          title={emptyMessage}
          description={emptyDescription ?? caretaker.growth.noMeasurementsDesc}
        />
      ) : (
        <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
          <table className="w-full min-w-0 text-left responsive-table-cards">
            <thead>
              <tr className="border-b border-border bg-background-subtle/80">
                {showChildName && (
                  <th className="text-caption font-semibold uppercase tracking-wide text-text-secondary px-2 py-3 pr-4">
                    {common.labels.child}
                  </th>
                )}
                <th className="text-caption font-semibold uppercase tracking-wide text-text-secondary px-2 py-3 pr-4">
                  {common.labels.date}
                </th>
                <th className="text-caption font-semibold uppercase tracking-wide text-text-secondary px-2 py-3 pr-4">
                  {caretaker.growth.weightShort}
                </th>
                <th className="text-caption font-semibold uppercase tracking-wide text-text-secondary px-2 py-3 pr-4">
                  {caretaker.growth.muacShort}
                </th>
                <th className="text-caption font-semibold uppercase tracking-wide text-text-secondary px-2 py-3 pr-4">
                  {common.labels.status}
                </th>
                <th className="text-caption font-semibold uppercase tracking-wide text-text-secondary px-2 py-3 pr-4">
                  {caretaker.growth.recordedBy}
                </th>
                {canEdit && onEdit && (
                  <th className="text-caption font-semibold uppercase tracking-wide text-text-secondary px-2 py-3">
                    {common.labels.actions}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {pagination.items.map((record) => {
                const child = childrenById?.get(record.childId)
                const status = classifyNutrition({
                  muacCm: record.muacCm,
                  weightKg: record.weightKg,
                })
                const isLatest = highlightLatest && record.id === latestId
                return (
                  <tr
                    key={record.id}
                    className={`border-b border-border last:border-0 transition-colors hover:bg-background-subtle/50 ${
                      isLatest ? 'bg-primary-light/40' : ''
                    }`}
                  >
                    {showChildName && (
                      <td
                        className="py-3 px-2 pr-4 text-body font-medium text-text"
                        data-label={common.labels.child}
                      >
                        {child?.fullName ?? record.childId}
                      </td>
                    )}
                    <td className="py-3 px-2 pr-4 text-body" data-label={common.labels.date}>
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {formatDate(record.date)}
                        {isLatest && (
                          <Badge variant="primary" size="sm">
                            {caretaker.growth.latestMeasurement}
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td
                      className="py-3 px-2 pr-4 text-body font-medium tabular-nums"
                      data-label={caretaker.growth.weight}
                    >
                      {record.weightKg}
                    </td>
                    <td
                      className="py-3 px-2 pr-4 text-body font-medium tabular-nums"
                      data-label={caretaker.growth.muac}
                    >
                      {record.muacCm}
                    </td>
                    <td className="py-3 px-2 pr-4" data-label={common.labels.status}>
                      <GrowthStatusBadge status={status} />
                    </td>
                    <td
                      className="py-3 px-2 pr-4 text-body"
                      data-label={caretaker.growth.recordedBy}
                    >
                      {record.recordedBy ?? '—'}
                    </td>
                    {canEdit && onEdit && (
                      <td className="py-3 px-2" data-label={common.labels.actions}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEdit(record)}
                        >
                          {caretaker.growth.editMeasurement}
                        </Button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
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
          />
        </div>
      )}
    </Card>
  )
}
