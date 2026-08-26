/**
 * Parent contributions (Section VIII) — UI view models.
 * Backend: GET/POST /api/v1/contributions, GET /api/v1/contributions/summary
 */

export type ParentContributionType = 'cash' | 'in_kind'

export type InKindItemType =
  | 'flour'
  | 'potatoes'
  | 'maize'
  | 'milk'
  | 'firewood'
  | 'other'

export interface ParentContributionViewModel {
  id: string
  centerId: string
  centerName: string
  districtId: string
  childId: string | null
  contributorName: string
  contributorPhone: string | null
  /** ISO date YYYY-MM-DD */
  contributionDate: string
  contributionType: ParentContributionType
  amount: number | null
  itemType: InKindItemType | null
  quantity: number | null
  unit: string | null
  description: string | null
  notes: string | null
  recordedById: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface ParentContributionListResult {
  items: ParentContributionViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Authoritative period totals from GET /contributions/summary.
 * Do not recompute these from the list page in the browser.
 */
export interface ParentContributionSummaryViewModel {
  centerId: string
  from: string | null
  to: string | null
  cashContributorCount: number
  cashAmountTotal: number
  inKindContributorCount: number
  cashRecordCount: number
  inKindRecordCount: number
}

export interface ParentContributionListFilters {
  centerId?: string
  districtId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
  /** Client-side list filter — API list has no contributionType query yet. */
  contributionType?: ParentContributionType | 'all'
}

export interface CreateParentContributionInput {
  centerId: string
  childId?: string
  contributorName: string
  contributorPhone?: string
  contributionDate: string
  contributionType: ParentContributionType
  amount?: number
  itemType?: InKindItemType
  quantity?: number
  unit?: string
  description?: string
  notes?: string
}

export interface UpdateParentContributionInput {
  version: number
  contributorName?: string
  contributorPhone?: string | null
  contributionType?: ParentContributionType
  amount?: number | null
  itemType?: InKindItemType | null
  quantity?: number | null
  unit?: string | null
  description?: string | null
  notes?: string | null
}
