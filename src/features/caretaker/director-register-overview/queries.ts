import { useQueries } from '@tanstack/react-query'
import { env } from '@/config/env'
import { fetchParentContributionSummary } from '@/api/resources/contributions'
import { listParentingSessions } from '@/api/resources/parenting-sessions'
import { listCommitteeMembers } from '@/api/resources/committee-members'
import { listCenterSupport } from '@/api/resources/center-support'
import { listCenterVisits } from '@/api/resources/center-visits'
import { listStaffTrainings } from '@/api/resources/staff-trainings'
import { listUsersPage } from '@/api/resources/users'
import { currentYearMonth, formatCashAmount, monthRange } from '@/lib/contribution-format'
import {
  formatRegisterCount,
  formatRegisterDate,
  formatRegisterPercent,
  pickLatestByDate,
} from '@/lib/register-format'
import { formatSupportCategory } from '@/lib/center-support-format'
import { queryStaleTimes } from '@/api/query-keys'

const OVERVIEW_KEY = 'director-register-overview'

export interface DirectorRegisterOverviewData {
  isLoading: boolean
  isError: boolean
  refetch: () => void
  contributions: {
    parentsCount: number
    cashTotal: string
    detail: string
  }
  latestParenting: {
    label: string
    detail: string
    hasRecord: boolean
  }
  committeeActiveCount: number
  activeCaregiversCount: number
  latestSupport: {
    label: string
    detail: string
    hasRecord: boolean
  }
  latestVisitor: {
    label: string
    detail: string
    hasRecord: boolean
  }
  trainingCoverage: {
    percent: string
    detail: string
    trainedCount: number
    totalCaregivers: number
  }
}

async function fetchYearTrainings(centerId: string, from: string, to: string) {
  const all: Awaited<ReturnType<typeof listStaffTrainings>>['items'] = []
  let page = 1
  let totalPages = 1
  do {
    const result = await listStaffTrainings({
      centerId,
      from,
      to,
      page,
      pageSize: 100,
    })
    all.push(...result.items)
    totalPages = result.totalPages
    page += 1
  } while (page <= totalPages)
  return all
}

export function useDirectorRegisterOverview(centerId: string): DirectorRegisterOverviewData {
  const trimmedCenterId = centerId.trim()
  const enabled = env.isLive && Boolean(trimmedCenterId)
  const yearMonth = currentYearMonth()
  const month = monthRange(yearMonth)
  const year = yearMonth.slice(0, 4)
  const yearRange = { from: `${year}-01-01`, to: month.to }

  const queries = useQueries({
    queries: [
      {
        queryKey: [OVERVIEW_KEY, trimmedCenterId, 'contributions-summary', month],
        queryFn: () =>
          fetchParentContributionSummary({
            centerId: trimmedCenterId,
            from: month.from,
            to: month.to,
          }),
        enabled,
        staleTime: queryStaleTimes.contributions,
      },
      {
        queryKey: [OVERVIEW_KEY, trimmedCenterId, 'parenting', month],
        queryFn: () =>
          listParentingSessions({
            centerId: trimmedCenterId,
            from: month.from,
            to: month.to,
            page: 1,
            pageSize: 50,
          }),
        enabled,
        staleTime: queryStaleTimes.parentingSessions,
      },
      {
        queryKey: [OVERVIEW_KEY, trimmedCenterId, 'committee-active'],
        queryFn: () =>
          listCommitteeMembers({
            centerId: trimmedCenterId,
            isActive: true,
            page: 1,
            pageSize: 1,
          }),
        enabled,
        staleTime: queryStaleTimes.committeeMembers,
      },
      {
        queryKey: [OVERVIEW_KEY, trimmedCenterId, 'caregivers-active'],
        queryFn: () =>
          listUsersPage({
            centerId: trimmedCenterId,
            role: 'caregiver',
            status: 'ACTIVE',
            page: 1,
            pageSize: 1,
          }),
        enabled,
        staleTime: queryStaleTimes.ecdCenterUsers,
      },
      {
        queryKey: [OVERVIEW_KEY, trimmedCenterId, 'support', month],
        queryFn: () =>
          listCenterSupport({
            centerId: trimmedCenterId,
            from: month.from,
            to: month.to,
            page: 1,
            pageSize: 50,
          }),
        enabled,
        staleTime: queryStaleTimes.centerSupport,
      },
      {
        queryKey: [OVERVIEW_KEY, trimmedCenterId, 'visitors', month],
        queryFn: () =>
          listCenterVisits({
            centerId: trimmedCenterId,
            from: month.from,
            to: month.to,
            page: 1,
            pageSize: 50,
          }),
        enabled,
        staleTime: queryStaleTimes.centerVisits,
      },
      {
        queryKey: [OVERVIEW_KEY, trimmedCenterId, 'trainings-year', yearRange],
        queryFn: () => fetchYearTrainings(trimmedCenterId, yearRange.from, yearRange.to),
        enabled,
        staleTime: queryStaleTimes.staffTrainings,
      },
    ],
  })

  const [
    contributionsSummary,
    parentingList,
    committeeList,
    caregiversList,
    supportList,
    visitorsList,
    yearTrainings,
  ] = queries

  const isLoading = queries.some((q) => q.isLoading)
  const isError = queries.some((q) => q.isError)

  const refetch = () => {
    queries.forEach((q) => void q.refetch())
  }

  const summary = contributionsSummary.data
  const parentsCount =
    (summary?.cashContributorCount ?? 0) + (summary?.inKindContributorCount ?? 0)
  const cashTotal = formatCashAmount(summary?.cashAmountTotal ?? 0)

  const latestSession = pickLatestByDate(
    parentingList.data?.items ?? [],
    (s) => s.sessionDate,
  )
  const latestSupport = pickLatestByDate(
    supportList.data?.items ?? [],
    (s) => s.receivedDate,
  )
  const latestVisit = pickLatestByDate(
    visitorsList.data?.items ?? [],
    (v) => v.visitDate,
  )

  const activeCaregivers = caregiversList.data?.total ?? 0
  const trainings = yearTrainings.data ?? []
  const trainedUserIds = new Set(
    trainings
      .map((t) => t.traineeUserId?.trim())
      .filter((id): id is string => Boolean(id)),
  )
  const coverageRate =
    activeCaregivers > 0
      ? Math.round((trainedUserIds.size / activeCaregivers) * 100)
      : 0

  return {
    isLoading,
    isError,
    refetch,
    contributions: {
      parentsCount,
      cashTotal,
      detail: `${formatRegisterCount(parentsCount)} · ${cashTotal}`,
    },
    latestParenting: {
      label: latestSession?.topic ?? '',
      detail: latestSession
        ? `${formatRegisterDate(latestSession.sessionDate)} · ${latestSession.topic}`
        : '',
      hasRecord: Boolean(latestSession),
    },
    committeeActiveCount: committeeList.data?.total ?? 0,
    activeCaregiversCount: activeCaregivers,
    latestSupport: {
      label: latestSupport?.description ?? '',
      detail: latestSupport
        ? `${formatRegisterDate(latestSupport.receivedDate)} · ${formatSupportCategory(latestSupport.supportCategory)}`
        : '',
      hasRecord: Boolean(latestSupport),
    },
    latestVisitor: {
      label: latestVisit?.visitorName ?? '',
      detail: latestVisit
        ? `${formatRegisterDate(latestVisit.visitDate)} · ${latestVisit.visitorName}`
        : '',
      hasRecord: Boolean(latestVisit),
    },
    trainingCoverage: {
      percent: formatRegisterPercent(coverageRate),
      detail: `${formatRegisterCount(trainedUserIds.size)} kuri ${formatRegisterCount(activeCaregivers)}`,
      trainedCount: trainedUserIds.size,
      totalCaregivers: activeCaregivers,
    },
  }
}
