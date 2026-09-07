import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { SelectInput } from '@/components/ui/FormField'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { ChildrenDemographicsDashboard } from '@/components/demographics/ChildrenDemographicsDashboard'
import { env } from '@/config/env'
import { useChildrenDemographics } from '@/features/demographics/queries'
import {
  useNcdaMonitoringCenterOptions,
  useNcdaMonitoringDistrictOptions,
} from '@/features/ncda/monitoring/queries'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncdaChildrenPath } from '@/lib/ncda-drill-down'
import { demographicsCopy } from '@/locales/rw/demographics'

export function NcdaChildrenDemographicsPage() {
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

  return <NcdaChildrenDemographicsLive />
}

function NcdaChildrenDemographicsLive() {
  const [params, setParams] = useSearchParams()
  const [districtId, setDistrictId] = useState(() => params.get('district')?.trim() || 'all')
  const [centerId, setCenterId] = useState(() => params.get('centre')?.trim() || 'all')

  const filters = useMemo(
    () => ({
      districtId: districtId === 'all' ? undefined : districtId,
      centerId: centerId === 'all' ? undefined : centerId,
    }),
    [districtId, centerId],
  )

  const districts = useNcdaMonitoringDistrictOptions()
  const centers = useNcdaMonitoringCenterOptions(districtId)
  const query = useChildrenDemographics(filters)

  const patchScope = (next: { district?: string; centre?: string }) => {
    const nextParams = new URLSearchParams(params)
    if (next.district !== undefined) {
      if (!next.district || next.district === 'all') nextParams.delete('district')
      else nextParams.set('district', next.district)
      nextParams.delete('centre')
    }
    if (next.centre !== undefined) {
      if (!next.centre || next.centre === 'all') nextParams.delete('centre')
      else nextParams.set('centre', next.centre)
    }
    setParams(nextParams, { replace: true })
  }

  return (
    <PageContainer>
      <PageHeader
        title={demographicsCopy.title}
        subtitle={demographicsCopy.subtitle}
        size="compact"
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              to={NCDA_PATHS.dashboard}
              className="text-caption font-semibold text-primary hover:underline"
            >
              {demographicsCopy.backToDashboard}
            </Link>
            <Link
              to={ncdaChildrenPath({
                status: 'active',
                districtId: filters.districtId,
                centerId: filters.centerId,
              })}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-3xl">
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-text-secondary">
                  {demographicsCopy.filtersDistrict}
                </label>
                <SelectInput
                  value={districtId}
                  onChange={(e) => {
                    const value = e.target.value
                    setDistrictId(value)
                    setCenterId('all')
                    patchScope({ district: value, centre: 'all' })
                  }}
                >
                  <option value="all">{demographicsCopy.filtersDistrictAll}</option>
                  {(districts.data?.items ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-text-secondary">
                  {demographicsCopy.filtersCenter}
                </label>
                <SelectInput
                  value={centerId}
                  onChange={(e) => {
                    const value = e.target.value
                    setCenterId(value)
                    patchScope({ centre: value })
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
