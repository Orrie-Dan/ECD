import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FormField, SelectInput } from '@/components/ui/FormField'
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
import { SupportFormDialog } from '@/components/center-support/SupportFormDialog'
import { SupportViewSheet } from '@/components/center-support/SupportViewSheet'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { useAuth } from '@/contexts/AppContext'
import { canDirectorMutate } from '@/api/roles'
import { normalizeApiError } from '@/api/errors'
import {
  useCenterSupportList,
  useCreateCenterSupport,
  useUpdateCenterSupport,
} from '@/features/center-support'
import { caretaker } from '@/locales/rw/caretaker'
import { CARETAKER_PATHS } from '@/layouts/caretaker/navigation'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type {
  CenterSupportCategory,
  CenterSupportViewModel,
  CreateCenterSupportInput,
  UpdateCenterSupportInput,
} from '@/models/center-support'
import { CENTER_SUPPORT_CATEGORIES } from '@/models/center-support'
import { currentYearMonth, monthRange } from '@/lib/contribution-format'
import {
  formatReceivedBy,
  formatSupportCategory,
  formatSupportProvider,
  formatSupportQuantity,
} from '@/lib/center-support-format'
import { formatRegisterDate } from '@/lib/register-format'

const copy = caretaker.director.support

export function CenterSupportPage() {
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
        <CenterSupportLive />
      )}
    </CaretakerLayout>
  )
}

function CenterSupportLive() {
  const { user } = useAuth()
  const { showError, showSuccess } = useToast()
  const centerId = user?.centerId?.trim() ?? ''
  const canMutate = canDirectorMutate(user)

  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [categoryFilter, setCategoryFilter] = useState<CenterSupportCategory | 'all'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<CenterSupportViewModel | null>(null)
  const [viewing, setViewing] = useState<CenterSupportViewModel | null>(null)

  const range = useMemo(() => monthRange(yearMonth), [yearMonth])

  const listFilters = useMemo(
    () => ({
      centerId,
      from: range.from,
      to: range.to,
      page,
      pageSize,
      supportCategory: categoryFilter,
    }),
    [centerId, range.from, range.to, page, pageSize, categoryFilter],
  )

  const list = useCenterSupportList(listFilters, Boolean(centerId))
  const createMutation = useCreateCenterSupport()
  const updateMutation = useUpdateCenterSupport(editing?.id ?? '')

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

  function openEdit(record: CenterSupportViewModel) {
    setViewing(null)
    setFormMode('edit')
    setEditing(record)
    setFormOpen(true)
  }

  async function handleCreate(input: CreateCenterSupportInput) {
    try {
      await createMutation.mutateAsync(input)
      setFormOpen(false)
      showSuccess(copy.createSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || copy.saveError)
    }
  }

  async function handleUpdate(input: UpdateCenterSupportInput) {
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
                  <RegisterTableHeadCell>{copy.colCategory}</RegisterTableHeadCell>
                  <RegisterTableHeadCell>{copy.colDescription}</RegisterTableHeadCell>
                  <RegisterTableHeadCell>{copy.colQuantity}</RegisterTableHeadCell>
                  <RegisterTableHeadCell>{copy.colProvider}</RegisterTableHeadCell>
                  <RegisterTableHeadCell>{copy.colReceivedBy}</RegisterTableHeadCell>
                  <RegisterTableHeadCell>{copy.colActions}</RegisterTableHeadCell>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const receivedBy = formatReceivedBy(row)
                  return (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <RegisterTableCell label={copy.colDate}>
                        {formatRegisterDate(row.receivedDate)}
                      </RegisterTableCell>
                      <RegisterTableCell label={copy.colCategory}>
                        <Badge variant="info">
                          {formatSupportCategory(row.supportCategory)}
                        </Badge>
                      </RegisterTableCell>
                      <RegisterTableCell label={copy.colDescription}>
                        {row.description}
                      </RegisterTableCell>
                      <RegisterTableCell label={copy.colQuantity}>
                        {formatSupportQuantity(row.quantity, row.unit)}
                      </RegisterTableCell>
                      <RegisterTableCell label={copy.colProvider}>
                        {formatSupportProvider(row)}
                      </RegisterTableCell>
                      <RegisterTableCell label={copy.colReceivedBy}>
                        {receivedBy}
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
                  )
                })}
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

      <SupportFormDialog
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

      <SupportViewSheet
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
