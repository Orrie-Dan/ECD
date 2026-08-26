import type { DistrictGrowthChildRow } from '@/lib/nutrition-utils'
import type { NutritionScreeningListItemViewModel } from '@/models/nutrition-screenings'
import type { GrowthMeasurement } from '@/types'
import { getLatestMeasurement } from '@/lib/nutrition-utils'
import { district } from '@/locales/rw/district'
import {
  assessmentDueExportLabel,
  nutritionStatusExportLabel,
} from './labels'
import type { ScopedMonitoringExportInput } from './types'

export interface DistrictGrowthExportRow {
  childName: string
  centerName: string
  measurementDate: string | null
  weightKg: number | null
  muacCm: number | null
  nutritionStatusLabel: string
  measurementStatusLabel: string
  age: number | null
}

export interface DistrictGrowthExportDataset {
  input: ScopedMonitoringExportInput
  rows: DistrictGrowthExportRow[]
  partial?: boolean
  partialNote?: string
}

export function mapScreeningItemToGrowthExportRow(
  item: NutritionScreeningListItemViewModel,
  age?: number,
): DistrictGrowthExportRow {
  return {
    childName: item.childFullName,
    centerName: item.centerName,
    measurementDate: item.screeningDate,
    weightKg: item.weightKg,
    muacCm: item.muacCm,
    nutritionStatusLabel: nutritionStatusExportLabel(item.nutritionStatus),
    measurementStatusLabel: district.growth.assessed,
    age: age ?? null,
  }
}

export function mapGrowthChildRowToExportRow(
  row: DistrictGrowthChildRow,
  latestMeasurement?: GrowthMeasurement,
): DistrictGrowthExportRow {
  return {
    childName: row.fullName,
    centerName: row.centerName,
    measurementDate: row.lastScreeningDate ?? null,
    weightKg: latestMeasurement?.weightKg ?? null,
    muacCm: latestMeasurement?.muacCm ?? null,
    nutritionStatusLabel: nutritionStatusExportLabel(row.nutritionStatus),
    measurementStatusLabel: assessmentDueExportLabel(row.dueStatus),
    age: row.age,
  }
}

export function mapGrowthChildRowsToExportRows(
  rows: DistrictGrowthChildRow[],
  measurements: GrowthMeasurement[],
): DistrictGrowthExportRow[] {
  return rows.map((row) =>
    mapGrowthChildRowToExportRow(row, getLatestMeasurement(measurements, row.childId)),
  )
}

export function districtGrowthExportAvailable(rows: DistrictGrowthExportRow[]): boolean {
  return rows.length > 0
}

export function districtGrowthFilenamePrefix(): string {
  return 'imikurire'
}

export function districtGrowthTitle(): string {
  return district.growth.title
}
