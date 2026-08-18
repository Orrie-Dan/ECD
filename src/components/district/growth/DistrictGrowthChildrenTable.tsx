import { Baby, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchHighlight } from '@/components/ui/SearchHighlight'
import { Pagination } from '@/components/ui/Pagination'
import { GrowthStatusBadge } from '@/components/growth/GrowthStatusBadge'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { formatDate } from '@/lib/mock-data'
import { buildChildDetailPath } from '@/lib/child-routes'
import type { DistrictGrowthChildRow } from '@/lib/nutrition-utils'

interface DistrictGrowthChildrenTableProps {
  rows: DistrictGrowthChildRow[]
  searchQuery: string
  page: number
  pageSize: number
  total: number
  totalPages: number
  startIndex: number
  endIndex: number
  hasPrevious: boolean
  hasNext: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onResetFilters?: () => void
  hasActiveFilters?: boolean
}

export function DistrictGrowthChildrenTable({
  rows,
  searchQuery,
  page,
  pageSize,
  total,
  totalPages,
  startIndex,
  endIndex,
  hasPrevious,
  hasNext,
  onPageChange,
  onPageSizeChange,
  onResetFilters,
  hasActiveFilters = false,
}: DistrictGrowthChildrenTableProps) {
  if (total === 0) {
    return (
      <Card padding="lg">
        <h3 className="text-subheading text-text mb-1">{district.growth.tableTitle}</h3>
        <p className="text-body text-text-secondary mb-5">{district.growth.tableSubtitle}</p>
        <EmptyState
          icon={<Baby size={48} className="text-text-muted" strokeWidth={1.5} />}
          title={district.growth.noChildren}
          description={district.growth.noChildrenDesc}
          action={
            hasActiveFilters && onResetFilters ? (
              <Button variant="tertiary" size="md" onClick={onResetFilters}>
                {district.growth.resetFilters}
              </Button>
            ) : undefined
          }
        />
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <h3 className="text-subheading text-text mb-1">{district.growth.tableTitle}</h3>
      <p className="text-body text-text-secondary mb-5">{district.growth.tableSubtitle}</p>

      <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
        <table className="w-full min-w-0 text-left responsive-table-cards">
          <thead>
            <tr className="border-b border-border">
              <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                {common.labels.child}
              </th>
              <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                {district.growth.childAge}
              </th>
              <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                {district.growth.center}
              </th>
              <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                {district.growth.lastScreening}
              </th>
              <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                {common.labels.status}
              </th>
              <th className="text-caption font-semibold text-text-muted pb-3">
                {common.labels.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.childId}
                className="border-b border-border last:border-0 transition-colors duration-150 hover:bg-background-subtle/60"
              >
                <td
                  className="py-3 pr-4 text-body font-medium text-text"
                  data-label={common.labels.child}
                >
                  <SearchHighlight text={row.fullName} query={searchQuery} />
                </td>
                <td
                  className="py-3 pr-4 text-body text-text-secondary tabular-nums"
                  data-label={district.growth.childAge}
                >
                  {row.age}
                </td>
                <td
                  className="py-3 pr-4 text-body text-text-secondary"
                  data-label={district.growth.center}
                >
                  <SearchHighlight text={row.centerName} query={searchQuery} />
                </td>
                <td
                  className="py-3 pr-4 text-body text-text-secondary"
                  data-label={district.growth.lastScreening}
                >
                  {row.lastScreeningDate
                    ? formatDate(row.lastScreeningDate)
                    : district.growth.notAssessed}
                </td>
                <td className="py-3 pr-4" data-label={common.labels.status}>
                  {row.nutritionStatus ? (
                    <GrowthStatusBadge status={row.nutritionStatus} />
                  ) : (
                    <Badge variant="neutral" size="sm">
                      {district.growth.notAssessed}
                    </Badge>
                  )}
                </td>
                <td className="py-3 td-actions" data-label="">
                  <Link
                    to={buildChildDetailPath('/district/abana', {
                      id: row.childId,
                      fullName: row.childName,
                    })}
                    className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary hover:underline rounded-lg px-2 py-1.5 transition-colors hover:bg-primary-light/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <Eye size={16} aria-hidden />
                    {district.growth.viewChild}
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
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeSelectId="district-growth-page-size"
      />
    </Card>
  )
}
