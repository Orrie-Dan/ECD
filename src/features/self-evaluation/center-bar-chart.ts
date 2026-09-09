import { RANK_CHART_COLORS } from '@/features/self-evaluation/scoring'
import type { ComplianceRankId } from '@/features/self-evaluation/types'
import type { MonitoringComplianceCenterItemViewModel } from '@/models/monitoring'

export type SelfEvalCenterBarRow = {
  name: string
  centerName: string
  percent: number
  rank: string
  color: string
  assessmentId: string
  centerId: string
}

function truncateLabel(value: string, max = 18): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export function buildSelfEvalCenterBarData(
  items: MonitoringComplianceCenterItemViewModel[] | undefined,
): SelfEvalCenterBarRow[] {
  if (!items?.length) return []
  return items
    .filter((item) => item.percent != null && Number.isFinite(item.percent))
    .map((item) => {
      const rank = (item.rank ?? 'red') as ComplianceRankId
      const color =
        RANK_CHART_COLORS[rank] ?? RANK_CHART_COLORS.red
      return {
        name: truncateLabel(item.centerName),
        centerName: item.centerName,
        percent: Number(item.percent),
        rank,
        color,
        assessmentId: item.assessmentId,
        centerId: item.centerId,
      }
    })
}
