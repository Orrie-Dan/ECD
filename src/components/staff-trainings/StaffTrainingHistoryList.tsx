import { Calendar, Award, Clock, Building2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { Pagination } from '@/components/ui/Pagination'
import { caretaker } from '@/locales/rw/caretaker'
import { useStaffTrainingsList } from '@/features/staff-trainings'
import type { StaffTrainingListFilters, StaffTrainingViewModel } from '@/models/staff-trainings'
import {
  formatCertificateStatus,
  formatTrainingDuration,
} from '@/lib/staff-training-format'

const copy = caretaker.director.trainings

interface StaffTrainingHistoryListProps {
  filters: StaffTrainingListFilters
  enabled?: boolean
  emptyTitle: string
  emptyDescription?: string
  hint?: string
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onSelect?: (record: StaffTrainingViewModel) => void
}

export function StaffTrainingHistoryList({
  filters,
  enabled = true,
  emptyTitle,
  emptyDescription,
  hint,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSelect,
}: StaffTrainingHistoryListProps) {
  const list = useStaffTrainingsList(filters, enabled)
  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)

  if (list.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height="5rem" rounded="lg" className="w-full" />
        ))}
      </div>
    )
  }

  if (list.isError) {
    return (
      <LiveUnavailableState
        title={copy.listError}
        action={
          <Button variant="secondary" size="sm" onClick={() => void list.refetch()}>
            {copy.retry}
          </Button>
        }
      />
    )
  }

  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="space-y-3">
      {hint ? <p className="text-caption text-text-muted">{hint}</p> : null}
      {items.map((row) => (
        <Card
          key={row.id}
          elevated
          padding="md"
          className={onSelect ? 'border border-border hover:border-primary/30 transition-colors' : ''}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-subheading text-text">{row.topic}</h4>
                <Badge variant={row.certificateReceived ? 'success' : 'neutral'}>
                  {formatCertificateStatus(row.certificateReceived)}
                </Badge>
              </div>
              <p className="text-caption text-text-muted flex items-center gap-1.5">
                <Calendar size={14} aria-hidden="true" />
                {row.trainingDate}
              </p>
              <p className="text-body text-text-secondary flex items-center gap-1.5">
                <Building2 size={14} aria-hidden="true" />
                {row.trainingProvider}
              </p>
              <p className="text-caption text-text-muted flex items-center gap-1.5">
                <Clock size={14} aria-hidden="true" />
                {formatTrainingDuration(row.durationDays)}
                <Award size={14} className="ml-2" aria-hidden="true" />
                {formatCertificateStatus(row.certificateReceived)}
              </p>
            </div>
            {onSelect ? (
              <Button variant="ghost" size="sm" onClick={() => onSelect(row)}>
                {copy.view}
              </Button>
            ) : null}
          </div>
        </Card>
      ))}
      {totalPages > 1 || total > pageSize ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={total}
          startIndex={startIndex}
          endIndex={endIndex}
          hasPrevious={page > 1}
          hasNext={page < totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={(size) => {
            onPageSizeChange(size)
            onPageChange(1)
          }}
        />
      ) : null}
    </div>
  )
}
