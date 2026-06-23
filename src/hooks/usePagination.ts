import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '@/types'
import {
  clampPage,
  getRangeIndices,
  getTotalPages,
  paginateItems,
} from '@/lib/pagination-utils'

interface UsePaginationOptions {
  initialPageSize?: number
  /** When any dependency changes, the current page resets to 1. */
  resetDeps?: readonly unknown[]
}

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { initialPageSize = DEFAULT_PAGE_SIZE, resetDeps = [] } = options
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const total = items.length
  const totalPages = getTotalPages(total, pageSize)
  const safePage = clampPage(page, totalPages)

  useEffect(() => {
    setPage(1)
  }, [pageSize, ...resetDeps])

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage)
    }
  }, [page, safePage])

  const paginatedItems = useMemo(
    () => paginateItems(items, safePage, pageSize),
    [items, safePage, pageSize],
  )

  const { startIndex, endIndex } = getRangeIndices(safePage, pageSize, total)

  return {
    items: paginatedItems,
    page: safePage,
    pageSize,
    total,
    totalPages,
    startIndex,
    endIndex,
    hasPrevious: safePage > 1,
    hasNext: safePage < totalPages,
    setPage,
    setPageSize,
  }
}
