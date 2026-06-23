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
