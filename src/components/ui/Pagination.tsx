import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/FormField'
import { common } from '@/locales/rw/common'
import { PAGE_SIZE_OPTIONS, type PageSizeOption } from '@/types'
import { getVisiblePageNumbers } from '@/lib/pagination-utils'

export interface PaginationProps {
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
  className?: string
  pageSizeSelectId?: string
}

function formatShowing(start: number, end: number, total: number): string {
  return common.pagination.showing
    .replace('{start}', String(start))
    .replace('{end}', String(end))
    .replace('{total}', String(total))
}

export function Pagination({
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
  className = '',
  pageSizeSelectId = 'pagination-page-size',
}: PaginationProps) {
  if (total === 0) return null

  const pageNumbers = getVisiblePageNumbers(page, totalPages)
  const showingLabel = formatShowing(startIndex, endIndex, total)

  return (
    <nav
      className={`flex flex-col gap-4 pt-5 mt-5 border-t border-border sm:flex-row sm:items-center sm:justify-between ${className}`}
      aria-label={common.pagination.page}
    >
      <p className="text-body text-text-secondary order-2 sm:order-1" aria-live="polite">
        {showingLabel}{' '}
        <span className="text-text-muted">{common.pagination.records}</span>
      </p>

      <div className="flex flex-col gap-3 order-1 sm:order-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor={pageSizeSelectId} className="text-caption font-semibold text-text-secondary whitespace-nowrap">
            {common.pagination.perPage}
          </label>
          <SelectInput
            id={pageSizeSelectId}
            value={String(pageSize)}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSizeOption)}
            aria-label={common.pagination.perPageLabel}
            className="!min-h-10 w-20 text-body font-semibold"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </SelectInput>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft size={16} />}
              onClick={() => onPageChange(page - 1)}
              disabled={!hasPrevious}
              aria-label={common.pagination.previous}
              className="!min-w-10 !px-2.5"
            >
              <span className="sr-only sm:not-sr-only">{common.pagination.previous}</span>
            </Button>

            <ul className="flex items-center gap-1" role="list">
              {pageNumbers.map((pageNumber, index) =>
                pageNumber === 'ellipsis' ? (
                  <li
                    key={`ellipsis-${index}`}
                    className="flex items-center justify-center min-w-8 h-8 text-caption text-text-muted"
                    aria-hidden="true"
                  >
                    …
                  </li>
                ) : (
                  <li key={pageNumber}>
                    <button
                      type="button"
                      onClick={() => onPageChange(pageNumber)}
                      aria-label={common.pagination.goToPage.replace('{page}', String(pageNumber))}
                      aria-current={pageNumber === page ? 'page' : undefined}
                      className={`
                        flex items-center justify-center min-w-11 h-11 sm:min-w-8 sm:h-8 px-2 rounded-lg text-body font-semibold
                        transition-colors duration-200
                        focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
                        ${
                          pageNumber === page
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:bg-background-subtle hover:text-text'
                        }
                      `}
                    >
                      {pageNumber}
                    </button>
                  </li>
                ),
              )}
            </ul>

            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronRight size={16} />}
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNext}
              aria-label={common.pagination.next}
              className="!min-w-10 !px-2.5"
            >
              <span className="sr-only sm:not-sr-only">{common.pagination.next}</span>
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
