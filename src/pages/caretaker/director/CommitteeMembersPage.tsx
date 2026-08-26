import { useMemo, useState } from 'react'
import { Plus, UserMinus, Phone, Briefcase } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import {
  RegisterListPanel,
  RegisterReadOnlyBanner,
  RegisterRecordCard,
  RegisterViewEditActions,
} from '@/components/caretaker/register'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { ConfirmModal } from '@/components/ui/Modal'
import { CommitteeMemberFormDialog } from '@/components/committee/CommitteeMemberFormDialog'
import { CommitteeMemberViewSheet } from '@/components/committee/CommitteeMemberViewSheet'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { useAuth } from '@/contexts/AppContext'
import { canDirectorMutate } from '@/api/roles'
import { normalizeApiError } from '@/api/errors'
import {
  useCommitteeMembersList,
  useCreateCommitteeMember,
  useDeactivateCommitteeMember,
  useUpdateCommitteeMember,
} from '@/features/committee-members'
import { caretaker } from '@/locales/rw/caretaker'
import { CARETAKER_PATHS } from '@/layouts/caretaker/navigation'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type {
  CommitteeMemberViewModel,
  CreateCommitteeMemberInput,
  UpdateCommitteeMemberInput,
} from '@/models/committee-members'
import {
  formatCommitteePhone,
  formatCommitteeStatus,
  formatMembershipSpan,
} from '@/lib/committee-educator-format'

const copy = caretaker.director.committee

type StatusTab = 'active' | 'inactive'

export function CommitteeMembersPage() {
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
        <CommitteeMembersLive />
      )}
    </CaretakerLayout>
  )
}

function CommitteeMembersLive() {
  const { user } = useAuth()
  const { showError, showSuccess } = useToast()
  const centerId = user?.centerId?.trim() ?? ''
  const canMutate = canDirectorMutate(user)

  const [tab, setTab] = useState<StatusTab>('active')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<CommitteeMemberViewModel | null>(null)
  const [viewing, setViewing] = useState<CommitteeMemberViewModel | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<CommitteeMemberViewModel | null>(
    null,
  )

  const listFilters = useMemo(
    () => ({
      centerId,
      isActive: tab === 'active',
      page,
      pageSize,
    }),
    [centerId, tab, page, pageSize],
  )

  const list = useCommitteeMembersList(listFilters, Boolean(centerId))
  const createMutation = useCreateCommitteeMember()
  const updateMutation = useUpdateCommitteeMember(editing?.id ?? '')
  const deactivateMutation = useDeactivateCommitteeMember()

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

  function openEdit(record: CommitteeMemberViewModel) {
    setViewing(null)
    setFormMode('edit')
    setEditing(record)
    setFormOpen(true)
  }

  async function handleCreate(input: CreateCommitteeMemberInput) {
    try {
      await createMutation.mutateAsync(input)
      setFormOpen(false)
      setTab('active')
      setPage(1)
      showSuccess(copy.createSuccess)
    } catch (err) {
      showError(normalizeApiError(err).message || copy.saveError)
    }
  }

  async function handleUpdate(input: UpdateCommitteeMemberInput) {
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

  async function handleDeactivate() {
    if (!deactivateTarget) return
    try {
      await deactivateMutation.mutateAsync({
        id: deactivateTarget.id,
        input: {
          version: deactivateTarget.version,
          endDate: new Date().toISOString().slice(0, 10),
        },
      })
      setDeactivateTarget(null)
      setViewing(null)
      showSuccess(copy.deactivateSuccess)
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

        <SegmentedTabs
          aria-label={copy.statusFilter}
          value={tab}
          onChange={(value) => {
            setTab(value as StatusTab)
            setPage(1)
          }}
          columns={2}
          options={[
            { id: 'active', label: copy.tabActive },
            { id: 'inactive', label: copy.tabInactive },
          ]}
        />

        <RegisterListPanel
          variant="cards"
          isLoading={list.isLoading}
          isError={list.isError}
          isEmpty={items.length === 0}
          emptyTitle={tab === 'active' ? copy.emptyActive : copy.emptyInactive}
          emptyDescription={tab === 'active' ? copy.emptyActiveDesc : undefined}
          emptyAction={
            canMutate && tab === 'active' ? (
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
              {items.map((member) => (
                <RegisterRecordCard
                  key={member.id}
                  actions={
                    <RegisterViewEditActions
                      viewLabel={copy.view}
                      onView={() => setViewing(member)}
                      canMutate={canMutate && member.isActive}
                      onEdit={() => openEdit(member)}
                      extra={
                        canMutate && member.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<UserMinus size={16} />}
                            onClick={() => setDeactivateTarget(member)}
                            aria-label={copy.deactivate}
                          >
                            {copy.deactivate}
                          </Button>
                        ) : undefined
                      }
                    />
                  }
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-subheading text-text">{member.fullName}</h4>
                    <Badge variant={member.isActive ? 'success' : 'neutral'}>
                      {formatCommitteeStatus(member.isActive)}
                    </Badge>
                  </div>
                  <p className="text-body text-text-secondary flex items-center gap-1.5">
                    <Briefcase size={14} aria-hidden="true" />
                    {member.position}
                  </p>
                  <p className="text-caption text-text-muted flex items-center gap-1.5">
                    <Phone size={14} aria-hidden="true" />
                    {formatCommitteePhone(member.phone)}
                  </p>
                  <p className="text-caption text-text-muted">
                    {formatMembershipSpan(member)}
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

      <CommitteeMemberFormDialog
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

      <CommitteeMemberViewSheet
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
        onDeactivate={
          viewing
            ? () => {
                setDeactivateTarget(viewing)
              }
            : undefined
        }
      />

      <ConfirmModal
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          void handleDeactivate()
        }}
        title={copy.deactivate}
        message={copy.deactivateConfirm}
        confirmLabel={copy.deactivate}
      />
    </PageContainer>
  )
}
