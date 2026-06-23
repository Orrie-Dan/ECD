import type { PageParams, PaginatedResponse } from '@/types'

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export function getTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, page), totalPages)
}

export function getRangeIndices(page: number, pageSize: number, total: number) {
  if (total === 0) return { startIndex: 0, endIndex: 0 }
  const startIndex = (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, total)
  return { startIndex, endIndex }
}

export type PageNumber = number | 'ellipsis'

export function getVisiblePageNumbers(current: number, total: number): PageNumber[] {
  if (total <= 1) return total === 1 ? [1] : []

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages: PageNumber[] = [1]

  if (current > 3) pages.push('ellipsis')

  const rangeStart = Math.max(2, current - 1)
  const rangeEnd = Math.min(total - 1, current + 1)

  for (let page = rangeStart; page <= rangeEnd; page += 1) {
    pages.push(page)
  }

  if (current < total - 2) pages.push('ellipsis')

  pages.push(total)
  return pages
}

export function toPageParams(page: number, pageSize: number): PageParams {
  return { page, pageSize }
}

export function fromPaginatedResponse<T>(response: PaginatedResponse<T>) {
  const { startIndex, endIndex } = getRangeIndices(response.page, response.pageSize, response.total)

  return {
    items: response.items,
    page: response.page,
    pageSize: response.pageSize,
    total: response.total,
    totalPages: response.totalPages,
    startIndex,
    endIndex,
    hasPrevious: response.page > 1,
    hasNext: response.page < response.totalPages,
  }
}
