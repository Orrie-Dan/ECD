import type { AttendanceRecord, Child } from '@/types'

export const MOCK_CHILDREN: Child[] = [
  {
    id: '1',
    fullName: 'Jean Claude Mukamana',
    dateOfBirth: '2021-03-15',
    gender: 'Umuhungu',
    guardianName: 'Mukamana Alice',
    guardianPhone: '0788123456',
    guardianRelation: 'umubyeyi_mama',
    guardian2Name: 'Mukamana Jean',
    guardian2Phone: '0788998877',
    guardian2Relation: 'umubyeyi_papa',
    specialNeeds: 'Imirire mibi — akeneye kwita cyane ku biribwa',
    province: 'Umujyi wa Kigali',
    district: 'Gasabo',
    sector: 'Remera',
    cell: 'Rukiri I',
    village: 'Kinunga',
    registeredAt: '2025-09-01',
  },
  {
    id: '2',
    fullName: 'Marie Claire Uwase',
    dateOfBirth: '2020-07-22',
    gender: 'Umukobwa',
    guardianName: 'Uwase Beatrice',
    guardianPhone: '0789234567',
    guardianRelation: 'umubyeyi_mama',
    province: 'Umujyi wa Kigali',
    district: 'Gasabo',
    sector: 'Remera',
    cell: 'Rukiri II',
    village: 'Amahoro',
    registeredAt: '2025-08-15',
  },
  {
    id: '3',
    fullName: 'Emmanuel Nshimiyimana',
    dateOfBirth: '2022-01-10',
    gender: 'Umuhungu',
    guardianName: 'Nshimiyimana Pierre',
    guardianPhone: '0787345678',
    guardianRelation: 'umubyeyi_papa',
    province: 'Umujyi wa Kigali',
    district: 'Gasabo',
    sector: 'Gatsata',
    cell: 'Karuruma',
    village: 'Akamamana',
    registeredAt: '2025-10-20',
  },
  {
    id: '4',
    fullName: 'Divine Ishimwe',
    dateOfBirth: '2021-11-05',
    gender: 'Umukobwa',
    guardianName: 'Ishimwe Grace',
    guardianPhone: '0786456789',
    guardianRelation: 'umubyeyi_mama',
    province: 'Umujyi wa Kigali',
    district: 'Kicukiro',
    sector: 'Kanombe',
    cell: 'Kabeza',
    village: 'Amahoro',
    registeredAt: '2025-07-10',
  },
  {
    id: '5',
    fullName: 'Kevin Habimana',
    dateOfBirth: '2019-12-18',
    gender: 'Umuhungu',
    guardianName: 'Habimana Eric',
    guardianPhone: '0785567890',
    guardianRelation: 'umubyeyi_papa',
    province: 'Umujyi wa Kigali',
    district: 'Gasabo',
    sector: 'Remera',
    cell: 'Rukiri II',
    village: 'Amahoro',
    registeredAt: '2025-06-01',
  },
]

export const MOCK_ATTENDANCE: AttendanceRecord[] = (() => {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  return [
    { id: 'a1', childId: '1', date: today, present: true, broughtBy: 'umubyeyi_mama', arrivedAt: '2026-06-17T08:15:00' },
    { id: 'a2', childId: '2', date: today, present: true, broughtBy: 'umubyeyi_mama', arrivedAt: '2026-06-17T08:18:00' },
    { id: 'a3', childId: '3', date: today, present: false },
    { id: 'a4', childId: '1', date: yesterdayStr, present: true, broughtBy: 'umubyeyi_papa', arrivedAt: '2026-06-21T08:10:00' },
    { id: 'a5', childId: '2', date: yesterdayStr, present: true, broughtBy: 'umubyeyi_mama', arrivedAt: '2026-06-21T08:22:00' },
    { id: 'a6', childId: '3', date: yesterdayStr, present: true, broughtBy: 'umubyeyi_papa', arrivedAt: '2026-06-21T08:30:00' },
    { id: 'a7', childId: '4', date: yesterdayStr, present: false },
    { id: 'a8', childId: '5', date: yesterdayStr, present: true, broughtBy: 'umubyeyi_papa', arrivedAt: '2026-06-21T08:45:00' },
  ]
})()

export const DISTRICT_STATS = {
  totalChildren: 12450,
  presentToday: 9200,
  ecdCenters: 340,
  attendanceRate: 74,
}

export const ECD_CENTERS = [
  { id: 'c1', name: 'Ikigo cya ECD Remera', sector: 'Remera', children: 45, caretaker: 'Uwimana Marie', attendance: 82 },
  { id: 'c2', name: 'Ikigo cya ECD Gatsata', sector: 'Gatsata', children: 38, caretaker: 'Mukeshimana Jean', attendance: 76 },
  { id: 'c3', name: 'Ikigo cya ECD Kanombe', sector: 'Kanombe', children: 52, caretaker: 'Nyirahabimana Alice', attendance: 88 },
  { id: 'c4', name: 'Ikigo cya ECD Kimisagara', sector: 'Kimisagara', children: 41, caretaker: 'Habimana Claude', attendance: 65 },
  { id: 'c5', name: 'Ikigo cya ECD Kabeza', sector: 'Kabeza', children: 33, caretaker: 'Uwase Divine', attendance: 71 },
  { id: 'c6', name: 'Ikigo cya ECD Ndera', sector: 'Ndera', children: 29, caretaker: 'Niyonsaba Eric', attendance: 58 },
]

export const LOW_ATTENDANCE_AREAS = [
  { sector: 'Ndera', rate: 58, centers: 12 },
  { sector: 'Kimisagara', rate: 65, centers: 18 },
  { sector: 'Masaka', rate: 62, centers: 15 },
]

export function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('rw-RW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
