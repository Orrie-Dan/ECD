import type { SelfEvalFacilityChecklist } from './types'

export const FACILITY_TYPE_LABELS: Record<
  SelfEvalFacilityChecklist['id'],
  { rw: string; en: string }
> = {
  daycare: {
    rw: 'Irerero (abana bari munsi y’imyaka 3)',
    en: 'Day Care ECD Facility (0 to 3 Years)',
  },
  ecd_3_5: {
    rw: 'Urugo mbonezamikurire (abana bari hagati y’imyaka 3–5)',
    en: 'ECD Facility for Children Aged 3–5 Years',
  },
}

export function facilityTypeLabel(id: string): string {
  return FACILITY_TYPE_LABELS[id as keyof typeof FACILITY_TYPE_LABELS]?.rw ?? id
}
