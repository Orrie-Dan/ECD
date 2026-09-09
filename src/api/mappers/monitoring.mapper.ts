import type {
  DashboardResponseDto,
  MonitoringAttendanceResponseDto,
  MonitoringComplianceResponseDto,
  MonitoringFeedingResponseDto,
  MonitoringNutritionResponseDto,
  MonitoringReferralsResponseDto,
  MonitoringStedResponseDto,
  MonitoringWashResponseDto,
} from '@/api/generated/models'
import type {
  MonitoringAttendanceViewModel,
  MonitoringComplianceViewModel,
  MonitoringDashboardViewModel,
  MonitoringFeedingViewModel,
  MonitoringNutritionViewModel,
  MonitoringReferralsViewModel,
  MonitoringScopeFilters,
  MonitoringStedViewModel,
  MonitoringWashViewModel,
} from '@/models/monitoring'

function roundRate(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null
  return Math.round(value * 10) / 10
}

export function mapDashboardDtoToViewModel(
  dto: DashboardResponseDto,
): MonitoringDashboardViewModel {
  return {
    from: dto.from,
    to: dto.to,
    districtId: dto.districtId,
    centerId: dto.centerId,
    centersInScope: dto.centersInScope,
    children: {
      total: dto.children.total,
      active: dto.children.active,
      archived: dto.children.archived,
      transferred: dto.children.transferred,
    },
    attendance: {
      present: dto.attendance.present,
      absent: dto.attendance.absent,
      totalRecords: dto.attendance.totalRecords,
      rate: roundRate(dto.attendance.rate),
      centersReporting: dto.attendance.centersReporting,
    },
    nutrition: {
      screenings: dto.nutrition.screenings,
      severe: dto.nutrition.severe,
      moderate: dto.nutrition.moderate,
      atRisk: dto.nutrition.atRisk,
      normal: dto.nutrition.normal,
      requiresReferral: dto.nutrition.requiresReferral,
    },
    referrals: {
      created: dto.referrals.created,
      pending: dto.referrals.pending,
      completed: dto.referrals.completed,
      cancelled: dto.referrals.cancelled,
    },
    feeding: {
      daysRecorded: dto.feeding.daysRecorded,
      daysWithMilk: dto.feeding.daysWithMilk,
      daysWithPorridge: dto.feeding.daysWithPorridge,
      daysWithBalancedMeal: dto.feeding.daysWithBalancedMeal,
      centersReporting: dto.feeding.centersReporting,
    },
  }
}

export function mapAttendanceMonitoringToViewModel(
  dto: MonitoringAttendanceResponseDto,
): MonitoringAttendanceViewModel {
  return {
    from: dto.from,
    to: dto.to,
    districtId: dto.districtId,
    centerId: dto.centerId,
    sectorId: dto.sectorId,
    summary: {
      enrolledChildren: dto.summary.enrolledChildren,
      present: dto.summary.present,
      absent: dto.summary.absent,
      totalRecords: dto.summary.totalRecords,
      attendanceRate: roundRate(dto.summary.attendanceRate),
    },
    trend: dto.trend.map((p) => ({
      date: p.date,
      present: p.present,
      absent: p.absent,
      rate: roundRate(p.rate),
    })),
    items: dto.items.map((item) => ({
      centerId: item.centerId,
      centerName: item.centerName,
      enrolledChildren: item.enrolledChildren,
      present: item.present,
      absent: item.absent,
      rate: roundRate(item.rate),
    })),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

export function mapNutritionMonitoringToViewModel(
  dto: MonitoringNutritionResponseDto,
): MonitoringNutritionViewModel {
  return {
    from: dto.from,
    to: dto.to,
    districtId: dto.districtId,
    centerId: dto.centerId,
    summary: {
      activeChildren: dto.summary.activeChildren,
      screenings: dto.summary.screenings,
      severe: dto.summary.severe,
      moderate: dto.summary.moderate,
      atRisk: dto.summary.atRisk,
      normal: dto.summary.normal,
      requiresReferral: dto.summary.requiresReferral,
      overdueScreenings: dto.summary.overdueScreenings,
      neverScreened: dto.summary.neverScreened,
      screeningCoverage: roundRate(dto.summary.screeningCoverage),
    },
    items: dto.items.map((item) => ({
      centerId: item.centerId,
      centerName: item.centerName,
      screenings: item.screenings,
      severe: item.severe,
      moderate: item.moderate,
      atRisk: item.atRisk,
      normal: item.normal,
    })),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

export function mapFeedingMonitoringToViewModel(
  dto: MonitoringFeedingResponseDto,
): MonitoringFeedingViewModel {
  return {
    from: dto.from,
    to: dto.to,
    districtId: dto.districtId,
    centerId: dto.centerId,
    summary: {
      daysRecorded: dto.summary.daysRecorded,
      daysWithMilk: dto.summary.daysWithMilk,
      daysWithPorridge: dto.summary.daysWithPorridge,
      daysWithBalancedMeal: dto.summary.daysWithBalancedMeal,
      reportingCenters: dto.summary.reportingCenters,
      centersInScope: dto.summary.centersInScope,
      expectedDayRecords: dto.summary.expectedDayRecords,
      feedingCoverage: roundRate(dto.summary.feedingCoverage),
      centersMissingReports: dto.summary.centersMissingReports,
    },
    items: dto.items.map((item) => ({
      centerId: item.centerId,
      centerName: item.centerName,
      daysRecorded: item.daysRecorded,
      expectedDays: item.expectedDays,
      missingDays: item.missingDays,
      coverage: roundRate(item.coverage),
    })),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

export function mapStedMonitoringToViewModel(
  dto: MonitoringStedResponseDto,
): MonitoringStedViewModel {
  return {
    from: dto.from,
    to: dto.to,
    districtId: dto.districtId,
    centerId: dto.centerId,
    granularity: dto.granularity,
    summary: {
      assessmentsCompleted: dto.summary.assessmentsCompleted,
      childrenAssessed: dto.summary.childrenAssessed,
      centersWithAssessments: dto.summary.centersWithAssessments,
      activeChildren: dto.summary.activeChildren,
      coverage: roundRate(dto.summary.coverage),
      averageScore: dto.summary.averageScore,
      pendingFollowUps: dto.summary.pendingFollowUps,
      centersInScope: dto.summary.centersInScope,
      ageBandDistribution: { ...(dto.summary.ageBandDistribution ?? {}) },
      outcomeDistribution: { ...(dto.summary.outcomeDistribution ?? {}) },
    },
    items: dto.items.map((item) => ({
      centerId: item.centerId,
      centerName: item.centerName,
      districtId: item.districtId,
      districtName: item.districtName,
      assessmentsCompleted: item.assessmentsCompleted,
      childrenAssessed: item.childrenAssessed,
      averageScore: item.averageScore,
    })),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

export function mapComplianceMonitoringToViewModel(
  dto: MonitoringComplianceResponseDto,
): MonitoringComplianceViewModel {
  const rawItems =
    (dto as MonitoringComplianceResponseDto & {
      items?: Array<{
        assessmentId: string
        centerId: string
        centerName: string
        percent: number | null
        rank: string | null
        assessmentDate: string
      }>
    }).items ?? []

  return {
    from: dto.from,
    to: dto.to,
    districtId: dto.districtId,
    centerId: dto.centerId,
    summary: {
      totalAssessments: dto.summary.totalAssessments,
      centersAssessed: dto.summary.centersAssessed,
      centersInScope: dto.summary.centersInScope,
      byStatus: { ...(dto.summary.byStatus ?? {}) },
      byType: { ...(dto.summary.byType ?? {}) },
      classificationPopulated: dto.summary.classificationPopulated,
      byClassification: { ...(dto.summary.byClassification ?? {}) },
      byRank: {
        green: 0,
        blue: 0,
        yellow: 0,
        red: 0,
        ...(dto.summary.byRank ?? {}),
      },
      classificationNullRate: dto.summary.classificationNullRate,
    },
    items: rawItems.map((item) => ({
      assessmentId: item.assessmentId,
      centerId: item.centerId,
      centerName: item.centerName,
      percent: item.percent,
      rank: item.rank,
      assessmentDate:
        typeof item.assessmentDate === 'string'
          ? item.assessmentDate
          : String(item.assessmentDate),
    })),
  }
}

export function mapWashMonitoringToViewModel(
  dto: MonitoringWashResponseDto,
): MonitoringWashViewModel {
  return {
    from: dto.from,
    to: dto.to,
    districtId: dto.districtId,
    centerId: dto.centerId,
    summary: {
      centersInScope: dto.summary.centersInScope,
      reporting: {
        recordsInRange: dto.summary.reporting.recordsInRange,
        centersReporting: dto.summary.reporting.centersReporting,
      },
      latestSnapshot: {
        centersWithData: dto.summary.latestSnapshot.centersWithData,
        waterSourceAvailable: dto.summary.latestSnapshot.waterSourceAvailable,
        sanitationFacilityAvailable: dto.summary.latestSnapshot.sanitationFacilityAvailable,
        handwashingFacilityAvailable: dto.summary.latestSnapshot.handwashingFacilityAvailable,
        wasteManagementAvailable: dto.summary.latestSnapshot.wasteManagementAvailable,
      },
    },
  }
}

export function mapReferralsMonitoringToViewModel(
  dto: MonitoringReferralsResponseDto,
): MonitoringReferralsViewModel {
  return {
    from: dto.from,
    to: dto.to,
    districtId: dto.districtId,
    centerId: dto.centerId,
    summary: {
      created: dto.summary.created,
      pending: dto.summary.pending,
      completed: dto.summary.completed,
      cancelled: dto.summary.cancelled,
      overdue: dto.summary.overdue,
      averageCompletionDays: dto.summary.averageCompletionDays,
    },
    items: dto.items.map((item) => ({
      centerId: item.centerId,
      centerName: item.centerName,
      pending: item.pending,
      completed: item.completed,
      overdue: item.overdue,
    })),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    totalPages: dto.totalPages,
  }
}

/** Strip undefined so Orval/axios params stay clean. */
export function toMonitoringQueryParams(filters: MonitoringScopeFilters = {}) {
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
