/**
 * Compliance resource — paginated assessments + detail + standards catalogue.
 * NCDA must not walk all pages to compute national aggregates.
 */
import {
  complianceControllerGetAssessment,
  complianceControllerListAssessments,
  complianceControllerListStandards,
} from '@/api/generated/endpoints/compliance/compliance'
import type {
  AssessmentDetailResponseDto,
  AssessmentStatus,
  PaginatedAssessmentsResponseDto,
  StandardResponseDto,
} from '@/api/generated/models'

const MAX_PAGE_SIZE = 100

function clampPageSize(pageSize?: number): number {
  if (pageSize == null || Number.isNaN(pageSize)) return 20
  return Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE)
}

export const COMPLIANCE_MAX_PAGE_SIZE = MAX_PAGE_SIZE

export type ComplianceAssessmentsListFilters = {
  centerId?: string
  districtId?: string
  status?: AssessmentStatus
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export async function listComplianceAssessmentsPage(
  filters: ComplianceAssessmentsListFilters = {},
): Promise<PaginatedAssessmentsResponseDto> {
  return complianceControllerListAssessments({
    centerId: filters.centerId,
    districtId: filters.districtId,
    status: filters.status,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 1,
    pageSize: clampPageSize(filters.pageSize),
  })
}

export async function getComplianceAssessment(
  id: string,
): Promise<AssessmentDetailResponseDto> {
  return complianceControllerGetAssessment(id)
}

export async function listComplianceStandards(): Promise<StandardResponseDto[]> {
  return complianceControllerListStandards()
}
