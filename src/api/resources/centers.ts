import {
  centersControllerFindAll,
  centersControllerFindOne,
} from '@/api/generated/endpoints/centers/centers'
import type { CenterResponseDto } from '@/api/generated/models'

/** UI-facing center option — no DTO leakage into components. */
export interface CenterDirectoryItem {
  id: string
  name: string
  code: string
  districtId: string
  districtName: string | null
  villageName: string | null
  status: string
  activeChildrenCount: number
  latitude: number | null
  longitude: number | null
}

function mapCenter(dto: CenterResponseDto): CenterDirectoryItem {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    districtId: dto.districtId,
    districtName: dto.districtName,
    villageName: dto.villageName,
    status: dto.status,
    activeChildrenCount: dto.activeChildrenCount,
    latitude: dto.latitude,
    longitude: dto.longitude,
  }
}

export async function listCentersDirectory(params?: {
  districtId?: string
  search?: string
  page?: number
  pageSize?: number
}): Promise<{ items: CenterDirectoryItem[]; total: number }> {
  const page = await centersControllerFindAll({
    districtId: params?.districtId,
    search: params?.search,
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 100,
  })
  return {
    items: page.items.map(mapCenter),
    total: page.total,
  }
}

export async function getCenterDirectoryItem(id: string): Promise<CenterDirectoryItem> {
  const dto = await centersControllerFindOne(id)
  return mapCenter(dto)
}
