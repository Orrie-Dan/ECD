import { useMemo, useState } from 'react'
import { Briefcase, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import {
  RegisterListPanel,
  RegisterRecordCard,
  RegisterViewEditActions,
} from '@/components/caretaker/register'
import { CommitteeMemberViewSheet } from '@/components/committee/CommitteeMemberViewSheet'
import { useCommitteeMembersList } from '@/features/committee-members'
import { caretaker } from '@/locales/rw/caretaker'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type { CommitteeMemberViewModel } from '@/models/committee-members'
import {
  formatCommitteePhone,
  formatCommitteeStatus,
  formatMembershipSpan,
} from '@/lib/committee-educator-format'
import { hasRegisterListScope } from '@/lib/register-scope'
import type { RegisterListScope } from './types'

const copy = caretaker.director.committee
type StatusTab = 'active' | 'inactive'

export function CommitteeMemberList({ scope }: { scope: RegisterListScope }) {
  const centerId = scope.centerId?.trim() ?? ''
  const districtId = scope.districtId?.trim() ?? ''
  const [tab, setTab] = useState<StatusTab>('active')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [viewing, setViewing] = useState<CommitteeMemberViewModel | null>(null)

  const listFilters = useMemo(
    () => ({
      centerId: centerId || undefined,
      districtId: districtId || undefined,
      isActive: tab === 'active',
      page,
      pageSize,
    }),
    [centerId, districtId, tab, page, pageSize],
  )

  const scopeReady = hasRegisterListScope(listFilters)
  const list = useCommitteeMembersList(listFilters, scopeReady)
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
        errorTitle={copy.listError}
        onRetry={() => void list.refetch()}
      >
        <>
          <div className="space-y-3">
            {items.map((member) => (
              <RegisterRecordCard
                key={member.id}
                actions={
                  <RegisterViewEditActions viewLabel={copy.view} onView={() => setViewing(member)} />
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
                <p className="text-caption text-text-muted">{formatMembershipSpan(member)}</p>
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

      <CommitteeMemberViewSheet
        open={Boolean(viewing)}
        record={viewing}
        canMutate={false}
        onClose={() => setViewing(null)}
      />
    </>
  )
}
