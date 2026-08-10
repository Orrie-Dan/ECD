import type {
  CentersReportResponseDto,
  DistrictReportResponseDto,
  DropoutsReportResponseDto,
  EnrollmentReportResponseDto,
} from '@/api/generated/models'
import type {
  CentersReportViewModel,
  DistrictReportViewModel,
  DropoutsReportViewModel,
  EnrollmentReportViewModel,
  ReportingScopeFilters,
} from '@/models/reporting'

function roundRate(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null
  return Math.round(value * 10) / 10
}

export function mapEnrollmentReportToViewModel(
  dto: EnrollmentReportResponseDto,
): EnrollmentReportViewModel {
  return {
    from: dto.from,
    to: dto.to,
    districtId: dto.districtId,
    centerId: dto.centerId ?? null,
    summary: {
      totalEnrolled: dto.summary.totalEnrolled,
      active: dto.summary.active,
      archived: dto.summary.archived,
      transferred: dto.summary.transferred,
      newRegistrations: dto.summary.newRegistrations,
    },
    trend: dto.trend.map((p) => ({
      date: p.date,
      newRegistrations: p.newRegistrations,
    })),
  }
}

export function mapDropoutsReportToViewModel(
  dto: DropoutsReportResponseDto,
): DropoutsReportViewModel {
  return {
    from: dto.from,
    to: dto.to,
    districtId: dto.districtId ?? null,
    interpretation: {
      dropoutDefinition: dto.interpretation.dropoutDefinition,
      excluded: dto.interpretation.excluded,
      note: dto.interpretation.note,
    },
    summary: {
      dropouts: dto.summary.dropouts,
      transfersOut: dto.summary.transfersOut,
    },
    items: dto.items.map((item) => ({
      childId: item.childId,
      childName: item.childName,
      centerId: item.centerId,
      centerName: item.centerName,
      archivedAt: item.archivedAt ?? undefined,
      archiveReason: item.archiveReason ?? undefined,
    })),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

export function mapCentersReportToViewModel(
  dto: CentersReportResponseDto,
): CentersReportViewModel {
  return {
    from: dto.from,
    to: dto.to,
    districtId: dto.districtId,
    items: dto.items.map((item) => ({
      centerId: item.centerId,
      centerCode: item.centerCode,
      centerName: item.centerName,
      status: item.status === 'inactive' ? 'inactive' : 'active',
      enrolledChildren: item.enrolledChildren,
      attendance: {
        present: item.attendance.present,
        absent: item.attendance.absent,
        rate: roundRate(item.attendance.rate),
      },
      nutritionSevereScreenings: item.nutrition.severeScreenings,
      feedingDaysRecorded: item.feeding.daysRecorded,
      referralsPending: item.referrals.pending,
      stedAssessmentsCompleted: item.sted.assessmentsCompleted,
    })),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

export function mapDistrictReportToViewModel(
  dto: DistrictReportResponseDto,
): DistrictReportViewModel {
  return {
    from: dto.from,
    to: dto.to,
    districtId: dto.districtId,
    kpis: {
      centersInScope: dto.kpis.centersInScope,
      activeChildren: dto.kpis.activeChildren,
      newRegistrations: dto.kpis.newRegistrations,
      dropouts: dto.kpis.dropouts,
      attendanceRate: roundRate(dto.kpis.attendanceRate),
      nutritionScreenings: dto.kpis.nutritionScreenings,
      severeNutrition: dto.kpis.severeNutrition,
      pendingReferrals: dto.kpis.pendingReferrals,
      feedingDaysRecorded: dto.kpis.feedingDaysRecorded,
      stedAssessments: dto.kpis.stedAssessments,
    },
  }
}

export function toReportingQueryParams(filters: ReportingScopeFilters = {}) {
  return {
    districtId: filters.districtId,
    centerId: filters.centerId,
    sectorId: filters.sectorId,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 100,
  }
}
