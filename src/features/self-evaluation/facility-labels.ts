import type { SelfEvalFacilityChecklist } from './types'

export const FACILITY_TYPE_LABELS: Record<
  SelfEvalFacilityChecklist['id'],
  { rw: string; en: string }
> = {
  daycare: {
    rw: 'Irerero (abana bari munsi y’imyaka 3)',
    en: 'Daycare / crèche (under 3 years)',
  },
  home_based: {
    rw: 'Urugo mbonezamikurire rukorera mu rugo',
    en: 'Home-based ECD facility',
  },
  community_based: {
    rw: 'Urugo mbonezamikurire rukorera mu mudugudu',
    en: 'Community-based ECD facility',
  },
  school_model: {
    rw: 'Urugo rw’ikitegererezo / rukorera ku ishuri',
    en: 'Model or school-based ECD facility',
  },
}

export function facilityTypeLabel(id: string): string {
  return FACILITY_TYPE_LABELS[id as keyof typeof FACILITY_TYPE_LABELS]?.rw ?? id
}
