import { district } from '@/locales/rw/district'

export type DistrictMapLayerId = 'centers' | 'attendance' | 'nutrition' | 'intervention'

export type DistrictLayerAvailability = 'live' | 'unavailable'

export interface DistrictMapLayerDefinition {
  id: DistrictMapLayerId
  label: string
  description: string
  availability: DistrictLayerAvailability
  enabled: boolean
}

export function buildDistrictMapLayers(): DistrictMapLayerDefinition[] {
  return [
    {
      id: 'centers',
      label: district.overview.layerCenters,
      description: district.overview.layerCentersDesc,
      availability: 'live',
      enabled: true,
    },
    {
      id: 'attendance',
      label: district.overview.layerAttendance,
      description: district.overview.layerAttendanceDesc,
      availability: 'unavailable',
      enabled: false,
    },
    {
      id: 'nutrition',
      label: district.overview.layerNutrition,
      description: district.overview.layerNutritionDesc,
      availability: 'unavailable',
      enabled: false,
    },
    {
      id: 'intervention',
      label: district.overview.layerIntervention,
      description: district.overview.layerInterventionDesc,
      availability: 'unavailable',
      enabled: false,
    },
  ]
}
