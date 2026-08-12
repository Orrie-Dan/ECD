import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { ncda, queryStaleTimes } from '@/api/query-keys'
import {
  getComplianceAssessment,
  listComplianceAssessmentsPage,
  listComplianceStandards,
  type ComplianceAssessmentsListFilters,
} from '@/api/resources/compliance'
import { listDistrictsPage, listCentersByDistrictPage } from '@/api/resources/geo'

export type NcdaComplianceListFilters = ComplianceAssessmentsListFilters

export function useNcdaComplianceAssessments(
  filters: NcdaComplianceListFilters = {},
  enabled = true,
) {
  const listFilters: ComplianceAssessmentsListFilters = {
    centerId: filters.centerId,
    districtId: filters.districtId,
    status: filters.status,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  }
  return useQuery({
    queryKey: ncda.keys.compliance.list(listFilters as Record<string, unknown>),
    queryFn: () => listComplianceAssessmentsPage(listFilters),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaCompliance,
  })
}

export function useNcdaComplianceAssessmentDetail(
  assessmentId: string | undefined,
  enabled = true,
) {
  const id = assessmentId?.trim() ?? ''
  return useQuery({
    queryKey: ncda.keys.compliance.detail(id),
    queryFn: () => getComplianceAssessment(id),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaCompliance,
  })
}

export function useNcdaComplianceStandards(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.compliance.standards(),
    queryFn: () => listComplianceStandards(),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaCompliance,
  })
}

export function useNcdaComplianceDistrictOptions(enabled = true) {
  return useQuery({
    queryKey: ncda.keys.compliance.list({ districtOptions: true }),
    queryFn: () => listDistrictsPage({ page: 1, pageSize: 100 }),
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.ncdaCompliance,
  })
}

export function useNcdaComplianceCenterOptions(
  districtId: string | undefined,
  search?: string,
  enabled = true,
) {
  const id = districtId?.trim() ?? ''
  const q = search?.trim() || undefined
  return useQuery({
    queryKey: ncda.keys.compliance.list({ centerOptions: id, search: q }),
    queryFn: () =>
      listCentersByDistrictPage({
        districtId: id,
        search: q,
        page: 1,
        pageSize: 100,
      }),
    enabled: env.isLive && enabled && Boolean(id),
    staleTime: queryStaleTimes.ncdaCompliance,
  })
}
