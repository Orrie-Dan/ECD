import { useState, useMemo, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import {
  SchoolsSummaryCards,
  SchoolsTable,
  SchoolsFilterBar,
  SchoolQuickPreview,
  type SchoolsFilters,
} from '@/components/district/schools'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import {
  DISTRICT_NAME,
  getSchoolsTableData,
  getUniqueSectors,
  type SchoolTableData,
} from '@/lib/mock-data'
import { env } from '@/config/env'
import { useAuth } from '@/contexts/AppContext'
import { useCentersDirectory } from '@/features/centers'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'

const DEFAULT_FILTERS: SchoolsFilters = {
  period: 'month',
  month: '',
  sector: '',
  monitoringStatus: 'all',
}

function monitoringStatusFromAttention(attentionStatus: 'none' | 'low' | 'medium' | 'high') {
  if (attentionStatus === 'high') return 'critical' as const
  if (attentionStatus === 'medium' || attentionStatus === 'low') return 'followup' as const
  return 'good' as const
}

function getPeriodCutoff(period: SchoolsFilters['period']) {
  const now = new Date()
  const cutoff = new Date(now)
  if (period === 'today') cutoff.setDate(now.getDate())
  else if (period === 'week') cutoff.setDate(now.getDate() - 7)
  else if (period === 'month') cutoff.setDate(now.getDate() - 30)
  else cutoff.setDate(now.getDate() - 365)
  cutoff.setHours(0, 0, 0, 0)
  return cutoff
}

export function CentersPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<SchoolsFilters>(DEFAULT_FILTERS)
  const [previewCenterId, setPreviewCenterId] = useState<string | null>(null)

  const liveCenters = useCentersDirectory(
    { page: 1, pageSize: 100, districtId: user?.districtId },
    env.isLive,
  )

  const liveDistrictLabel =
    user?.districtName?.trim() ||
    liveCenters.data?.items.find((c) => c.districtName)?.districtName ||
    undefined

  const sectors = useMemo(() => {
    if (env.isLive) return [] as string[]
    return getUniqueSectors()
  }, [])

  const allSchoolsData = useMemo((): SchoolTableData[] => {
    if (env.isLive) {
      return (liveCenters.data?.items ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        sector: c.villageName ?? '—',
        cell: c.code || '—',
        children: c.activeChildrenCount,
        caretakers: 0,
        isActive: c.status === 'active',
        enrollmentTrend: 'stable' as const,
        enrollmentChange: 0,
        lastActivity: '',
        attentionStatus: 'none' as const,
        attendance: 0,
      }))
    }
    return getSchoolsTableData()
  }, [liveCenters.data?.items])

  const filteredSchoolsData = useMemo(() => {
    let data = allSchoolsData

    if (env.isMock && filters.sector) {
      data = data.filter((s) => s.sector === filters.sector)
    }

    if (env.isMock) {
      const cutoff = getPeriodCutoff(filters.period)
      data = data.filter((s) => new Date(s.lastActivity).getTime() >= cutoff.getTime())

      if (filters.month) {
        data = data.filter((s) => {
          const month = String(new Date(s.lastActivity).getMonth() + 1).padStart(2, '0')
          return month === filters.month
        })
      }

      if (filters.monitoringStatus !== 'all') {
        data = data.filter(
          (s) => monitoringStatusFromAttention(s.attentionStatus) === filters.monitoringStatus,
        )
      }
    }

    return data
  }, [allSchoolsData, filters.sector, filters.period, filters.month, filters.monitoringStatus])

  const hasActiveFilters =
    filters.period !== 'month' ||
    filters.month !== '' ||
    filters.sector !== '' ||
    filters.monitoringStatus !== 'all'

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const handleViewSchool = useCallback((centerId: string) => {
    setPreviewCenterId(centerId)
  }, [])

  const handleClosePreview = useCallback(() => {
    setPreviewCenterId(null)
  }, [])

  const summary = useMemo(() => {
    const totalSchools = filteredSchoolsData.length
    const goodSchools = filteredSchoolsData.filter(
      (s) => monitoringStatusFromAttention(s.attentionStatus) === 'good',
    ).length
    const schoolsToFollowup = filteredSchoolsData.filter(
      (s) => monitoringStatusFromAttention(s.attentionStatus) !== 'good',
    ).length
    const totalChildren = filteredSchoolsData.reduce((sum, s) => sum + s.children, 0)
    const totalCaretakers = filteredSchoolsData.reduce((sum, s) => sum + s.caretakers, 0)
    return { totalSchools, goodSchools, schoolsToFollowup, totalChildren, totalCaretakers }
  }, [filteredSchoolsData])

  return (
    <>
      <PageContainer>
        <PageHeader title={district.schools.title} subtitle={district.schools.subtitle} />
        <PageContent>
          {env.isLive && liveCenters.isLoading ? (
            <SkeletonPage label={district.schools.title} stats={4} />
          ) : null}

          {env.isLive && liveCenters.isError ? (
            <LiveUnavailableState
              title={district.schools.title}
              description={common.live.unavailableDesc}
              className="mb-4"
              action={
                <Button type="button" variant="primary" onClick={() => void liveCenters.refetch()}>
                  {common.reset}
                </Button>
              }
            />
          ) : null}

          {env.isLive ? (
            <p className="text-caption text-text-muted mb-4">
              {common.live.sectorFilterUnavailable} · {common.live.unavailableDesc}
            </p>
          ) : null}

          {env.isLive &&
          liveCenters.data &&
          liveCenters.data.total > liveCenters.data.items.length ? (
            <p className="text-caption text-warning mb-4" role="status">
              {liveCenters.data.items.length} / {liveCenters.data.total} {district.nav.centers}
            </p>
          ) : null}

          {!(env.isLive && liveCenters.isLoading) ? (
            <>
              <SchoolsFilterBar
                filters={filters}
                onFiltersChange={setFilters}
                sectors={sectors}
                resultCount={filteredSchoolsData.length}
                onClearFilters={handleClearFilters}
                hasActiveFilters={hasActiveFilters && env.isMock}
              />

              <SchoolsSummaryCards summary={summary} />

              <div className="mb-4">
                <h3 className="text-subheading text-text mb-3">{district.schools.tableTitle}</h3>
                <SchoolsTable
                  data={filteredSchoolsData}
                  searchQuery={`${filters.period}-${filters.month}-${filters.sector}-${filters.monitoringStatus}`}
                  onViewSchool={handleViewSchool}
                  districtLabel={env.isLive ? liveDistrictLabel || '—' : DISTRICT_NAME}
                />
              </div>

              {previewCenterId && env.isMock ? (
                <>
                  <div
                    className="fixed inset-0 bg-black/30 z-40"
                    onClick={handleClosePreview}
                    aria-hidden
                  />
                  <SchoolQuickPreview centerId={previewCenterId} onClose={handleClosePreview} />
                </>
              ) : null}

              {previewCenterId && env.isLive ? (
                <LiveUnavailableState
                  compact
                  title={district.schools.title}
                  description={common.live.unavailableDesc}
                  className="mb-4"
                  action={
                    <button
                      type="button"
                      className="text-caption font-semibold text-primary"
                      onClick={handleClosePreview}
                    >
                      {common.close}
                    </button>
                  }
                />
              ) : null}
            </>
          ) : null}
        </PageContent>
      </PageContainer>
    </>
  )
}
