import type {
  BalancedMealComposition,
  CenterFeedingDay,
  CenterFeedingMonthSummary,
} from '@/types'

/**
 * UI-facing daily feeding (Form VI / Imirire) model.
 * Extends `CenterFeedingDay` with API optimistic-lock + warnings.
 * Components continue to consume `CenterFeedingDay` via DataProvider.
 */
export interface FeedingDayViewModel extends CenterFeedingDay {
  /** Optimistic-lock version from the API (required for LIVE update). */
  version: number
  /** Non-blocking backend warnings (e.g. incomplete food groups). */
  warnings?: string[]
  recordedAt?: string
}

/**
 * UI-facing monthly feeding summary (liters / flour / source).
 * Day counts are NOT stored here — they are derived from daily records.
 */
export interface FeedingMonthSummaryViewModel extends CenterFeedingMonthSummary {
  /** Optimistic-lock version from the API (required for LIVE update). */
  version: number
}

export interface FeedingDayListResult {
  items: FeedingDayViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface FeedingMonthSummaryListResult {
  items: FeedingMonthSummaryViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * List filters for center feeding days.
 * Backend currently supports page/pageSize only — date/yearMonth are
 * applied client-side after fetch (see API gap report).
 */
export interface FeedingDayListFilters {
  centerId: string
  page?: number
  pageSize?: number
  /** Client-side filter only (API has no date params yet). */
  yearMonth?: string
  startDate?: string
  endDate?: string
}

export interface FeedingMonthSummaryListFilters {
  centerId: string
  page?: number
  pageSize?: number
  /** Client-side filter only (API has no yearMonth query param yet). */
  yearMonth?: string
}

/** Six Form VI food-group field keys (API values — not presentation labels). */
export type FoodGroupValue = keyof BalancedMealComposition

export type FeedingDayUpsertInput = {
  centerId: string
  date: string
  milkServed: boolean
  porridgeServed: boolean
  balancedMealServed: boolean
  composition?: BalancedMealComposition
  recordedBy?: string
  version?: number
  deviceId?: string
}

export type FeedingMonthSummaryUpsertInput = {
  centerId: string
  yearMonth: string
  milkLiters: number
  flourKg: number
  foodSource: string
  updatedBy?: string
  version?: number
  deviceId?: string
}
