import { useMemo, useState } from 'react'
import {
  Plus,
  Calendar,
  Users,
  UserRound,
  UserRoundCheck,
  MessageCircle,
} from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { StatCard } from '@/components/caretaker/dashboard/StatCard'
import {
  RegisterFiltersCard,
  RegisterListPanel,
  RegisterMonthFilter,
  RegisterReadOnlyBanner,
  RegisterRecordCard,
  RegisterSummarySection,
  RegisterViewEditActions,
} from '@/components/caretaker/register'
import { ParentingSessionFormDialog } from '@/components/parenting-sessions/ParentingSessionFormDialog'
import { ParentingSessionViewSheet } from '@/components/parenting-sessions/ParentingSessionViewSheet'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { useAuth } from '@/contexts/AppContext'
import { canDirectorMutate } from '@/api/roles'
import { normalizeApiError } from '@/api/errors'
import {
  useCreateParentingSession,
  useParentingSessionsAttendanceSummary,
  useParentingSessionsList,
  useUpdateParentingSession,
} from '@/features/parenting-sessions'
import { caretaker } from '@/locales/rw/caretaker'
import { CARETAKER_PATHS } from '@/layouts/caretaker/navigation'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type {
  CreateParentingSessionInput,
  ParentingSessionViewModel,
  UpdateParentingSessionInput,
} from '@/models/parenting-sessions'
import { currentYearMonth, monthRange } from '@/lib/contribution-format'
import {
  formatAttendeeCount,
  formatFacilitatorLine,
  formatSessionDate,
} from '@/lib/parenting-session-format'

const copy = caretaker.director.parentingSessions

export function ParentingSessionsPage() {
  return (
    <CaretakerLayout
      pageTitle={copy.title}
      backTo={CARETAKER_PATHS.book}
      backLabel={caretaker.director.nav.book}
    >
      {!env.isLive ? (
        <PageContainer>
          <PageHeader title={copy.title} description={copy.subtitle} badge={copy.paperBadge} />
          <PageContent>
            <LiveUnavailableState title={copy.mockOnlyTitle} description={copy.mockOnlyBody} />
          </PageContent>
        </PageContainer>
      ) : (
        <ParentingSessionsLive />
      )}
    </CaretakerLayout>
  )
}

function ParentingSessionsLive() {
  const { user } = useAuth()
  const { showError, showSuccess } = useToast()
  const centerId = user?.centerId?.trim() ?? ''
  const canMutate = canDirectorMutate(user)

  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<ParentingSessionViewModel | null>(null)
  const [viewing, setViewing] = useState<ParentingSessionViewModel | null>(null)

  const range = useMemo(() => monthRange(yearMonth), [yearMonth])

  const listFilters = useMemo(
    () => ({
      centerId,
      from: range.from,
      to: range.to,
      page,
      pageSize,
    }),
    [centerId, range.from, range.to, page, pageSize],
  )

  const summaryFilters = useMemo(
    () => ({
      centerId,
      from: range.from,
      to: range.to,
    }),
    [centerId, range.from, range.to],
  )

  const list = useParentingSessionsList(listFilters, Boolean(centerId))
  const summary = useParentingSessionsAttendanceSummary(summaryFilters, Boolean(centerId))
  const createMutation = useCreateParentingSession()
  const updateMutation = useUpdateParentingSession(editing?.id ?? '')

  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)

  function openCreate() {
    setFormMode('create')
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(record: ParentingSessionViewModel) {
    setViewing(null)
    setFormMode('edit')
    setEditing(record)
    setFormOpen(true)
  }

  async function handleCreate(input: CreateParentingSessionInput) {
    try {
      await createMutation.mutateAsync(input)
      setFormOpen(false)
      showSuccess(copy.createSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || copy.saveError)
    }
  }

  async function handleUpdate(input: UpdateParentingSessionInput) {
    if (!editing) return
    try {
      await updateMutation.mutateAsync(input)
      setFormOpen(false)
      setEditing(null)
      showSuccess(copy.updateSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || copy.saveError)
    }
  }

  if (!centerId) {
    return (
      <PageContainer>
        <PageHeader title={copy.title} description={copy.subtitle} badge={copy.paperBadge} />
        <PageContent>
          <LiveUnavailableState title={copy.missingCenter} />
        </PageContent>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        badge={copy.paperBadge}
        action={
          canMutate ? (
            <Button variant="primary" size="sm" icon={<Plus size={18} />} onClick={openCreate}>
              {copy.add}
            </Button>
          ) : undefined
        }
      />
      <PageContent className="space-y-4">
        {!canMutate && <RegisterReadOnlyBanner />}

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
              <StatCard
                icon={<Calendar size={22} />}
                label={copy.summarySessions}
                value={summary.data?.sessionCount ?? 0}
              />
              <StatCard
                icon={<UserRound size={22} />}
                label={copy.summaryMale}
                value={formatAttendeeCount(summary.data?.maleAttendeesTotal ?? 0)}
                variant="success"
              />
              <StatCard
                icon={<UserRoundCheck size={22} />}
                label={copy.summaryFemale}
                value={formatAttendeeCount(summary.data?.femaleAttendeesTotal ?? 0)}
                variant="warning"
              />
              <StatCard
                icon={<Users size={22} />}
                label={copy.summaryTotal}
                value={formatAttendeeCount(summary.data?.totalAttendees ?? 0)}
              />
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
          emptyAction={
            canMutate ? (
              <Button variant="primary" icon={<Plus size={18} />} onClick={openCreate}>
                {copy.add}
              </Button>
            ) : undefined
          }
          errorTitle={copy.listError}
          onRetry={() => void list.refetch()}
        >
          <>
            <div className="space-y-3">
              {items.map((session) => (
                <RegisterRecordCard
                  key={session.id}
                  actions={
                    <RegisterViewEditActions
                      viewLabel={copy.view}
                      onView={() => setViewing(session)}
                      canMutate={canMutate}
                      onEdit={() => openEdit(session)}
                    />
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
                  <p className="text-body text-text-secondary">
                    {formatFacilitatorLine(session)}
                  </p>
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
      </PageContent>

      <ParentingSessionFormDialog
        open={formOpen}
        mode={formMode}
        centerId={centerId}
        record={editing}
        busy={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <ParentingSessionViewSheet
        open={Boolean(viewing)}
        record={viewing}
        canMutate={canMutate}
        onClose={() => setViewing(null)}
        onEdit={
          viewing
            ? () => {
                openEdit(viewing)
              }
            : undefined
        }
      />
    </PageContainer>
  )
}
