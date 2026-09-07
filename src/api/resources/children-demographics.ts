/**
 * Children demographics resource — manual client until OpenAPI/orval includes the route.
 */
import { customInstance } from '@/api/client'
import type {
  ChildrenDemographicsFilters,
  ChildrenDemographicsViewModel,
} from '@/models/children-demographics'

type DemographicSliceDto = {
  boys: number
  boysWithDisability: number
  girls: number
  girlsWithDisability: number
  withDisability: number
  total: number
}

type ChildrenDemographicsResponseDto = {
  asOf: string
  districtId: string | null
  centerId: string | null
  centersInScope: number
  children: {
    total: number
    boys: number
    girls: number
    withDisability: number
    byAgeBand: {
      age_0_2: DemographicSliceDto
      age_3_6: DemographicSliceDto
      age_above_6: DemographicSliceDto
    }
  }
  caregivers: {
    total: number
    male: number
    female: number
    unknownGender: number
    education: {
      withTrainingCertificate: number
      diploma: number
      degree: number
    }
  }
  supportingStaff: {
    total: number
    male: number
    female: number
    unknownGender: number
  }
  childrenPerCaregiver: number | null
  byDistrict: Array<{
    districtId: string
    districtName: string
    districtCode: string
    boys: number
    girls: number
    total: number
  }>
}

function mapSlice(dto: DemographicSliceDto) {
  return {
    boys: dto.boys,
    boysWithDisability: dto.boysWithDisability,
    girls: dto.girls,
    girlsWithDisability: dto.girlsWithDisability,
    withDisability: dto.withDisability,
    total: dto.total,
  }
}

export async function fetchChildrenDemographics(
  filters: ChildrenDemographicsFilters = {},
  signal?: AbortSignal,
): Promise<ChildrenDemographicsViewModel> {
  const params: Record<string, string> = {}
  if (filters.districtId) params.districtId = filters.districtId
  if (filters.centerId) params.centerId = filters.centerId

  const dto = await customInstance<ChildrenDemographicsResponseDto>(
    {
      url: '/api/v1/analytics/children-demographics',
      method: 'GET',
      params,
      signal,
    },
  )

  return {
    asOf: dto.asOf,
    districtId: dto.districtId,
    centerId: dto.centerId,
    centersInScope: dto.centersInScope,
    children: {
      total: dto.children.total,
      boys: dto.children.boys,
      girls: dto.children.girls,
      withDisability: dto.children.withDisability,
      byAgeBand: {
        age_0_2: mapSlice(dto.children.byAgeBand.age_0_2),
        age_3_6: mapSlice(dto.children.byAgeBand.age_3_6),
        age_above_6: mapSlice(dto.children.byAgeBand.age_above_6),
      },
    },
    caregivers: {
      total: dto.caregivers.total,
      male: dto.caregivers.male,
      female: dto.caregivers.female,
      unknownGender: dto.caregivers.unknownGender,
      education: {
        withTrainingCertificate: dto.caregivers.education.withTrainingCertificate,
        diploma: dto.caregivers.education.diploma,
        degree: dto.caregivers.education.degree,
      },
    },
    supportingStaff: {
      total: dto.supportingStaff.total,
      male: dto.supportingStaff.male,
      female: dto.supportingStaff.female,
      unknownGender: dto.supportingStaff.unknownGender,
    },
    childrenPerCaregiver: dto.childrenPerCaregiver,
    byDistrict: dto.byDistrict.map((row) => ({
      districtId: row.districtId,
      districtName: row.districtName,
      districtCode: row.districtCode,
      boys: row.boys,
      girls: row.girls,
      total: row.total,
    })),
  }
}
