import type {
  BalancedMealComposition,
  CenterFeedingDay,
  CenterFeedingMonthSummary,
} from '@/types'
import { getTodayDate } from '@/lib/nutrition-utils'

export const FOOD_GROUP_KEYS: (keyof BalancedMealComposition)[] = [
  'cerealsOrTubers',
  'legumes',
  'dairy',
  'animalProducts',
  'fruitsVegetables',
  'addedFat',
]

export function emptyComposition(): BalancedMealComposition {
  return {
    cerealsOrTubers: false,
    legumes: false,
    dairy: false,
    animalProducts: false,
    fruitsVegetables: false,
    addedFat: false,
  }
}

export function completeComposition(): BalancedMealComposition {
  return {
    cerealsOrTubers: true,
    legumes: true,
    dairy: true,
    animalProducts: true,
    fruitsVegetables: true,
    addedFat: true,
  }
}

export function isBalancedComposition(composition?: BalancedMealComposition): boolean {
  if (!composition) return false
  return FOOD_GROUP_KEYS.every((key) => composition[key])
}

export function hasAnyFoodGroup(composition?: BalancedMealComposition): boolean {
  if (!composition) return false
  return FOOD_GROUP_KEYS.some((key) => composition[key])
}

export function getFeedingDay(
  days: CenterFeedingDay[],
  centerId: string,
  date: string,
): CenterFeedingDay | undefined {
  return days.find((d) => d.centerId === centerId && d.date === date)
}

export function getFeedingDaysForMonth(
  days: CenterFeedingDay[],
  centerId: string,
  yearMonth: string,
): CenterFeedingDay[] {
  return days.filter((d) => d.centerId === centerId && d.date.startsWith(yearMonth))
}

export interface FeedingDayCounts {
  milkDays: number
  porridgeDays: number
  balancedDays: number
}

export function computeFeedingDayCounts(days: CenterFeedingDay[]): FeedingDayCounts {
  return {
    milkDays: days.filter((d) => d.milkServed).length,
    porridgeDays: days.filter((d) => d.porridgeServed).length,
    balancedDays: days.filter((d) => d.balancedMealServed).length,
  }
}

export function getMonthSummary(
  summaries: CenterFeedingMonthSummary[],
  centerId: string,
  yearMonth: string,
): CenterFeedingMonthSummary | undefined {
  return summaries.find((s) => s.centerId === centerId && s.yearMonth === yearMonth)
}

export function getCurrentYearMonth(today = getTodayDate()): string {
  return today.slice(0, 7)
}

export function daysInYearMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export interface CenterFeedingComparison {
  centerId: string
  centerName: string
  sector: string
  milkDays: number
  porridgeDays: number
  balancedDays: number
  hasSummary: boolean
  milkLiters: number
  flourKg: number
  foodSource: string
}

export function computeCenterFeedingComparison(
  centers: { id: string; name: string; sector: string }[],
  days: CenterFeedingDay[],
  summaries: CenterFeedingMonthSummary[],
  yearMonth: string,
): CenterFeedingComparison[] {
  return centers.map((center) => {
    const monthDays = getFeedingDaysForMonth(days, center.id, yearMonth)
    const counts = computeFeedingDayCounts(monthDays)
    const summary = getMonthSummary(summaries, center.id, yearMonth)
    return {
      centerId: center.id,
      centerName: center.name,
      sector: center.sector,
      milkDays: counts.milkDays,
      porridgeDays: counts.porridgeDays,
      balancedDays: counts.balancedDays,
      hasSummary: !!summary,
      milkLiters: summary?.milkLiters ?? 0,
      flourKg: summary?.flourKg ?? 0,
      foodSource: summary?.foodSource ?? '',
    }
  })
}

export function computeFeedingDistrictSummary(
  comparisons: CenterFeedingComparison[],
): {
  centersReporting: number
  totalCenters: number
  completenessRate: number
  avgMilkDays: number
  avgPorridgeDays: number
  avgBalancedDays: number
} {
  const totalCenters = comparisons.length
  const centersReporting = comparisons.filter(
    (c) => c.milkDays + c.porridgeDays + c.balancedDays > 0 || c.hasSummary,
  ).length
  const withActivity = comparisons.filter(
    (c) => c.milkDays + c.porridgeDays + c.balancedDays > 0,
  )
  const n = withActivity.length || 1
  return {
    centersReporting,
    totalCenters,
    completenessRate: totalCenters === 0 ? 0 : Math.round((centersReporting / totalCenters) * 100),
    avgMilkDays: Math.round(withActivity.reduce((s, c) => s + c.milkDays, 0) / n),
    avgPorridgeDays: Math.round(withActivity.reduce((s, c) => s + c.porridgeDays, 0) / n),
    avgBalancedDays: Math.round(withActivity.reduce((s, c) => s + c.balancedDays, 0) / n),
  }
}
