import { useMemo, useState } from 'react'
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
import { VisitViewSheet } from '@/components/center-visits/VisitViewSheet'
import { useCenterVisitsList } from '@/features/center-visits'
import { caretaker } from '@/locales/rw/caretaker'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type { CenterVisitViewModel } from '@/models/center-visits'
import { currentYearMonth, monthRange } from '@/lib/contribution-format'
import { formatVisitAffiliation } from '@/lib/center-visit-format'
import { formatRegisterDate } from '@/lib/register-format'
import { hasRegisterListScope } from '@/lib/register-scope'
import type { RegisterListScope } from './types'

const copy = caretaker.director.visitors

export function CenterVisitorsList({ scope }: { scope: RegisterListScope }) {
  const centerId = scope.centerId?.trim() ?? ''
  const districtId = scope.districtId?.trim() ?? ''
  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [viewing, setViewing] = useState<CenterVisitViewModel | null>(null)
  const range = useMemo(() => monthRange(yearMonth), [yearMonth])

  const listFilters = useMemo(
    () => ({
      centerId: centerId || undefined,
      districtId: districtId || undefined,
      from: range.from,
      to: range.to,
      page,
      pageSize,
    }),
    [centerId, districtId, range.from, range.to, page, pageSize],
  )

  const scopeReady = hasRegisterListScope(listFilters)
  const list = useCenterVisitsList(listFilters, scopeReady)
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
        <RegisterMonthFilter
          label={copy.monthLabel}
          value={yearMonth}
          onChange={(value) => {
            setYearMonth(value)
            setPage(1)
          }}
        />
      </RegisterFiltersCard>

      <RegisterListPanel
        isLoading={list.isLoading}
        isError={list.isError}
        isEmpty={items.length === 0}
        emptyTitle={copy.empty}
        emptyDescription={copy.emptyDesc}
        errorTitle={copy.listError}
        onRetry={() => void list.refetch()}
      >
        <>
          <RegisterTableWrap>
            <thead>
              <tr className="bg-background-subtle border-b border-border">
                <RegisterTableHeadCell>{copy.colDate}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colVisitor}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colAffiliation}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colPurpose}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colActions}</RegisterTableHeadCell>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <RegisterTableCell label={copy.colDate}>
                    {formatRegisterDate(row.visitDate)}
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colVisitor}>
                    <p className="font-semibold">{row.visitorName}</p>
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colAffiliation}>
                    {formatVisitAffiliation(row)}
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colPurpose}>
                    {row.purposeOrMessage}
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

      <VisitViewSheet
        open={Boolean(viewing)}
        record={viewing}
        canMutate={false}
        onClose={() => setViewing(null)}
      />
    </>
  )
}
