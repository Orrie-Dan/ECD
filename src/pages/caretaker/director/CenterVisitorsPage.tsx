import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import {
  RegisterFiltersCard,
  RegisterListPanel,
  RegisterMonthFilter,
  RegisterPaginationFooter,
  RegisterReadOnlyBanner,
  RegisterTableCell,
  RegisterTableHeadCell,
  RegisterTableWrap,
  RegisterViewEditActions,
} from '@/components/caretaker/register'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { VisitFormDialog } from '@/components/center-visits/VisitFormDialog'
import { VisitViewSheet } from '@/components/center-visits/VisitViewSheet'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { useAuth } from '@/contexts/AppContext'
import { canDirectorMutate } from '@/api/roles'
import { normalizeApiError } from '@/api/errors'
import {
  useCenterVisitsList,
  useCreateCenterVisit,
  useUpdateCenterVisit,
} from '@/features/center-visits'
import { caretaker } from '@/locales/rw/caretaker'
import { CARETAKER_PATHS } from '@/layouts/caretaker/navigation'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type {
  CenterVisitViewModel,
  CreateCenterVisitInput,
  UpdateCenterVisitInput,
} from '@/models/center-visits'
import { currentYearMonth, monthRange } from '@/lib/contribution-format'
import { formatVisitAffiliation } from '@/lib/center-visit-format'
import { formatRegisterDate } from '@/lib/register-format'

const copy = caretaker.director.visitors

export function CenterVisitorsPage() {
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
        <CenterVisitorsLive />
      )}
    </CaretakerLayout>
  )
}

function CenterVisitorsLive() {
  const { user } = useAuth()
  const { showError, showSuccess } = useToast()
  const centerId = user?.centerId?.trim() ?? ''
  const canMutate = canDirectorMutate(user)

  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<CenterVisitViewModel | null>(null)
  const [viewing, setViewing] = useState<CenterVisitViewModel | null>(null)

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

  const list = useCenterVisitsList(listFilters, Boolean(centerId))
  const createMutation = useCreateCenterVisit()
  const updateMutation = useUpdateCenterVisit(editing?.id ?? '')

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

  function openEdit(record: CenterVisitViewModel) {
    setViewing(null)
    setFormMode('edit')
    setEditing(record)
    setFormOpen(true)
  }

  async function handleCreate(input: CreateCenterVisitInput) {
    try {
      await createMutation.mutateAsync(input)
      setFormOpen(false)
      showSuccess(copy.createSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || copy.saveError)
    }
  }

  async function handleUpdate(input: UpdateCenterVisitInput) {
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

        <RegisterListPanel
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
                      <RegisterViewEditActions
                        viewLabel={copy.view}
                        onView={() => setViewing(row)}
                        canMutate={canMutate}
                        onEdit={() => openEdit(row)}
                      />
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
      </PageContent>

      <VisitFormDialog
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

      <VisitViewSheet
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
