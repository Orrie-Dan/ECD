export type UserRole = 'caretaker' | 'districtOfficer'

export interface User {
  id: string
  name: string
  role: UserRole
  centerName?: string
  districtName?: string
}

export type Gender = 'Umuhungu' | 'Umukobwa'

export type GuardianRelation =
  | 'umubyeyi_mama'
  | 'umubyeyi_papa'
  | 'sekuru_nyirakuru'
  | 'nyirasenge_marume'
  | 'umuvandimwe'
  | 'umubyeyi_urera'
  | 'umurinzi_wemewe'
  | 'ikindi'

export type BroughtBy = GuardianRelation

export interface Child {
  id: string
  fullName: string
  dateOfBirth: string
  gender: Gender
  specialNeeds?: string
  guardianName: string
  guardianPhone: string
  guardianRelation: GuardianRelation
  guardian2Name?: string
  guardian2Phone?: string
  guardian2Relation?: GuardianRelation
  province: string
  district: string
  sector: string
  cell: string
  village: string
  registeredAt: string
}

export interface AttendanceRecord {
  id: string
  childId: string
  date: string
  present: boolean
  broughtBy?: BroughtBy
  broughtByOther?: string
  arrivedAt?: string
}

export interface PageParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const DEFAULT_PAGE_SIZE = 10

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

export interface ChildRegistrationForm {
  fullName: string
  dateOfBirth: string
  gender: Gender | ''
  specialNeeds: string
  guardianName: string
  guardianPhone: string
  guardianRelation: GuardianRelation | ''
  guardian2Name: string
  guardian2Phone: string
  guardian2Relation: GuardianRelation | ''
  province: string
  district: string
  sector: string
  cell: string
  village: string
}
