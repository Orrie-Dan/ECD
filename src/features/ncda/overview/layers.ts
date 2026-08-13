import { ncda } from '@/locales/rw/ncda'

export type NcdaMapLayerId =
  | 'centers'
  | 'coverage'
  | 'attendance'
  | 'compliance'
  | 'nutrition'
  | 'growth'
  | 'wash'
  | 'inspections'
  | 'referrals'
  | 'population'

export type NcdaLayerAvailability = 'live' | 'unavailable'

export interface NcdaMapLayerDefinition {
  id: NcdaMapLayerId
  label: string
  description: string
  availability: NcdaLayerAvailability
  enabled: boolean
}

export function buildNcdaMapLayers(): NcdaMapLayerDefinition[] {
  return [
    {
      id: 'centers',
      label: ncda.overview.layerCenters,
      description: ncda.overview.layerCentersDesc,
      availability: 'live',
      enabled: true,
    },
    {
      id: 'coverage',
      label: ncda.overview.layerCoverage,
      description: ncda.overview.layerCoverageDesc,
      availability: 'unavailable',
      enabled: false,
    },
    {
      id: 'attendance',
      label: ncda.overview.layerAttendance,
      description: ncda.overview.layerAttendanceDesc,
      availability: 'unavailable',
      enabled: false,
    },
    {
      id: 'compliance',
      label: ncda.overview.layerCompliance,
      description: ncda.overview.layerComplianceDesc,
      availability: 'unavailable',
      enabled: false,
    },
    {
      id: 'nutrition',
      label: ncda.overview.layerNutrition,
      description: ncda.overview.layerNutritionDesc,
      availability: 'unavailable',
      enabled: false,
    },
    {
      id: 'growth',
      label: ncda.overview.layerGrowth,
      description: ncda.overview.layerGrowthDesc,
      availability: 'unavailable',
      enabled: false,
    },
    {
      id: 'wash',
      label: ncda.overview.layerWash,
      description: ncda.overview.layerWashDesc,
      availability: 'unavailable',
      enabled: false,
    },
    {
      id: 'inspections',
      label: ncda.overview.layerInspections,
      description: ncda.overview.layerInspectionsDesc,
      availability: 'unavailable',
      enabled: false,
    },
    {
      id: 'referrals',
      label: ncda.overview.layerReferrals,
      description: ncda.overview.layerReferralsDesc,
      availability: 'unavailable',
      enabled: false,
    },
    {
      id: 'population',
      label: ncda.overview.layerPopulation,
      description: ncda.overview.layerPopulationDesc,
      availability: 'unavailable',
      enabled: false,
    },
  ]
}
