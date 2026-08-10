import { X } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { FormField, SelectInput, TextInput } from '@/components/ui/FormField'
import { Card } from '@/components/ui/Card'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import type {
  DistrictGrowthFilters,
  GrowthAgeGroupFilter,
  NutritionStatusFilter,
} from '@/lib/nutrition-utils'

interface CenterOption {
  id: string
  name: string
  sector: string
}

interface DistrictGrowthFilterBarProps {
  filters: DistrictGrowthFilters
  centers: CenterOption[]
  onChange: (next: Partial<DistrictGrowthFilters>) => void
  onReset: () => void
  showReset: boolean
}

const selectClassName =
  '!min-h-11 sm:!min-h-12 w-full text-body font-semibold rounded-xl border-border bg-surface'

export function DistrictGrowthFilterBar({
  filters,
  centers,
  onChange,
  onReset,
  showReset,
}: DistrictGrowthFilterBarProps) {
  return (
    <Card padding="lg" className="mb-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 xl:items-end">
        <div className="md:col-span-2 xl:col-span-1">
          <FormField label={district.growth.searchLabel}>
            <SearchInput
              value={filters.search}
              onChange={(search) => onChange({ search })}
              placeholder={district.growth.searchPlaceholder}
              className="w-full"
            />
          </FormField>
        </div>

        <FormField label={district.growth.center}>
          <SelectInput
            value={filters.centerId}
            onChange={(e) => onChange({ centerId: e.target.value })}
            aria-label={district.growth.center}
            className={selectClassName}
          >
            <option value="all">{district.growth.centerAll}</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name} — {center.sector}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label={district.growth.monthLabel}>
          <TextInput
            type="month"
            value={filters.yearMonth}
            onChange={(e) => onChange({ yearMonth: e.target.value })}
            aria-label={district.growth.monthLabel}
            className="!min-h-11 sm:!min-h-12"
          />
        </FormField>

        <FormField label={district.growth.statusFilterLabel}>
          <SelectInput
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value as NutritionStatusFilter })}
            aria-label={district.growth.statusFilterLabel}
            className={selectClassName}
          >
            <option value="all">{district.growth.statusAll}</option>
            <option value="normal">{district.growth.statusNormal}</option>
            <option value="at_risk">{district.growth.statusAtRisk}</option>
            <option value="moderate">{district.growth.statusModerate}</option>
            <option value="severe">{district.growth.statusSevere}</option>
          </SelectInput>
        </FormField>

        <FormField label={district.growth.ageGroupLabel}>
          <SelectInput
            value={filters.ageGroup}
            onChange={(e) => onChange({ ageGroup: e.target.value as GrowthAgeGroupFilter })}
            aria-label={district.growth.ageGroupLabel}
            className={selectClassName}
          >
            <option value="all">{district.growth.ageAll}</option>
            <option value="3-4">{district.growth.age34}</option>
            <option value="5-6">{district.growth.age56}</option>
            <option value="other">{district.growth.ageOther}</option>
          </SelectInput>
        </FormField>
      </div>

      {showReset && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="tertiary"
            size="md"
            icon={<X size={18} />}
            onClick={onReset}
          >
            {common.clearFilters}
          </Button>
        </div>
      )}
    </Card>
  )
}
