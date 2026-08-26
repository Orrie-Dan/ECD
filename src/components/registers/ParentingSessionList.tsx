import { useMemo, useState } from 'react'
import { Calendar, Users, UserRound, UserRoundCheck, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { StatCard } from '@/components/caretaker/dashboard/StatCard'
import {
  RegisterFiltersCard,
  RegisterListPanel,
  RegisterMonthFilter,
  RegisterRecordCard,
  RegisterSummarySection,
  RegisterViewEditActions,
} from '@/components/caretaker/register'
import { ParentingSessionViewSheet } from '@/components/parenting-sessions/ParentingSessionViewSheet'
import {
  useParentingSessionsAttendanceSummary,
  useParentingSessionsList,
} from '@/features/parenting-sessions'
import { caretaker } from '@/locales/rw/caretaker'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type { ParentingSessionViewModel } from '@/models/parenting-sessions'
import { currentYearMonth, monthRange } from '@/lib/contribution-format'
import {
  formatAttendeeCount,
  formatFacilitatorLine,
  formatSessionDate,
} from '@/lib/parenting-session-format'
import { hasRegisterListScope } from '@/lib/register-scope'
import type { RegisterListScope } from './types'

const copy = caretaker.director.parentingSessions

export function ParentingSessionList({ scope }: { scope: RegisterListScope }) {
  const centerId = scope.centerId?.trim() ?? ''
  const districtId = scope.districtId?.trim() ?? ''
  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [viewing, setViewing] = useState<ParentingSessionViewModel | null>(null)
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
  const summaryFilters = useMemo(
    () => ({
      centerId: centerId || undefined,
      districtId: districtId || undefined,
      from: range.from,
      to: range.to,
    }),
    [centerId, districtId, range.from, range.to],
  )

  const scopeReady = hasRegisterListScope(listFilters)
  const list = useParentingSessionsList(listFilters, scopeReady)
  const summary = useParentingSessionsAttendanceSummary(summaryFilters, scopeReady)
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

      <RegisterSummarySection
        id="parenting-summary-heading"
        title={copy.summaryTitle}
        hint={copy.summaryHint}
      >
        {summary.isLoading ? (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height="6rem" rounded="lg" className="w-full" />
            ))}
          </div>
        ) : summary.isError ? (
          <LiveUnavailableState
            compact
            title={copy.summaryError}
            action={
              <Button variant="secondary" size="sm" onClick={() => void summary.refetch()}>
                {copy.retry}
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Calendar size={22} />} label={copy.summarySessions} value={summary.data?.sessionCount ?? 0} />
            <StatCard icon={<UserRound size={22} />} label={copy.summaryMale} value={formatAttendeeCount(summary.data?.maleAttendeesTotal ?? 0)} variant="success" />
            <StatCard icon={<UserRoundCheck size={22} />} label={copy.summaryFemale} value={formatAttendeeCount(summary.data?.femaleAttendeesTotal ?? 0)} variant="warning" />
            <StatCard icon={<Users size={22} />} label={copy.summaryTotal} value={formatAttendeeCount(summary.data?.totalAttendees ?? 0)} />
          </div>
        )}
      </RegisterSummarySection>

      <RegisterListPanel
        variant="cards"
        isLoading={list.isLoading}
        isError={list.isError}
        isEmpty={items.length === 0}
        emptyTitle={copy.empty}
        emptyDescription={copy.emptyDesc}
        errorTitle={copy.listError}
        onRetry={() => void list.refetch()}
      >
        <>
          <div className="space-y-3">
            {items.map((session) => (
              <RegisterRecordCard
                key={session.id}
                actions={
                  <RegisterViewEditActions viewLabel={copy.view} onView={() => setViewing(session)} />
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-caption font-medium text-text-muted">
                    <Calendar size={14} aria-hidden="true" />
                    {formatSessionDate(session.sessionDate)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-caption font-semibold text-primary">
                    <Users size={14} aria-hidden="true" />
                    {formatAttendeeCount(session.totalAttendees)} {copy.attendeesLabel}
                  </span>
                </div>
                <h4 className="text-subheading text-text">{session.topic}</h4>
                <p className="text-body text-text-secondary">{formatFacilitatorLine(session)}</p>
                <p className="text-caption text-text-muted line-clamp-2 flex items-start gap-1.5">
                  <MessageCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {session.messageSummary}
                </p>
              </RegisterRecordCard>
            ))}
          </div>
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
        </>
      </RegisterListPanel>

      <ParentingSessionViewSheet
        open={Boolean(viewing)}
        record={viewing}
        canMutate={false}
        onClose={() => setViewing(null)}
      />
    </>
  )
}
