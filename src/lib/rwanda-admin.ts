/**
 * Rwanda administrative locations (Province → District → Sector → Cell → Village).
 * Source: https://github.com/ngabovictor/Rwanda
 */
import rwandaLocations from '@/data/rwanda-locations.json'

export type RwandaLocationData = Record<
  string,
  Record<string, Record<string, Record<string, string[]>>>
>

const locations = rwandaLocations as RwandaLocationData

/** Kinyarwanda display labels for province keys in the dataset. */
export const PROVINCE_LABELS: Record<string, string> = {
  East: 'Iburasirazuba',
  Kigali: 'Umujyi wa Kigali',
  North: 'Amajyaruguru',
  South: 'Amajyepfo',
  West: 'Iburengerazuba',
}

const PROVINCE_ORDER = ['Kigali', 'East', 'North', 'South', 'West'] as const

export const PROVINCES = PROVINCE_ORDER.filter((key) => key in locations).map((id) => ({
  id,
  name: PROVINCE_LABELS[id] ?? id,
}))

function sortNames(names: string[]): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, 'rw'))
}

export function getProvinceDisplayName(provinceKey: string): string {
  return PROVINCE_LABELS[provinceKey] ?? provinceKey
}

/** Resolve province form key from a stored display name (e.g. "Umujyi wa Kigali" → "Kigali"). */
export function getProvinceKeyFromDisplayName(displayName: string): string {
  const entry = Object.entries(PROVINCE_LABELS).find(([, label]) => label === displayName)
  if (entry) return entry[0]
  if (displayName in locations) return displayName
  return displayName
}

export function getDistricts(province: string): string[] {
  if (!province || !locations[province]) return []
  return sortNames(Object.keys(locations[province]))
}

export function getSectors(province: string, district: string): string[] {
  if (!province || !district) return []
  return sortNames(Object.keys(locations[province]?.[district] ?? {}))
}

export function getCells(province: string, district: string, sector: string): string[] {
  if (!province || !district || !sector) return []
  return sortNames(Object.keys(locations[province]?.[district]?.[sector] ?? {}))
}

export function getVillages(
  province: string,
  district: string,
  sector: string,
  cell: string,
): string[] {
  if (!province || !district || !sector || !cell) return []
  return sortNames(locations[province]?.[district]?.[sector]?.[cell] ?? [])
}

export function toLocationOptions(names: string[]) {
  return names.map((name) => ({ value: name, label: name }))
}

/** All districts grouped by province key, in display order. */
export function getDistrictsByProvince(): Array<{
  provinceKey: string
  provinceName: string
  districts: string[]
}> {
  return PROVINCES.map((province) => ({
    provinceKey: province.id,
    provinceName: province.name,
    districts: getDistricts(province.id),
  }))
}

/** Resolve which province a district name belongs to (case-insensitive). */
export function getProvinceKeyForDistrict(districtName: string): string | null {
  const needle = districtName.trim().toLowerCase()
  if (!needle) return null
  for (const province of PROVINCES) {
    const match = getDistricts(province.id).find((name) => name.toLowerCase() === needle)
    if (match) return province.id
  }
  return null
}

/**
 * Best-effort sector lookup from a village name within a district.
 * Used when center DTOs expose villageName but not sectorId.
 */
export function findSectorForVillage(
  districtName: string,
  villageName: string,
): string | null {
  const provinceKey = getProvinceKeyForDistrict(districtName)
  if (!provinceKey || !villageName.trim()) return null
  const villageNeedle = villageName.trim().toLowerCase()
  const districtKey =
    getDistricts(provinceKey).find((name) => name.toLowerCase() === districtName.trim().toLowerCase()) ??
    districtName
  for (const sector of getSectors(provinceKey, districtKey)) {
    for (const cell of getCells(provinceKey, districtKey, sector)) {
      const hit = getVillages(provinceKey, districtKey, sector, cell).find(
        (village) => village.toLowerCase() === villageNeedle,
      )
      if (hit) return sector
    }
  }
  return null
}
