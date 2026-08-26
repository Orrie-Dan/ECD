import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { FormField, SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import {
  RegisterFiltersCard,
  RegisterListPanel,
  RegisterMonthFilter,
  RegisterPaginationFooter,
  RegisterTableCell,
  RegisterTableHeadCell,
  RegisterTableWrap,
  RegisterViewEditActions,
} from '@/components/caretaker/register'
import { SupportViewSheet } from '@/components/center-support/SupportViewSheet'
import { useCenterSupportList } from '@/features/center-support'
import { caretaker } from '@/locales/rw/caretaker'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type { CenterSupportCategory, CenterSupportViewModel } from '@/models/center-support'
import { CENTER_SUPPORT_CATEGORIES } from '@/models/center-support'
import { currentYearMonth, monthRange } from '@/lib/contribution-format'
import {
  formatReceivedBy,
  formatSupportCategory,
  formatSupportProvider,
  formatSupportQuantity,
} from '@/lib/center-support-format'
import { formatRegisterDate } from '@/lib/register-format'
import { hasRegisterListScope } from '@/lib/register-scope'
import type { RegisterListScope } from './types'

const copy = caretaker.director.support

export function CenterSupportList({ scope }: { scope: RegisterListScope }) {
  const centerId = scope.centerId?.trim() ?? ''
  const districtId = scope.districtId?.trim() ?? ''
  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [categoryFilter, setCategoryFilter] = useState<CenterSupportCategory | 'all'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [viewing, setViewing] = useState<CenterSupportViewModel | null>(null)
  const range = useMemo(() => monthRange(yearMonth), [yearMonth])

  const listFilters = useMemo(
    () => ({
      centerId: centerId || undefined,
      districtId: districtId || undefined,
      from: range.from,
      to: range.to,
      page,
      pageSize,
      supportCategory: categoryFilter,
    }),
    [centerId, districtId, range.from, range.to, page, pageSize, categoryFilter],
  )

  const scopeReady = hasRegisterListScope(listFilters)
  const list = useCenterSupportList(listFilters, scopeReady)
  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)

  if (!scopeReady) {
    return (
      <LiveUnavailableState title={caretaker.director.registers.supervisory.pickScope} />
    )
  }

  return (
    <>
      <RegisterFiltersCard>
        <div className="grid gap-3 sm:grid-cols-2">
          <RegisterMonthFilter
            label={copy.monthLabel}
            value={yearMonth}
            onChange={(value) => {
              setYearMonth(value)
              setPage(1)
            }}
          />
          <FormField label={copy.categoryFilter}>
            <SelectInput
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as CenterSupportCategory | 'all')
                setPage(1)
              }}
            >
              <option value="all">{copy.categoryAll}</option>
              {CENTER_SUPPORT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {copy.categories[category]}
                </option>
              ))}
            </SelectInput>
          </FormField>
        </div>
      </RegisterFiltersCard>

      <RegisterListPanel
        isLoading={list.isLoading}
        isError={list.isError}
        isEmpty={items.length === 0}
        emptyTitle={categoryFilter === 'all' ? copy.empty : copy.emptyFiltered}
        emptyDescription={categoryFilter === 'all' ? copy.emptyDesc : undefined}
        errorTitle={copy.listError}
        onRetry={() => void list.refetch()}
      >
        <>
          <RegisterTableWrap>
            <thead>
              <tr className="bg-background-subtle border-b border-border">
                <RegisterTableHeadCell>{copy.colDate}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colCategory}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colDescription}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colQuantity}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colProvider}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colReceivedBy}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colActions}</RegisterTableHeadCell>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <RegisterTableCell label={copy.colDate}>
                    {formatRegisterDate(row.receivedDate)}
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colCategory}>
                    <Badge variant="info">{formatSupportCategory(row.supportCategory)}</Badge>
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colDescription}>{row.description}</RegisterTableCell>
                  <RegisterTableCell label={copy.colQuantity}>
                    {formatSupportQuantity(row.quantity, row.unit)}
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colProvider}>
                    {formatSupportProvider(row)}
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colReceivedBy}>
                    {formatReceivedBy(row)}
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colActions}>
                    <RegisterViewEditActions viewLabel={copy.view} onView={() => setViewing(row)} />
                  </RegisterTableCell>
                </tr>
              ))}
            </tbody>
          </RegisterTableWrap>
          <RegisterPaginationFooter>
            <Pagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              startIndex={startIndex}
              endIndex={endIndex}
              hasPrevious={page > 1}
              hasNext={page < totalPages}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </RegisterPaginationFooter>
        </>
      </RegisterListPanel>

      <SupportViewSheet
        open={Boolean(viewing)}
        record={viewing}
        canMutate={false}
        onClose={() => setViewing(null)}
      />
    </>
  )
}
