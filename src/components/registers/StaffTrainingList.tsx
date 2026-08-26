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
import { StaffTrainingViewSheet } from '@/components/staff-trainings/StaffTrainingViewSheet'
import { useStaffTrainingsList } from '@/features/staff-trainings'
import { useCenterUsersList } from '@/features/caretaker/users/queries'
import { caretaker } from '@/locales/rw/caretaker'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type { StaffTrainingViewModel } from '@/models/staff-trainings'
import type { CenterUserResponse } from '@/api/resources/users'
import { currentYearMonth, monthRange } from '@/lib/contribution-format'
import { formatCertificateStatus, formatTrainingDuration } from '@/lib/staff-training-format'
import { formatRegisterDate } from '@/lib/register-format'
import { hasRegisterListScope } from '@/lib/register-scope'
import type { RegisterListScope } from './types'

const copy = caretaker.director.trainings

export function StaffTrainingList({ scope }: { scope: RegisterListScope }) {
  const centerId = scope.centerId?.trim() ?? ''
  const districtId = scope.districtId?.trim() ?? ''
  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [traineeUserId, setTraineeUserId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [viewing, setViewing] = useState<StaffTrainingViewModel | null>(null)
  const range = useMemo(() => monthRange(yearMonth), [yearMonth])

  const listFilters = useMemo(
    () => ({
      centerId: centerId || undefined,
      districtId: districtId || undefined,
      from: range.from,
      to: range.to,
      traineeUserId: traineeUserId || undefined,
      page,
      pageSize,
    }),
    [centerId, districtId, range.from, range.to, traineeUserId, page, pageSize],
  )

  const scopeReady = hasRegisterListScope(listFilters)
  const list = useStaffTrainingsList(listFilters, scopeReady)
  const caregivers = useCenterUsersList(
    { centerId, page: 1, pageSize: 100, status: 'ACTIVE' },
    Boolean(centerId),
  )

  const traineeOptions = useMemo(() => {
    const rows = (caregivers.data?.items ?? caregivers.data?.data ?? []) as CenterUserResponse[]
    return rows.map((row) => ({ id: row.id, fullName: row.fullName }))
  }, [caregivers.data])

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
          <FormField label={copy.traineeFilter}>
            <SelectInput
              value={traineeUserId}
              onChange={(e) => {
                setTraineeUserId(e.target.value)
                setPage(1)
              }}
              disabled={!centerId}
            >
              <option value="">{copy.traineeAll}</option>
              {traineeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.fullName}
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
        emptyTitle={traineeUserId ? copy.emptyFiltered : copy.empty}
        emptyDescription={traineeUserId ? undefined : copy.emptyDesc}
        errorTitle={copy.listError}
        onRetry={() => void list.refetch()}
      >
        <>
          <RegisterTableWrap>
            <thead>
              <tr className="bg-background-subtle border-b border-border">
                <RegisterTableHeadCell>{copy.colDate}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colTrainee}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colProvider}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colTopic}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colDuration}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colCertificate}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colActions}</RegisterTableHeadCell>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <RegisterTableCell label={copy.colDate}>
                    {formatRegisterDate(row.trainingDate)}
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colTrainee}>
                    <p className="font-semibold">{row.traineeName}</p>
                    <p className="text-caption text-text-muted">{row.traineeRole}</p>
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colProvider}>{row.trainingProvider}</RegisterTableCell>
                  <RegisterTableCell label={copy.colTopic}>{row.topic}</RegisterTableCell>
                  <RegisterTableCell label={copy.colDuration}>
                    {formatTrainingDuration(row.durationDays)}
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colCertificate}>
                    <Badge variant={row.certificateReceived ? 'success' : 'neutral'}>
                      {formatCertificateStatus(row.certificateReceived)}
                    </Badge>
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

      <StaffTrainingViewSheet
        open={Boolean(viewing)}
        record={viewing}
        canMutate={false}
        onClose={() => setViewing(null)}
      />
    </>
  )
}
