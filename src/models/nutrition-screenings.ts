/**
 * District operational nutrition screening list (GET /nutrition/screenings).
 */
import type { NutritionStatus } from '@/types'

export interface NutritionScreeningListFilters {
  centerId?: string
  childId?: string
  from?: string
  to?: string
  nutritionStatus?: NutritionStatus
  page?: number
  pageSize?: number
}

export interface NutritionScreeningListItemViewModel {
  id: string
  childId: string
  childFullName: string
  childDateOfBirth: string
  childGender: 'male' | 'female'
  centerId: string
  centerName: string
  screeningDate: string
  weightKg: number
  muacCm: number
  heightCm: number | null
  headCircumferenceCm: number | null
  nutritionStatus: NutritionStatus
  requiresReferral: boolean
  recordedById: string
  version: number
  createdAt: string
}

export interface NutritionScreeningListResult {
  items: NutritionScreeningListItemViewModel[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
