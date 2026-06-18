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
  | 'mama'
  | 'papa'
  | 'umuvandimwe'
  | 'umuturanyi'
  | 'undi'

export type BroughtBy = GuardianRelation

export interface Child {
  id: string
  fullName: string
  dateOfBirth: string
  gender: Gender
  guardianName: string
  guardianPhone: string
  guardianRelation: GuardianRelation
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

export interface ChildRegistrationForm {
  fullName: string
  dateOfBirth: string
  gender: Gender | ''
  guardianName: string
  guardianPhone: string
  guardianRelation: GuardianRelation | ''
  province: string
  district: string
  sector: string
  cell: string
  village: string
}
