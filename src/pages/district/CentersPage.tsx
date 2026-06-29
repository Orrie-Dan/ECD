import { useState, useMemo, useCallback } from 'react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  SchoolsSummaryCards,
  SchoolsTable,
  SchoolsFilterBar,
  SchoolQuickPreview,
  type SchoolsFilters,
} from '@/components/district/schools'
import {
  getSchoolsTableData,
  getUniqueSectors,
} from '@/lib/mock-data'
import { district } from '@/locales/rw/district'

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
  const [filters, setFilters] = useState<SchoolsFilters>(DEFAULT_FILTERS)
  const [previewCenterId, setPreviewCenterId] = useState<string | null>(null)

  const sectors = useMemo(() => getUniqueSectors(), [])

  const allSchoolsData = useMemo(() => getSchoolsTableData(), [])

  const filteredSchoolsData = useMemo(() => {
    let data = allSchoolsData

    if (filters.sector) {
      data = data.filter((s) => s.sector === filters.sector)
    }

    const cutoff = getPeriodCutoff(filters.period)
    data = data.filter((s) => new Date(s.lastActivity).getTime() >= cutoff.getTime())

    if (filters.month) {
      data = data.filter((s) => {
        const month = String(new Date(s.lastActivity).getMonth() + 1).padStart(2, '0')
        return month === filters.month
      })
    }

    if (filters.monitoringStatus !== 'all') {
      data = data.filter((s) => monitoringStatusFromAttention(s.attentionStatus) === filters.monitoringStatus)
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
    const goodSchools = filteredSchoolsData.filter((s) => monitoringStatusFromAttention(s.attentionStatus) === 'good').length
    const schoolsToFollowup = filteredSchoolsData.filter((s) => monitoringStatusFromAttention(s.attentionStatus) !== 'good').length
    const totalChildren = filteredSchoolsData.reduce((sum, s) => sum + s.children, 0)
    const totalCaretakers = filteredSchoolsData.reduce((sum, s) => sum + s.caretakers, 0)
    return { totalSchools, goodSchools, schoolsToFollowup, totalChildren, totalCaretakers }
  }, [filteredSchoolsData])

  return (
    <DistrictLayout>
      <PageHeader title={district.schools.title} subtitle={district.schools.subtitle} />

      <SchoolsFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        sectors={sectors}
        resultCount={filteredSchoolsData.length}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <SchoolsSummaryCards summary={summary} />

      <div className="mb-4">
        <h3 className="text-subheading text-text mb-3">{district.schools.tableTitle}</h3>
        <SchoolsTable
          data={filteredSchoolsData}
          searchQuery={`${filters.period}-${filters.month}-${filters.sector}-${filters.monitoringStatus}`}
          onViewSchool={handleViewSchool}
        />
      </div>

      {previewCenterId && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={handleClosePreview}
            aria-hidden="true"
          />
          <SchoolQuickPreview centerId={previewCenterId} onClose={handleClosePreview} />
        </>
      )}
    </DistrictLayout>
  )
}
