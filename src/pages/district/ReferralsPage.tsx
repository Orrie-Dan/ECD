import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormField, SelectInput, TextInput } from '@/components/ui/FormField'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { Pagination } from '@/components/ui/Pagination'
import { useAuth, useData } from '@/contexts/AppContext'
import { env } from '@/config/env'
import { useDistrictReferralList } from '@/features/district'
import { useExcelExport } from '@/features/reporting'
import { buildDistrictReferralsWorkbook } from '@/features/reporting/exporters'
import {
  districtReferralsExportAvailable,
  districtReferralsFilenamePrefix,
  districtReferralsTitle,
  mapMockReferralsToExportRows,
  mapReferralsToExportRows,
  referralSourceExportLabel,
  referralStatusExportLabel,
} from '@/features/reporting/export-datasets'
import { fetchAllReferrals } from '@/api/resources/referrals'
import { fetchChildrenList } from '@/api/resources/children'
import { listCentersPage } from '@/api/resources/centers'
import { buildExcelFilename } from '@/lib/export'
import { getTodayDate } from '@/lib/attendance-utils'
import { ECD_CENTERS } from '@/lib/mock-data'
import { usePagination } from '@/hooks/usePagination'
import { DEFAULT_PAGE_SIZE } from '@/types'
import type { ReferralListFilters, ReferralViewModel } from '@/models/referral'
import type { Referral, ReferralSourceType, ReferralStatus } from '@/types'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'

function toViewModel(referral: Referral, centerId: string): ReferralViewModel {
  return {
    ...referral,
    centerId,
    version: 1,
  }
}

export function DistrictReferralsPage() {
  if (env.isLive) {
    return <DistrictReferralsPageLive />
  }
  return <DistrictReferralsPageMock />
}

function DistrictReferralsPageMock() {
  const { children, referrals } = useData()
  return <DistrictReferralsPageShared children={children} referrals={referrals} />
}

function DistrictReferralsPageLive() {
  return <DistrictReferralsPageShared children={[]} referrals={[]} />
}

function DistrictReferralsPageShared({
  children,
  referrals: mockReferrals,
}: {
  children: import('@/types').Child[]
  referrals: Referral[]
}) {
  const { user } = useAuth()
  const { exporting, exportWorkbook } = useExcelExport()
  const today = getTodayDate()

  const [status, setStatus] = useState<ReferralStatus | 'all'>('all')
  const [sourceType, setSourceType] = useState<ReferralSourceType | 'all'>('all')
  const [centerId, setCenterId] = useState('all')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(today)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const apiFilters = useMemo(
    (): ReferralListFilters => ({
      page,
      pageSize,
      status: status === 'all' ? undefined : status,
      sourceType: sourceType === 'all' ? undefined : sourceType,
      centerId: centerId === 'all' ? undefined : centerId,
      from: dateFrom,
      to: dateTo,
    }),
    [centerId, dateFrom, dateTo, page, pageSize, sourceType, status],
  )

  const liveQuery = useDistrictReferralList(apiFilters, env.isLive)

  const mockItems = useMemo(() => {
    return mockReferrals
      .map((referral) => {
        const child = children.find((c) => c.id === referral.childId)
        return toViewModel(referral, child?.centerId ?? '')
      })
      .filter((item) => {
        if (status !== 'all' && item.status !== status) return false
        if (sourceType !== 'all' && item.sourceType !== sourceType) return false
        if (centerId !== 'all' && item.centerId !== centerId) return false
        if (item.date < dateFrom || item.date > dateTo) return false
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.childId.localeCompare(b.childId))
  }, [centerId, children, dateFrom, dateTo, mockReferrals, sourceType, status])

  const listItems = env.isLive ? (liveQuery.data?.items ?? []) : mockItems
  const isLoading = env.isLive && liveQuery.isLoading
  const isError = env.isLive && liveQuery.isError

  const pagination = usePagination(listItems, {
    resetDeps: [status, sourceType, centerId, dateFrom, dateTo],
  })

  const displayItems = env.isLive ? listItems : pagination.items
  const centerOptions = env.isLive
    ? Array.from(new Map(listItems.map((item) => [item.centerId, item.centerId])).entries()).map(
        ([id]) => ({ id, name: id }),
      )
    : ECD_CENTERS.map((c) => ({ id: c.id, name: c.name }))

  const exportFilters = useMemo(
    () => [
      {
        label: district.referrals.filterStatus,
        value: status === 'all' ? district.referrals.allStatuses : referralStatusExportLabel(status),
      },
      {
        label: district.referrals.filterSource,
        value:
          sourceType === 'all' ? district.referrals.allSources : referralSourceExportLabel(sourceType),
      },
      {
        label: district.growth.center,
        value:
          centerId === 'all'
            ? district.growth.centerAll
            : (centerOptions.find((c) => c.id === centerId)?.name ?? centerId),
      },
    ],
    [centerId, centerOptions, sourceType, status],
  )

  const excelReady = env.isLive
    ? !liveQuery.isLoading && !liveQuery.isError && (liveQuery.data?.total ?? 0) > 0
    : mockItems.length > 0

  const handleExportExcel = () => {
    if (!excelReady || exporting) return

    const run = async () => {
      let exportRows
      if (env.isLive) {
        const items = await fetchAllReferrals({
          status: status === 'all' ? undefined : status,
          sourceType: sourceType === 'all' ? undefined : sourceType,
          centerId: centerId === 'all' ? undefined : centerId,
          from: dateFrom,
          to: dateTo,
        })
        const centers = await listCentersPage({ page: 1, pageSize: 200 })
        const centerMap = new Map(centers.items.map((c) => [c.id, c.name]))
        const childMap = new Map<string, string>()
        let childPage = 1
        for (;;) {
          const batch = await fetchChildrenList({
            centerId: centerId === 'all' ? undefined : centerId,
            status: 'active',
            page: childPage,
            pageSize: 100,
          })
          for (const child of batch.items) {
            childMap.set(child.id, child.fullName)
          }
          if (childPage >= batch.totalPages) break
          childPage += 1
        }
        exportRows = mapReferralsToExportRows(items, {
          childName: (id) => childMap.get(id),
          centerName: (id) => centerMap.get(id),
        })
      } else {
        exportRows = mapMockReferralsToExportRows(mockItems, children, (id) =>
          ECD_CENTERS.find((c) => c.id === id)?.name,
        )
      }

      if (!districtReferralsExportAvailable(exportRows)) return

      const spec = buildDistrictReferralsWorkbook({
        input: {
          title: districtReferralsTitle(),
          districtName: user?.districtName,
          dateFrom,
          dateTo,
          isMock: !env.isLive,
          filters: exportFilters,
        },
        rows: exportRows,
      })
      await exportWorkbook(
        spec,
        buildExcelFilename([districtReferralsFilenamePrefix(), 'akarere', dateFrom, dateTo]),
      )
    }

    void run()
  }

  return (
    <PageContainer>
      <PageHeader
        title={district.referrals.title}
        subtitle={district.referrals.subtitle}
        action={
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Download size={18} />}
            onClick={handleExportExcel}
            loading={exporting}
            disabled={!excelReady}
            title={!excelReady ? district.referrals.excelNeedData : undefined}
            fullWidth
            className="sm:w-auto"
          >
            {common.reportPreview.exportExcel}
          </Button>
        }
      />
      <PageContent>
        <Card padding="lg" className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label={district.referrals.filterStatus}>
              <SelectInput
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as ReferralStatus | 'all')
                  setPage(1)
                }}
              >
                <option value="all">{district.referrals.allStatuses}</option>
                <option value="pending">{district.referrals.pending}</option>
                <option value="completed">{district.referrals.completed}</option>
                <option value="cancelled">{district.referrals.cancelled}</option>
              </SelectInput>
            </FormField>
            <FormField label={district.referrals.filterSource}>
              <SelectInput
                value={sourceType}
                onChange={(e) => {
                  setSourceType(e.target.value as ReferralSourceType | 'all')
                  setPage(1)
                }}
              >
                <option value="all">{district.referrals.allSources}</option>
                <option value="nutrition">{district.referrals.sourceNutrition}</option>
                <option value="sted">{district.referrals.sourceSted}</option>
              </SelectInput>
            </FormField>
            <FormField label={district.growth.center}>
              <SelectInput
                value={centerId}
                onChange={(e) => {
                  setCenterId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">{district.growth.centerAll}</option>
                {centerOptions.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={district.reports.dateFrom}>
                <TextInput
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setPage(1)
                  }}
                />
              </FormField>
              <FormField label={district.reports.dateTo}>
                <TextInput
                  type="date"
                  value={dateTo}
                  max={today}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setPage(1)
                  }}
                />
              </FormField>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-1 border-t border-border">
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<Download size={18} />}
              onClick={handleExportExcel}
              loading={exporting}
              disabled={!excelReady}
              title={!excelReady ? district.referrals.excelNeedData : undefined}
            >
              {common.reportPreview.exportExcel}
            </Button>
            <p className="text-caption text-text-muted self-center">
              {env.isLive ? common.excelExport.clientSide : common.excelExport.mockDataNote}
            </p>
          </div>
        </Card>

        {isError ? (
          <LiveUnavailableState
            title={common.error}
            description={district.referrals.noData}
            action={
              <Button type="button" variant="primary" onClick={() => void liveQuery.refetch()}>
                {district.caregivers.retry}
              </Button>
            }
          />
        ) : isLoading ? (
          <SkeletonPage label={district.referrals.title} stats={3} />
        ) : displayItems.length === 0 ? (
          <LiveUnavailableState
            title={district.referrals.noData}
            description={district.referrals.subtitle}
          />
        ) : (
          <Card padding="lg">
            <h3 className="text-subheading text-text mb-4">{district.referrals.listTitle}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 text-left responsive-table-cards">
                <thead>
                  <tr className="border-b border-border text-caption text-text-muted">
                    <th className="pb-2 pr-3">{district.referrals.child}</th>
                    <th className="pb-2 pr-3">{district.growth.center}</th>
                    <th className="pb-2 pr-3">{district.referrals.date}</th>
                    <th className="pb-2 pr-3">{district.referrals.source}</th>
                    <th className="pb-2 pr-3">{district.referrals.reason}</th>
                    <th className="pb-2">{district.referrals.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item) => {
                    const childName =
                      children.find((c) => c.id === item.childId)?.fullName ??
                      item.childId.slice(0, 8)
                    const centerName =
                      ECD_CENTERS.find((c) => c.id === item.centerId)?.name ?? item.centerId
                    return (
                      <tr key={item.id} className="border-b border-border/70">
                        <td className="py-2.5 pr-3" data-label={district.referrals.child}>
                          {childName}
                        </td>
                        <td className="py-2.5 pr-3" data-label={district.growth.center}>
                          {centerName}
                        </td>
                        <td className="py-2.5 pr-3" data-label={district.referrals.date}>
                          {item.date}
                        </td>
                        <td className="py-2.5 pr-3" data-label={district.referrals.source}>
                          {referralSourceExportLabel(item.sourceType)}
                        </td>
                        <td className="py-2.5 pr-3" data-label={district.referrals.reason}>
                          {item.reason}
                        </td>
                        <td className="py-2.5" data-label={district.referrals.status}>
                          {referralStatusExportLabel(item.status)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {env.isLive ? (
              <Pagination
                page={liveQuery.data?.page ?? 1}
                pageSize={liveQuery.data?.pageSize ?? pageSize}
                total={liveQuery.data?.total ?? 0}
                totalPages={liveQuery.data?.totalPages ?? 1}
                startIndex={
                  (liveQuery.data?.total ?? 0) === 0
                    ? 0
                    : ((liveQuery.data?.page ?? 1) - 1) * (liveQuery.data?.pageSize ?? pageSize) +
                      1
                }
                endIndex={
                  (liveQuery.data?.total ?? 0) === 0
                    ? 0
                    : Math.min(
                        (liveQuery.data?.page ?? 1) * (liveQuery.data?.pageSize ?? pageSize),
                        liveQuery.data?.total ?? 0,
                      )
                }
                hasPrevious={(liveQuery.data?.page ?? 1) > 1}
                hasNext={(liveQuery.data?.page ?? 1) < (liveQuery.data?.totalPages ?? 1)}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size as number)
                  setPage(1)
                }}
                pageSizeSelectId="district-referrals-page-size"
              />
            ) : (
              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                hasPrevious={pagination.hasPrevious}
                hasNext={pagination.hasNext}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                pageSizeSelectId="district-referrals-mock-page-size"
              />
            )}
          </Card>
        )}
      </PageContent>
    </PageContainer>
  )
}
