import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SelectInput } from '@/components/ui/FormField'
import {
  ChartPeriodFilter,
  type ChartPeriodFilterValue,
} from '@/components/charts'
import { resolveEffectiveDateRange } from '@/lib/chart-period'
import { effectiveRangeToMonitoringDates } from '@/features/monitoring'
import {
  useNcdaMonitoringCenterOptions,
  useNcdaMonitoringDistrictOptions,
} from '@/features/ncda/monitoring/queries'
import { ncda } from '@/locales/rw/ncda'

const DEFAULT_PERIOD: ChartPeriodFilterValue = { period: 'month', month: '' }

export function useNcdaMonitoringScope() {
  const [params] = useSearchParams()
  const [periodFilter, setPeriodFilter] = useState<ChartPeriodFilterValue>(DEFAULT_PERIOD)
  const [districtId, setDistrictId] = useState(() => params.get('district')?.trim() || 'all')
  const [centerId, setCenterId] = useState('all')

  const effectiveRange = useMemo(
    () => resolveEffectiveDateRange(periodFilter),
    [periodFilter],
  )

  const dateFilters = useMemo(
    () => ({
      ...effectiveRangeToMonitoringDates(effectiveRange),
      districtId: districtId === 'all' ? undefined : districtId,
      centerId: centerId === 'all' ? undefined : centerId,
    }),
    [effectiveRange, districtId, centerId],
  )

  const districts = useNcdaMonitoringDistrictOptions()
  const centers = useNcdaMonitoringCenterOptions(districtId)

  return {
    periodFilter,
    setPeriodFilter,
    districtId,
    setDistrictId,
    centerId,
    setCenterId,
    effectiveRange,
    dateFilters,
    districts,
    centers,
  }
}

export function NcdaMonitoringScopeFilters({
  scope,
}: {
  scope: ReturnType<typeof useNcdaMonitoringScope>
}) {
  return (
    <div className="mb-4 space-y-3">
      <ChartPeriodFilter
        value={scope.periodFilter}
        onChange={scope.setPeriodFilter}
        className="max-w-xl"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-caption font-semibold text-text-secondary">
            {ncda.monitoring.districtFilter}
          </label>
          <SelectInput
            value={scope.districtId}
            onChange={(e) => {
              scope.setDistrictId(e.target.value)
              scope.setCenterId('all')
            }}
          >
            <option value="all">{ncda.monitoring.districtAll}</option>
            {(scope.districts.data?.items ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </SelectInput>
        </div>
        <div>
          <label className="mb-1 block text-caption font-semibold text-text-secondary">
            {ncda.monitoring.centerFilter}
          </label>
          <SelectInput
            value={scope.centerId}
            onChange={(e) => scope.setCenterId(e.target.value)}
          >
            <option value="all">{ncda.monitoring.centerAll}</option>
            {(scope.centers.data?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>
      <p className="text-caption text-text-secondary">
        {ncda.monitoring.periodHint}: {scope.effectiveRange.timeLabel}
      </p>
      <p className="text-caption text-text-muted">{ncda.monitoringHub.nationalSafeNote}</p>
    </div>
  )
}
