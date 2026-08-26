import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, GraduationCap, Phone, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { FormField, SelectInput, TextInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import {
  RegisterFiltersCard,
  RegisterListPanel,
  RegisterRecordCard,
} from '@/components/caretaker/register'
import { useDebounce } from '@/hooks/useDebounce'
import { useDistrictCaregiversList } from '@/features/district/users/queries'
import { useNcdaUsersList } from '@/features/ncda/users/queries'
import { caretaker } from '@/locales/rw/caretaker'
import { DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/types'
import type { CenterUserResponse } from '@/api/resources/users'
import {
  formatEducationLevel,
  formatPersonSex,
} from '@/lib/committee-educator-format'
import { hasRegisterListScope } from '@/lib/register-scope'
import type { RegisterListScope } from './types'

const copy = caretaker.director.educators
type StatusFilter = 'all' | 'ACTIVE' | 'SUSPENDED'

interface EducatorsRegisterListProps {
  scope: RegisterListScope
  variant: 'district' | 'ncda'
  detailPath: (userId: string) => string
}

export function EducatorsRegisterList({
  scope,
  variant,
  detailPath,
}: EducatorsRegisterListProps) {
  const centerId = scope.centerId?.trim() ?? ''
  const districtId = scope.districtId?.trim() ?? ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const debouncedSearch = useDebounce(search, 300)

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      status: status === 'all' ? undefined : status,
      centerId: centerId || undefined,
      districtId: variant === 'ncda' ? districtId || undefined : undefined,
      page,
      pageSize,
    }),
    [debouncedSearch, status, centerId, districtId, variant, page, pageSize],
  )

  const scopeReady = variant === 'district' ? Boolean(districtId) : hasRegisterListScope(scope)
  const districtList = useDistrictCaregiversList(listFilters, variant === 'district' && scopeReady)
  const ncdaList = useNcdaUsersList(
    { ...listFilters, role: 'caregiver' },
    variant === 'ncda' && scopeReady,
  )
  const list = variant === 'district' ? districtList : ncdaList

  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const items = (list.data?.items ?? list.data?.data ?? []) as CenterUserResponse[]
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
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <FormField label={copy.searchPlaceholder}>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                aria-hidden
              />
              <TextInput
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="!pl-9"
                placeholder={copy.searchPlaceholder}
              />
            </div>
          </FormField>
          <FormField label={copy.statusFilter}>
            <SelectInput
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StatusFilter)
                setPage(1)
              }}
            >
              <option value="all">{copy.statusAll}</option>
              <option value="ACTIVE">{copy.statusActive}</option>
              <option value="SUSPENDED">{copy.statusSuspended}</option>
            </SelectInput>
          </FormField>
        </div>
      </RegisterFiltersCard>

      <RegisterListPanel
        variant="cards"
        isLoading={list.isLoading && !list.data}
        isError={list.isError && !list.data}
        isEmpty={items.length === 0}
        emptyTitle={debouncedSearch || status !== 'all' ? copy.emptyFiltered : copy.empty}
        emptyDescription={
          debouncedSearch || status !== 'all' ? undefined : copy.emptyDesc
        }
        errorTitle={copy.listError}
        onRetry={() => void list.refetch()}
      >
        <>
          <div className="space-y-3">
            {items.map((row) => (
              <RegisterRecordCard
                key={row.id}
                actions={
                  <Link
                    to={detailPath(row.id)}
                    className="text-primary font-semibold text-caption hover:underline shrink-0"
                  >
                    {copy.manageAccount}
                  </Link>
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-subheading text-text">{row.fullName}</h4>
                  <Badge variant={row.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {row.status === 'ACTIVE' ? copy.statusActive : copy.statusSuspended}
                  </Badge>
                </div>
                <p className="text-caption text-text-muted">@{row.username}</p>
                <p className="text-body text-text-secondary flex items-center gap-1.5">
                  <Phone size={14} aria-hidden="true" />
                  {row.phone?.trim() || '—'}
                </p>
                <p className="text-caption text-text-muted flex items-center gap-1.5">
                  <UserRound size={14} aria-hidden="true" />
                  {formatPersonSex(row.gender)}
                </p>
                <p className="text-caption text-text-muted flex items-center gap-1.5">
                  <GraduationCap size={14} aria-hidden="true" />
                  {formatEducationLevel(row.educationLevel)}
                </p>
              </RegisterRecordCard>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            hasPrevious={page > 1}
            hasNext={page < totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size as PageSizeOption)
              setPage(1)
            }}
          />
        </>
      </RegisterListPanel>
    </>
  )
}
