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
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
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
  const provinceId = params.get('province')
  const provinceName = params.get('provinceName')
  const districtId = params.get('district')
  const districtName = params.get('districtName')
  const sectorId = params.get('sector')
  const sectorName = params.get('sectorName')
  const centerId = params.get('centre') ?? params.get('center')
  const centerName = params.get('centreName') ?? params.get('centerName')

  if (provinceId) {
    crumbs.push({
      level: 'province',
      id: provinceId,
      name: displayEntityLabel(provinceName, common.loading),
    })
  }
  if (districtId) {
    crumbs.push({
      level: 'district',
      id: districtId,
      name: displayEntityLabel(districtName, common.loading),
    })
  }
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
  for (const key of [
    'province',
    'provinceName',
    'district',
    'districtName',
    'sector',
    'sectorName',
    'centre',
    'center',
    'centreName',
    'centerName',
  ]) {
    params.delete(key)
  }
  for (const crumb of crumbs) {
    if (crumb.level === 'province') {
      params.set('province', crumb.id)
      params.set('provinceName', crumb.name)
    }
    if (crumb.level === 'district') {
      params.set('district', crumb.id)
      params.set('districtName', crumb.name)
    }
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

/**
 * NCDA Impugukirwa — hierarchical drill-down from province → district → sector → center → children.
 */
export function NcdaFollowUpPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader title={ncda.followup.title} subtitle={ncda.followup.subtitle} />
        <PageContent>
          <LiveUnavailableState
            title={ncda.monitoring.mockOnlyTitle}
            description={ncda.monitoring.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaFollowUpLive />
}

function NcdaFollowUpLive() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const crumbs = useMemo(() => parseCrumbs(searchParams), [searchParams])

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

  return (
    <PageContainer>
      <PageHeader
        title={ncda.followup.title}
        subtitle={ncda.followup.hierarchySubtitle}
      />
      <PageContent>
        <AlertHierarchyDrilldown
          rootLevel="province"
          crumbs={crumbs}
          onNavigate={onNavigate}
          filters={filters}
          onFiltersChange={onFiltersChange}
          copy={ncda.followup}
          childrenBasePath={NCDA_PATHS.children}
          centersBasePath={NCDA_PATHS.centers}
        />
      </PageContent>
    </PageContainer>
  )
}
