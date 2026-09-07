import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/FormField'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NutritionAlertList } from '@/components/district/growth/NutritionAlertList'
import { env } from '@/config/env'
import { useNcdaNutritionAlerts } from '@/features/ncda/nutrition/queries'
import {
  useNcdaChildCenterOptions,
  useNcdaChildDistrictOptions,
} from '@/features/ncda/children/queries'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import type { NutritionAlertKindApi, NutritionAlertViewModel } from '@/models/nutrition'
import type { NutritionAlert, NutritionAlertKind } from '@/lib/nutrition-utils'

type StatusFilter = NutritionAlertKindApi | 'all'

function mapApiNutritionAlertToUi(alert: NutritionAlertViewModel): NutritionAlert {
  let kind: NutritionAlertKind = 'at_risk'
  if (alert.type === 'severe_nutrition') kind = 'severe'
  else if (alert.type === 'overdue_screening') kind = 'overdue'
  else if (alert.type === 'requires_referral') kind = 'at_risk'

  return {
    id: alert.id,
    childId: alert.childId,
    childName: alert.childFullName,
    centerId: alert.centerId,
    centerName: alert.centerName ?? '—',
    kind,
    nutritionStatus: alert.nutritionStatus,
    recommendationKey: kind,
    lastScreeningDate: alert.screeningDate,
    priority: kind === 'severe' || kind === 'overdue' ? 1 : 3,
  }
}

function parseStatusFilter(raw: string | null): StatusFilter {
  if (
    raw === 'severe_nutrition' ||
    raw === 'overdue_screening' ||
    raw === 'requires_referral'
  ) {
    return raw
  }
  return 'all'
}

export function NcdaNutritionAlertsPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.nutritionAlerts.title}
          subtitle={ncda.nutritionAlerts.subtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.children.mockOnlyTitle}
            description={ncda.children.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaNutritionAlertsLive />
}

function NcdaNutritionAlertsLive() {
  const [params, setParams] = useSearchParams()
  const districtId = params.get('district') ?? 'all'
  const centerId = params.get('centre') ?? 'all'
  const status = parseStatusFilter(params.get('status'))

  const districts = useNcdaChildDistrictOptions()
  const centers = useNcdaChildCenterOptions(
    districtId === 'all' ? undefined : districtId,
    undefined,
    districtId !== 'all',
  )

  const apiFilters = useMemo(
    () => ({
      districtId: districtId === 'all' ? undefined : districtId,
      centerId: centerId === 'all' ? undefined : centerId,
      status: status === 'all' ? undefined : status,
    }),
    [districtId, centerId, status],
  )

  const alertsQ = useNcdaNutritionAlerts(apiFilters)
  const uiAlerts = useMemo(
    () => (alertsQ.data?.items ?? []).map(mapApiNutritionAlertToUi),
    [alertsQ.data?.items],
  )

  const districtOptions = districts.data?.items ?? []
  const centerOptions = centers.data?.items ?? []

  function patchParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === 'all' || value === '') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  return (
    <PageContainer>
      <PageHeader
        title={ncda.nutritionAlerts.title}
        subtitle={ncda.nutritionAlerts.subtitle}
        size="compact"
        action={
          <Link
            to={NCDA_PATHS.followUp}
            className="text-caption font-semibold text-primary hover:underline"
          >
            {ncda.nutritionAlerts.backToMonitoring}
          </Link>
        }
      />

      <PageContent>
        <div className="space-y-6">
          <Card padding="md" className="border-border">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label
                  htmlFor="ncda-nutrition-district"
                  className="mb-1 block text-caption font-semibold text-text-secondary"
                >
                  {ncda.children.districtFilter}
                </label>
                <SelectInput
                  id="ncda-nutrition-district"
                  value={districtId}
                  onChange={(e) => {
                    patchParams({ district: e.target.value, centre: null })
                  }}
                  disabled={districts.isLoading && !districts.data}
                >
                  <option value="all">{ncda.children.districtAll}</option>
                  {districtOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <label
                  htmlFor="ncda-nutrition-center"
                  className="mb-1 block text-caption font-semibold text-text-secondary"
                >
                  {ncda.children.centerFilter}
                </label>
                <SelectInput
                  id="ncda-nutrition-center"
                  value={centerId}
                  onChange={(e) => patchParams({ centre: e.target.value })}
                  disabled={districtId === 'all' || (centers.isLoading && !centers.data)}
                >
                  <option value="all">
                    {districtId === 'all'
                      ? ncda.children.centerNeedsDistrict
                      : ncda.children.centerAll}
                  </option>
                  {centerOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <label
                  htmlFor="ncda-nutrition-status"
                  className="mb-1 block text-caption font-semibold text-text-secondary"
                >
                  {ncda.nutritionAlerts.statusFilter}
                </label>
                <SelectInput
                  id="ncda-nutrition-status"
                  value={status}
                  onChange={(e) => patchParams({ status: e.target.value })}
                >
                  <option value="all">{ncda.nutritionAlerts.statusAll}</option>
                  <option value="severe_nutrition">{ncda.nutritionAlerts.statusSevere}</option>
                  <option value="requires_referral">{ncda.nutritionAlerts.statusReferral}</option>
                  <option value="overdue_screening">{ncda.nutritionAlerts.statusOverdue}</option>
                </SelectInput>
              </div>
            </div>
          </Card>

          {alertsQ.isError && !alertsQ.data ? (
            <Card padding="md" className="border-border">
              <div className="flex items-start gap-3">
                <AlertTriangle className="shrink-0 text-error" size={20} aria-hidden />
                <div className="space-y-3">
                  <p className="text-body text-text-secondary">{ncda.nutritionAlerts.loadError}</p>
                  <Button type="button" variant="primary" onClick={() => void alertsQ.refetch()}>
                    {ncda.children.retry}
                  </Button>
                </div>
              </div>
            </Card>
          ) : alertsQ.isLoading && !alertsQ.data ? (
            <div className="space-y-3" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" rounded="xl" />
              ))}
            </div>
          ) : (
            <>
              <p className="text-caption text-text-secondary">
                {ncda.nutritionAlerts.resultCount.replace(
                  '{count}',
                  String(alertsQ.data?.total ?? uiAlerts.length),
                )}
              </p>
              <NutritionAlertList
                alerts={uiAlerts}
                childDetailPath={(childId) => `${NCDA_PATHS.children}/${childId}`}
                viewChildLabel={ncda.children.viewDetail}
              />
            </>
          )}
        </div>
      </PageContent>
    </PageContainer>
  )
}
