/**
 * Children resource layer — wraps generated OpenAPI client + mappers.
 * Feature hooks import from here; UI never imports Child*Dto types.
 */
import {
  childrenControllerArchive,
  childrenControllerCreate,
  childrenControllerFindAll,
  childrenControllerFindOne,
  childrenControllerReactivate,
  childrenControllerUpdate,
} from '@/api/generated/endpoints/children/children'
import { transfersControllerCreate } from '@/api/generated/endpoints/transfers/transfers'
import {
  geoControllerListAdminUnits,
  geoControllerListDistricts,
} from '@/api/generated/endpoints/geo/geo'
import type { CreateChildDto, UpdateChildDto } from '@/api/generated/models'
import {
  mapArchiveInputToDto,
  mapChildDetailToViewModel,
  mapFormToCreateChildDto,
  mapPaginatedChildrenToViewModel,
  mapReactivateToDto,
  mapChildPatchToUpdateDto,
  mapTransferInputToDto,
} from '@/api/mappers/child.mapper'
import type { ChildrenListFilters, ChildrenListResult, ChildViewModel } from '@/models/child'
import type {
  ArchiveChildInput,
  Child,
  ChildRegistrationForm,
  TransferChildInput,
} from '@/types'

export async function fetchChildrenList(
  filters: ChildrenListFilters = {},
): Promise<ChildrenListResult> {
  const pageSize = Math.min(Math.max(1, filters.pageSize ?? 20), 100)
  const dto = await childrenControllerFindAll({
    centerId: filters.centerId,
    districtId: filters.districtId,
    status: filters.status,
    search: filters.search?.trim() || undefined,
    page: filters.page ?? 1,
    pageSize,
  })
  return mapPaginatedChildrenToViewModel(dto)
}

/** Bounded child count via DB `total` — pageSize=1 keeps payload tiny. */
export async function fetchChildrenTotal(
  filters: Omit<ChildrenListFilters, 'page' | 'pageSize'> = {},
): Promise<number> {
  const result = await fetchChildrenList({ ...filters, page: 1, pageSize: 1 })
  return result.total
}

export async function fetchChildDetail(id: string): Promise<ChildViewModel> {
  const dto = await childrenControllerFindOne(id)
  return mapChildDetailToViewModel(dto)
}

export async function createChildRequest(
  form: ChildRegistrationForm,
  options: {
    centerId: string
    homeVillageId: string
    classroomId?: string
  },
): Promise<ChildViewModel> {
  const body: CreateChildDto = mapFormToCreateChildDto(form, options)
  const dto = await childrenControllerCreate(body)
  return mapChildDetailToViewModel(dto)
}

export async function updateChildRequest(
  child: ChildViewModel,
  patch: Partial<Child>,
): Promise<ChildViewModel> {
  const body: UpdateChildDto = mapChildPatchToUpdateDto(child, patch)
  const dto = await childrenControllerUpdate(child.id, body)
  return mapChildDetailToViewModel(dto)
}

export async function archiveChildRequest(
  child: ChildViewModel,
  input: ArchiveChildInput,
): Promise<ChildViewModel> {
  const dto = await childrenControllerArchive(child.id, mapArchiveInputToDto(child, input))
  return mapChildDetailToViewModel(dto)
}

export async function reactivateChildRequest(child: ChildViewModel): Promise<ChildViewModel> {
  const dto = await childrenControllerReactivate(child.id, mapReactivateToDto(child))
  return mapChildDetailToViewModel(dto)
}

export async function transferChildRequest(
  child: ChildViewModel,
  input: TransferChildInput,
): Promise<ChildViewModel> {
  await transfersControllerCreate(mapTransferInputToDto(child, input))
  return fetchChildDetail(child.id)
}

function matchName<T extends { name: string }>(items: T[], name: string): T | undefined {
  const needle = name.trim().toLowerCase()
  return items.find((u) => u.name.toLowerCase() === needle)
}

function matchNames<T extends { name: string }>(items: T[], name: string): T[] {
  const needle = name.trim().toLowerCase()
  return items.filter((u) => u.name.toLowerCase() === needle)
}

type VillageLocation = {
  district: string
  sector: string
  cell: string
  village: string
}

/** Walk sector → cell → village. Cells/villages must not send districtId (LIVE rows are often null). */
async function resolveVillageUnderSector(
  sectorId: string,
  location: VillageLocation,
): Promise<{ villageId: string } | { missing: 'cell' | 'village' }> {
  const cells = await geoControllerListAdminUnits({
    level: 'cell',
    parentId: sectorId,
  })
  const cell = matchName(cells, location.cell)
  if (!cell) return { missing: 'cell' }

  const villages = await geoControllerListAdminUnits({
    level: 'village',
    parentId: cell.id,
  })
  const village = matchName(villages, location.village)
  if (!village) return { missing: 'village' }
  return { villageId: village.id }
}

/**
 * Caregiver GET /districts is scoped to the centre's district, but a child may live
 * in another district. Fall back to the unscoped sector catalogue and match the
 * sector/cell/village names.
 */
async function resolveVillageOutsideScopedDistrict(location: VillageLocation): Promise<string> {
  let sectors: Awaited<ReturnType<typeof geoControllerListAdminUnits>>
  try {
    sectors = await geoControllerListAdminUnits({ level: 'sector' })
  } catch {
    throw new Error(`District not found: ${location.district}`)
  }
  const namedSectors = matchNames(sectors, location.sector)
  if (namedSectors.length === 0) {
    throw new Error(`District not found: ${location.district}`)
  }

  let sawCell = false
  for (const sector of namedSectors) {
    const result = await resolveVillageUnderSector(sector.id, location)
    if ('villageId' in result) return result.villageId
    if (result.missing === 'village') sawCell = true
  }

  if (sawCell) throw new Error(`Village not found: ${location.village}`)
  throw new Error(`Cell not found: ${location.cell}`)
}

/**
 * Resolve a village admin-unit UUID from cascade names.
 * Home address is independent of the centre's district — children may attend a
 * school in a different district than they reside in.
 */
export async function resolveHomeVillageId(location: VillageLocation): Promise<string> {
  const districtsPage = await geoControllerListDistricts({
    search: location.district.trim(),
    page: 1,
    pageSize: 50,
  })
  const district = matchName(districtsPage.items, location.district)

  if (district) {
    const sectors = await geoControllerListAdminUnits({
      level: 'sector',
      districtId: district.id,
    })
    const sector = matchName(sectors, location.sector)
    if (!sector) {
      throw new Error(`Sector not found: ${location.sector}`)
    }
    const result = await resolveVillageUnderSector(sector.id, location)
    if ('villageId' in result) return result.villageId
    if (result.missing === 'cell') throw new Error(`Cell not found: ${location.cell}`)
    throw new Error(`Village not found: ${location.village}`)
  }

  return resolveVillageOutsideScopedDistrict(location)
}
