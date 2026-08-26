import { FormField, SelectInput } from '@/components/ui/FormField'
import { RegisterFiltersCard } from '@/components/caretaker/register'
import { district } from '@/locales/rw/district'
import { ncda } from '@/locales/rw/ncda'

const districtCopy = district.registers.scope
const ncdaCopy = ncda.registers.scope

export interface SupervisoryCenterOption {
  id: string
  name: string
}

export interface SupervisoryDistrictOption {
  id: string
  name: string
}

interface DistrictScopeFiltersProps {
  centerId: string
  onCenterIdChange: (centerId: string) => void
  centerOptions: SupervisoryCenterOption[]
  centersLoading?: boolean
}

interface NcdaScopeFiltersProps {
  districtId: string
  onDistrictIdChange: (districtId: string) => void
  districtOptions: SupervisoryDistrictOption[]
  districtsLoading?: boolean
  centerId: string
  onCenterIdChange: (centerId: string) => void
  centerOptions: SupervisoryCenterOption[]
  centersLoading?: boolean
  centersDisabled?: boolean
}

export function DistrictRegisterScopeFilters({
  centerId,
  onCenterIdChange,
  centerOptions,
  centersLoading,
}: DistrictScopeFiltersProps) {
  return (
    <RegisterFiltersCard>
      <FormField label={districtCopy.centerFilter}>
        <SelectInput
          value={centerId}
          onChange={(e) => onCenterIdChange(e.target.value)}
          disabled={centersLoading}
        >
          <option value="all">{districtCopy.centerAll}</option>
          {centerOptions.map((center) => (
            <option key={center.id} value={center.id}>
              {center.name}
            </option>
          ))}
        </SelectInput>
      </FormField>
    </RegisterFiltersCard>
  )
}

export function NcdaRegisterScopeFilters({
  districtId,
  onDistrictIdChange,
  districtOptions,
  districtsLoading,
  centerId,
  onCenterIdChange,
  centerOptions,
  centersLoading,
  centersDisabled,
}: NcdaScopeFiltersProps) {
  return (
    <RegisterFiltersCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={ncdaCopy.districtFilter}>
          <SelectInput
            value={districtId}
            onChange={(e) => onDistrictIdChange(e.target.value)}
            disabled={districtsLoading}
          >
            <option value="all">{ncdaCopy.districtAll}</option>
            {districtOptions.map((districtRow) => (
              <option key={districtRow.id} value={districtRow.id}>
                {districtRow.name}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label={ncdaCopy.centerFilter}>
          <SelectInput
            value={centerId}
            onChange={(e) => onCenterIdChange(e.target.value)}
            disabled={centersDisabled || centersLoading}
          >
            <option value="all">
              {districtId === 'all' ? ncdaCopy.centerNeedsDistrict : ncdaCopy.centerAll}
            </option>
            {centerOptions.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </SelectInput>
        </FormField>
      </div>
    </RegisterFiltersCard>
  )
}
