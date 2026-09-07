/** View model for GET /api/v1/analytics/children-demographics (manual until orval regen). */

export type DemographicSlice = {
  boys: number
  boysWithDisability: number
  girls: number
  girlsWithDisability: number
  withDisability: number
  total: number
}

export type ChildrenAgeBands = {
  age_0_2: DemographicSlice
  age_3_6: DemographicSlice
  age_above_6: DemographicSlice
}

export type StaffGenderBreakdown = {
  total: number
  male: number
  female: number
  unknownGender: number
}

export type CaregiverEducationBreakdown = {
  withTrainingCertificate: number
  diploma: number
  degree: number
}

export type ChildrenByDistrictRow = {
  districtId: string
  districtName: string
  districtCode: string
  boys: number
  girls: number
  total: number
}

export type ChildrenDemographicsViewModel = {
  asOf: string
  districtId: string | null
  centerId: string | null
  centersInScope: number
  children: {
    total: number
    boys: number
    girls: number
    withDisability: number
    byAgeBand: ChildrenAgeBands
  }
  caregivers: StaffGenderBreakdown & {
    education: CaregiverEducationBreakdown
  }
  supportingStaff: StaffGenderBreakdown
  childrenPerCaregiver: number | null
  byDistrict: ChildrenByDistrictRow[]
}

export type ChildrenDemographicsFilters = {
  districtId?: string
  centerId?: string
}
