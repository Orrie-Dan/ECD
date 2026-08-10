import { Filter } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { FormField, SelectInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import type { MapViewFilters } from './types'

interface MapFilterPanelProps {
  filters: MapViewFilters
  sectors: string[]
  onChange: (next: MapViewFilters) => void
  onReset: () => void
  className?: string
}

/**
 * Attribute / spatial filter panel.
 * Future: apply filters to FeatureLayer definitionExpression or view filters.
 */
export function MapFilterPanel({
  filters,
  sectors,
  onChange,
  onReset,
  className = '',
}: MapFilterPanelProps) {
  const hasActiveFilters = Boolean(filters.sector || filters.period)

  return (
    <Card padding="md" className={className} data-gis-slot="filter-panel">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-light shrink-0">
            <Filter size={18} className="text-primary" aria-hidden />
          </span>
          <h3 className="text-body font-semibold text-text">{district.gis.filtersTitle}</h3>
        </div>
        {hasActiveFilters && (
          <Button type="button" variant="tertiary" size="sm" onClick={onReset}>
            {common.reset}
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <FormField label={district.gis.filterSector}>
          <SelectInput
            value={filters.sector}
            onChange={(e) => onChange({ ...filters, sector: e.target.value })}
            aria-label={district.gis.filterSector}
          >
            <option value="">{district.gis.allSectors}</option>
            {sectors.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label={district.gis.filterPeriod}>
          <SelectInput
            value={filters.period}
            onChange={(e) =>
              onChange({
                ...filters,
                period: e.target.value as MapViewFilters['period'],
              })
            }
            aria-label={district.gis.filterPeriod}
          >
            <option value="">{district.gis.allPeriods}</option>
            <option value="week">{district.gis.periodWeek}</option>
            <option value="month">{district.gis.periodMonth}</option>
            <option value="year">{district.gis.periodYear}</option>
          </SelectInput>
        </FormField>
      </div>
    </Card>
  )
}
