import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import {
  AlertHierarchyDrilldown,
  type AlertHierarchyCrumb,
  type AlertHierarchyFilters,
} from '@/components/follow-up/AlertHierarchyDrilldown'
import { env } from '@/config/env'
import { useAuth } from '@/contexts/AppContext'
import { useDistrictIdentity } from '@/features/district/overview/queries'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { displayEntityLabel } from '@/lib/entity-routes'

function parseFilters(params: URLSearchParams): AlertHierarchyFilters {
  const categoryRaw = params.get('category')
  const priorityRaw = params.get('priority')
  const category =
    categoryRaw === 'attendance' ||
    categoryRaw === 'nutrition' ||
    categoryRaw === 'data_quality' ||
    categoryRaw === 'referral'
      ? categoryRaw
      : 'all'
  const priority =
    priorityRaw === 'high' || priorityRaw === 'medium' || priorityRaw === 'low'
      ? priorityRaw
      : 'all'
  return { category, priority }
}

function parseCrumbs(params: URLSearchParams): AlertHierarchyCrumb[] {
  const crumbs: AlertHierarchyCrumb[] = []
  const sectorId = params.get('sector')
  const sectorName = params.get('sectorName')
  const centerId = params.get('centre') ?? params.get('center')
  const centerName = params.get('centreName') ?? params.get('centerName')
  if (sectorId) {
    crumbs.push({
      level: 'sector',
      id: sectorId,
      name: displayEntityLabel(sectorName, common.loading),
    })
  }
  if (centerId) {
    crumbs.push({
      level: 'center',
      id: centerId,
      name: displayEntityLabel(centerName, common.loading),
    })
  }
  return crumbs
}

function writeCrumbs(params: URLSearchParams, crumbs: AlertHierarchyCrumb[]) {
  for (const key of ['sector', 'sectorName', 'centre', 'center', 'centreName', 'centerName']) {
    params.delete(key)
  }
  for (const crumb of crumbs) {
    if (crumb.level === 'sector') {
      params.set('sector', crumb.id)
      params.set('sectorName', crumb.name)
    }
    if (crumb.level === 'center') {
      params.set('centre', crumb.id)
      params.set('centreName', crumb.name)
    }
  }
}

/** District Impugukirwa — hierarchical actionable alerts (NCDA vocabulary baseline). */
export function ImpugukirwaPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader title={district.followup.title} subtitle={district.followup.subtitle} />
        <PageContent>
          <LiveUnavailableState
            title={district.monitoringHub.mockOnlyTitle}
            description={district.monitoringHub.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <ImpugukirwaPageLive />
}

function ImpugukirwaPageLive() {
  const { user } = useAuth()
  const identity = useDistrictIdentity(user?.districtId)
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const crumbs = useMemo(() => parseCrumbs(searchParams), [searchParams])

  const districtId = user?.districtId
  const districtName = identity.data?.name ?? district.followup.title

  const onNavigate = useCallback(
    (next: AlertHierarchyCrumb[]) => {
      const params = new URLSearchParams(searchParams)
      writeCrumbs(params, next)
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const onFiltersChange = useCallback(
    (next: AlertHierarchyFilters) => {
      const params = new URLSearchParams(searchParams)
      if (next.category === 'all') params.delete('category')
      else params.set('category', next.category)
      if (next.priority === 'all') params.delete('priority')
      else params.set('priority', next.priority)
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  if (!districtId) {
    return (
      <PageContainer>
        <PageHeader title={district.followup.title} subtitle={district.followup.subtitle} />
        <PageContent>
          <LiveUnavailableState
            title={common.error}
            description={district.followup.loadError}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={`${district.followup.title} — ${districtName}`}
        subtitle={district.followup.hierarchySubtitle}
      />
      <PageContent>
        <AlertHierarchyDrilldown
          rootLevel="sector"
          lockedDistrictId={districtId}
          lockedDistrictName={districtName}
          crumbs={crumbs}
          onNavigate={onNavigate}
          filters={filters}
          onFiltersChange={onFiltersChange}
          copy={district.followup}
          childrenBasePath={DISTRICT_PATHS.children}
          centersBasePath={DISTRICT_PATHS.centers}
        />
      </PageContent>
    </PageContainer>
  )
}
