import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { SelectInput } from '@/components/ui/FormField'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { ChildrenDemographicsDashboard } from '@/components/demographics/ChildrenDemographicsDashboard'
import { env } from '@/config/env'
import { useChildrenDemographics } from '@/features/demographics/queries'
import { useDistrictScope } from '@/features/district/overview/useDistrictScope'
import { useDistrictOverviewCenters } from '@/features/district/overview/queries'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'
import { demographicsCopy } from '@/locales/rw/demographics'

export function DistrictChildrenDemographicsPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={demographicsCopy.title}
          subtitle={demographicsCopy.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={demographicsCopy.mockOnlyTitle}
            description={demographicsCopy.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <DistrictChildrenDemographicsLive />
}

function DistrictChildrenDemographicsLive() {
  const scope = useDistrictScope()
  const [params, setParams] = useSearchParams()
  const [centerId, setCenterId] = useState(() => params.get('centre')?.trim() || 'all')

  const filters = useMemo(
    () => ({
      districtId: scope.districtId || undefined,
      centerId: centerId === 'all' ? undefined : centerId,
    }),
    [scope.districtId, centerId],
  )

  const centers = useDistrictOverviewCenters(
    { districtId: scope.districtId ?? undefined, page: 1, pageSize: 200 },
    Boolean(scope.districtId),
  )
  const query = useChildrenDemographics(filters, Boolean(scope.districtId))

  return (
    <PageContainer>
      <PageHeader
        title={demographicsCopy.title}
        subtitle={demographicsCopy.subtitle}
        size="compact"
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              to={DISTRICT_PATHS.dashboard}
              className="text-caption font-semibold text-primary hover:underline"
            >
              {demographicsCopy.backToDashboard}
            </Link>
            <Link
              to={DISTRICT_PATHS.children}
              className="text-caption font-semibold text-primary hover:underline"
            >
              {demographicsCopy.viewChildrenDirectory}
            </Link>
          </div>
        }
      />
      <PageContent>
        <ChildrenDemographicsDashboard
          data={query.data}
          isError={query.isError}
          onRetry={() => void query.refetch()}
          filtersSlot={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-md">
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-text-secondary">
                  {demographicsCopy.filtersCenter}
                </label>
                <SelectInput
                  value={centerId}
                  onChange={(e) => {
                    const value = e.target.value
                    setCenterId(value)
                    const next = new URLSearchParams(params)
                    if (!value || value === 'all') next.delete('centre')
                    else next.set('centre', value)
                    setParams(next, { replace: true })
                  }}
                >
                  <option value="all">{demographicsCopy.filtersCenterAll}</option>
                  {(centers.data?.items ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </SelectInput>
              </div>
            </div>
          }
        />
      </PageContent>
    </PageContainer>
  )
}
