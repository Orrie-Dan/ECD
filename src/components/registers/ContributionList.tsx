import { useMemo, useState } from 'react'
import { Plus, Users, HandCoins, Package, Banknote, Archive } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FormField, SelectInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { ConfirmModal } from '@/components/ui/Modal'
import { StatCard } from '@/components/caretaker/dashboard/StatCard'
import {
  RegisterFiltersCard,
  RegisterListPanel,
  RegisterMonthFilter,
  RegisterPaginationFooter,
  RegisterSummarySection,
  RegisterTableCell,
  RegisterTableHeadCell,
  RegisterTableWrap,
  RegisterViewEditActions,
} from '@/components/caretaker/register'
import { ContributionFormDialog } from '@/components/contributions/ContributionFormDialog'
import { ContributionViewSheet } from '@/components/contributions/ContributionViewSheet'
import { useToast } from '@/components/ui/Toast'
import { normalizeApiError } from '@/api/errors'
import {
  useArchiveParentContribution,
  useCreateParentContribution,
  useParentContributionSummary,
  useParentContributionsList,
  useUpdateParentContribution,
} from '@/features/contributions'
import { caretaker } from '@/locales/rw/caretaker'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type {
  CreateParentContributionInput,
  ParentContributionType,
  ParentContributionViewModel,
  UpdateParentContributionInput,
} from '@/models/contributions'
import {
  currentYearMonth,
  formatCashAmount,
  formatContributionDetail,
  formatContributionType,
  monthRange,
} from '@/lib/contribution-format'
import { formatRegisterDate } from '@/lib/register-format'
import { hasRegisterListScope } from '@/lib/register-scope'
import type { RegisterListMode, RegisterListScope } from './types'

const copy = caretaker.director.contributions

export interface ContributionListProps {
  mode: RegisterListMode
  scope: RegisterListScope
  canMutate?: boolean
}

export function ContributionList({ mode, scope, canMutate = false }: ContributionListProps) {
  const readOnly = mode === 'readOnly'
  const mutable = !readOnly && canMutate
  const centerId = scope.centerId?.trim() ?? ''
  const districtId = scope.districtId?.trim() ?? ''

  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [typeFilter, setTypeFilter] = useState<ParentContributionType | 'all'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<ParentContributionViewModel | null>(null)
  const [viewing, setViewing] = useState<ParentContributionViewModel | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ParentContributionViewModel | null>(null)

  const { showError, showSuccess } = useToast()
  const range = useMemo(() => monthRange(yearMonth), [yearMonth])

  const listFilters = useMemo(
    () => ({
      centerId: centerId || undefined,
      districtId: districtId || undefined,
      from: range.from,
      to: range.to,
      page,
      pageSize,
      contributionType: typeFilter,
    }),
    [centerId, districtId, range.from, range.to, page, pageSize, typeFilter],
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
  const list = useParentContributionsList(listFilters, scopeReady)
  const summary = useParentContributionSummary(summaryFilters, scopeReady)
  const createMutation = useCreateParentContribution()
  const updateMutation = useUpdateParentContribution(editing?.id ?? '')
  const archiveMutation = useArchiveParentContribution()

  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(page * pageSize, total)
  const summaryData = summary.data
  const parentsContributed =
    (summaryData?.cashContributorCount ?? 0) + (summaryData?.inKindContributorCount ?? 0)

  function openCreate() {
    setFormMode('create')
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(record: ParentContributionViewModel) {
    setViewing(null)
    setFormMode('edit')
    setEditing(record)
    setFormOpen(true)
  }

  async function handleCreate(input: CreateParentContributionInput) {
    try {
      await createMutation.mutateAsync(input)
      setFormOpen(false)
      showSuccess(copy.createSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || copy.saveError)
    }
  }

  async function handleUpdate(input: UpdateParentContributionInput) {
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

  async function handleArchive() {
    if (!archiveTarget) return
    try {
      await archiveMutation.mutateAsync({
        id: archiveTarget.id,
        version: archiveTarget.version,
      })
      setArchiveTarget(null)
      setViewing(null)
      showSuccess(copy.archiveSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || copy.saveError)
    }
  }

  if (!scopeReady) {
    return (
      <LiveUnavailableState
        title={readOnly ? caretaker.director.registers.supervisory.pickScope : copy.missingCenter}
      />
    )
  }

  return (
    <>
      <RegisterFiltersCard>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <RegisterMonthFilter
            label={copy.monthLabel}
            value={yearMonth}
            onChange={(value) => {
              setYearMonth(value)
              setPage(1)
            }}
          />
          <FormField label={copy.typeFilter}>
            <SelectInput
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as ParentContributionType | 'all')
                setPage(1)
              }}
            >
              <option value="all">{copy.typeAll}</option>
              <option value="cash">{copy.typeCash}</option>
              <option value="in_kind">{copy.typeInKind}</option>
            </SelectInput>
          </FormField>
        </div>
      </RegisterFiltersCard>

      <RegisterSummarySection
        id="contribution-summary-heading"
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
            <StatCard icon={<Users size={22} />} label={copy.summaryParents} value={parentsContributed} />
            <StatCard
              icon={<HandCoins size={22} />}
              label={copy.summaryCashContributors}
              value={summaryData?.cashContributorCount ?? 0}
              variant="success"
            />
            <StatCard
              icon={<Banknote size={22} />}
              label={copy.summaryCashTotal}
              value={formatCashAmount(summaryData?.cashAmountTotal ?? 0)}
              variant="success"
            />
            <StatCard
              icon={<Package size={22} />}
              label={copy.summaryInKindContributors}
              value={summaryData?.inKindContributorCount ?? 0}
              variant="warning"
            />
          </div>
        )}
      </RegisterSummarySection>

      <RegisterListPanel
        isLoading={list.isLoading}
        isError={list.isError}
        isEmpty={items.length === 0}
        emptyTitle={typeFilter === 'all' ? copy.empty : copy.emptyFiltered}
        emptyDescription={typeFilter === 'all' ? copy.emptyDesc : undefined}
        emptyAction={
          mutable ? (
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
                <RegisterTableHeadCell>{copy.colContributor}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colType}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colDetail}</RegisterTableHeadCell>
                <RegisterTableHeadCell>{copy.colActions}</RegisterTableHeadCell>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <RegisterTableCell label={copy.colDate}>
                    {formatRegisterDate(row.contributionDate)}
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colContributor}>
                    <p className="font-semibold">{row.contributorName}</p>
                    {row.contributorPhone && (
                      <p className="text-caption text-text-muted">{row.contributorPhone}</p>
                    )}
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colType}>
                    <Badge variant={row.contributionType === 'cash' ? 'success' : 'warning'}>
                      {formatContributionType(row.contributionType)}
                    </Badge>
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colDetail}>
                    {formatContributionDetail(row)}
                  </RegisterTableCell>
                  <RegisterTableCell label={copy.colActions}>
                    <RegisterViewEditActions
                      viewLabel={copy.view}
                      onView={() => setViewing(row)}
                      canMutate={mutable}
                      onEdit={mutable ? () => openEdit(row) : undefined}
                      extra={
                        mutable ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Archive size={16} />}
                            onClick={() => setArchiveTarget(row)}
                            aria-label={copy.archive}
                          >
                            {copy.archive}
                          </Button>
                        ) : undefined
                      }
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

      {mutable && centerId ? (
        <>
          <ContributionFormDialog
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
          <ConfirmModal
            open={Boolean(archiveTarget)}
            onClose={() => setArchiveTarget(null)}
            onConfirm={() => {
              void handleArchive()
            }}
            title={copy.archive}
            message={copy.archiveConfirm}
            confirmLabel={copy.archive}
          />
        </>
      ) : null}

      <ContributionViewSheet
        open={Boolean(viewing)}
        record={viewing}
        canMutate={mutable}
        onClose={() => setViewing(null)}
        onEdit={
          viewing && mutable
            ? () => {
                openEdit(viewing)
              }
            : undefined
        }
        onArchive={
          viewing && mutable
            ? () => {
                setArchiveTarget(viewing)
              }
            : undefined
        }
      />
    </>
  )
}
