import { Baby, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchHighlight } from '@/components/ui/SearchHighlight'
import { Pagination } from '@/components/ui/Pagination'
import { calculateAge } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'
import { common, gender } from '@/locales/rw/common'
import type { Child } from '@/types'

interface ChildrenTableSectionProps {
  children: Child[]
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

export function ChildrenTableSection({
  children,
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
}: ChildrenTableSectionProps) {
  if (total === 0) {
    return (
      <Card padding="lg">
        <h3 className="text-subheading text-text mb-1">{district.children.tableTitle}</h3>
        <p className="text-body text-text-secondary mb-5">{district.children.tableSubtitle}</p>
        <EmptyState
          icon={<Baby size={48} className="text-text-muted" strokeWidth={1.5} />}
          title={district.children.noResults}
          description={district.children.noResultsDesc}
          action={
            hasActiveFilters && onResetFilters ? (
              <Button variant="tertiary" size="md" onClick={onResetFilters}>
                {district.children.resetFilters}
              </Button>
            ) : undefined
          }
        />
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <h3 className="text-subheading text-text mb-1">{district.children.tableTitle}</h3>
      <p className="text-body text-text-secondary mb-5">{district.children.tableSubtitle}</p>

      <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
        <table className="w-full min-w-0 text-left responsive-table-cards">
          <thead>
            <tr className="border-b border-border">
              <th className="text-caption font-semibold text-text-muted pb-3 pr-4">{common.labels.child}</th>
              <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                {district.children.childAge}
              </th>
              <th className="text-caption font-semibold text-text-muted pb-3 pr-4">{common.labels.gender}</th>
              <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                {district.children.childSector}
              </th>
              <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                {district.children.guardian}
              </th>
              <th className="text-caption font-semibold text-text-muted pb-3">{common.labels.actions}</th>
            </tr>
          </thead>
          <tbody>
            {children.map((child) => (
              <tr
                key={child.id}
                className="border-b border-border last:border-0 transition-colors duration-150 hover:bg-background-subtle/60"
              >
                <td className="py-3 pr-4 text-body font-medium text-text" data-label={common.labels.child}>
                  <SearchHighlight text={child.fullName} query={searchQuery} />
                </td>
                <td
                  className="py-3 pr-4 text-body text-text-secondary"
                  data-label={district.children.childAge}
                >
                  {calculateAge(child.dateOfBirth)}
                </td>
                <td className="py-3 pr-4 text-body text-text-secondary" data-label={common.labels.gender}>
                  {gender[child.gender]}
                </td>
                <td
                  className="py-3 pr-4 text-body text-text-secondary"
                  data-label={district.children.childSector}
                >
                  {child.sector}
                </td>
                <td
                  className="py-3 pr-4 text-body text-text-secondary"
                  data-label={district.children.guardian}
                >
                  <SearchHighlight text={child.guardianName} query={searchQuery} />
                </td>
                <td className="py-3 td-actions" data-label="">
                  <Link
                    to={`/district/abana/${child.id}`}
                    className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary hover:underline rounded-lg px-2 py-1.5 transition-colors hover:bg-primary-light/50"
                  >
                    <Eye size={16} aria-hidden />
                    {district.children.viewDetails}
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
        pageSizeSelectId="district-children-page-size"
      />
    </Card>
  )
}
