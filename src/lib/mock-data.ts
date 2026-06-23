import type { AttendanceRecord, BroughtBy, Child, GuardianRelation } from '@/types'

/** Hand-crafted seed records kept for demos and stable deep links (ids 1–5). */
const SEED_CHILDREN: Child[] = [
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

const BOY_NAMES = [
  'Jean', 'Emmanuel', 'Kevin', 'Eric', 'Patrick', 'Moise', 'David', 'Samuel',
  'Israel', 'Brian', 'Fabrice', 'Cedric', 'Olivier', 'Thierry', 'Donatien',
  'Innocent', 'Pacifique', 'Aimable', 'Bosco', 'Didier',
]

const GIRL_NAMES = [
  'Marie', 'Divine', 'Alice', 'Grace', 'Claire', 'Esperance', 'Sandrine', 'Diane',
  'Yvonne', 'Chantal', 'Vestine', 'Consolee', 'Immaculee', 'Jeanne', 'Betty',
  'Ange', 'Delphine', 'Gloria', 'Honorine', 'Josiane',
]

const SURNAMES = [
  'Mukamana', 'Uwase', 'Nshimiyimana', 'Ishimwe', 'Habimana', 'Nyiransengimana',
  'Mugisha', 'Niyonsaba', 'Uwimana', 'Mukeshimana', 'Nyirahabimana', 'Habiyaremye',
  'Munyaneza', 'Bizimana', 'Niyonzima', 'Uwizeyimana', 'Mbarushimana', 'Niyigena',
  'Hategekimana', 'Niyitegeka', 'Murekatete', 'Uwamahoro', 'Niyomugabo', 'Mugwaneza',
]

const LOCATIONS: Array<Pick<Child, 'province' | 'district' | 'sector' | 'cell' | 'village'>> = [
  { province: 'Umujyi wa Kigali', district: 'Gasabo', sector: 'Remera', cell: 'Rukiri I', village: 'Kinunga' },
  { province: 'Umujyi wa Kigali', district: 'Gasabo', sector: 'Remera', cell: 'Rukiri II', village: 'Amahoro' },
  { province: 'Umujyi wa Kigali', district: 'Gasabo', sector: 'Remera', cell: 'Nyarutarama', village: 'Gihogere' },
  { province: 'Umujyi wa Kigali', district: 'Gasabo', sector: 'Gatsata', cell: 'Karuruma', village: 'Akamamana' },
  { province: 'Umujyi wa Kigali', district: 'Gasabo', sector: 'Gatsata', cell: 'Nyabisindu', village: 'Cyimana' },
  { province: 'Umujyi wa Kigali', district: 'Gasabo', sector: 'Ndera', cell: 'Rusororo', village: 'Kagugu' },
  { province: 'Umujyi wa Kigali', district: 'Gasabo', sector: 'Ndera', cell: 'Nduba', village: 'Kamashashi' },
  { province: 'Umujyi wa Kigali', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kamatamu', village: 'Ubumwe' },
  { province: 'Umujyi wa Kigali', district: 'Gasabo', sector: 'Kimironko', cell: 'Bibare', village: 'Nyagatovu' },
  { province: 'Umujyi wa Kigali', district: 'Gasabo', sector: 'Gisozi', cell: 'Muhororo', village: 'Kamuhoza' },
  { province: 'Umujyi wa Kigali', district: 'Gasabo', sector: 'Bumbogo', cell: 'Bumbogo', village: 'Nyacyonga' },
  { province: 'Umujyi wa Kigali', district: 'Gasabo', sector: 'Jali', cell: 'Agateko', village: 'Rugarama' },
  { province: 'Umujyi wa Kigali', district: 'Kicukiro', sector: 'Kanombe', cell: 'Kabeza', village: 'Amahoro' },
  { province: 'Umujyi wa Kigali', district: 'Kicukiro', sector: 'Kanombe', cell: 'Busanza', village: 'Kinyinya' },
  { province: 'Umujyi wa Kigali', district: 'Kicukiro', sector: 'Kimisagara', cell: 'Nyagatovu', village: 'Gakoni' },
  { province: 'Umujyi wa Kigali', district: 'Kicukiro', sector: 'Kicukiro', cell: 'Gatenga', village: 'Nyarurama' },
  { province: 'Umujyi wa Kigali', district: 'Kicukiro', sector: 'Niboye', cell: 'Niboye', village: 'Kamashashi' },
  { province: 'Umujyi wa Kigali', district: 'Kicukiro', sector: 'Gahanga', cell: 'Karembure', village: 'Murambi' },
]

const GUARDIAN_RELATIONS: GuardianRelation[] = [
  'umubyeyi_mama',
  'umubyeyi_papa',
  'sekuru_nyirakuru',
  'nyirasenge_marume',
  'umuvandimwe',
  'umubyeyi_urera',
]

const BROUGHT_BY_OPTIONS: BroughtBy[] = [
  'umubyeyi_mama',
  'umubyeyi_papa',
  'sekuru_nyirakuru',
  'nyirasenge_marume',
  'umuvandimwe',
]

const SPECIAL_NEEDS_SAMPLES = [
  undefined,
  undefined,
  undefined,
  undefined,
  'Imirire mibi — akeneye kwita cyane ku biribwa',
  'Ubumuga bwo kumva — akeneye ubufasha mu itumanaho',
  'Imirire mibi',
]

const MOCK_CHILD_COUNT = 100
const ATTENDANCE_HISTORY_DAYS = 20

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length]
}

function padPhone(index: number): string {
  return `078${String(1000000 + index).slice(-7)}`
}

function formatDateIso(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function generateChild(id: number): Child {
  const index = id - 1
  const isBoy = index % 2 === 0
  const gender = isBoy ? 'Umuhungu' : 'Umukobwa'
  const firstName = pick(isBoy ? BOY_NAMES : GIRL_NAMES, index)
  const middleName = pick(isBoy ? BOY_NAMES : GIRL_NAMES, index + 7)
  const surname = pick(SURNAMES, index)
  const location = pick(LOCATIONS, index)
  const birthYear = 2019 + (index % 5)
  const birthMonth = (index % 12) + 1
  const birthDay = (index % 27) + 1
  const registerMonth = (index % 10) + 1
  const guardianRelation = pick(GUARDIAN_RELATIONS, index)
  const guardianFirst = pick(isBoy ? GIRL_NAMES : BOY_NAMES, index + 3)
  const hasSecondGuardian = index % 3 === 0

  return {
    id: String(id),
    fullName: `${firstName} ${middleName} ${surname}`,
    dateOfBirth: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
    gender,
    guardianName: `${surname} ${guardianFirst}`,
    guardianPhone: padPhone(index),
    guardianRelation,
    ...(hasSecondGuardian
      ? {
          guardian2Name: `${pick(SURNAMES, index + 5)} ${pick(BOY_NAMES, index + 2)}`,
          guardian2Phone: padPhone(index + 500),
          guardian2Relation: pick(GUARDIAN_RELATIONS, index + 2) as GuardianRelation,
        }
      : {}),
    specialNeeds: pick(SPECIAL_NEEDS_SAMPLES, index),
    ...location,
    registeredAt: `2025-${String(registerMonth).padStart(2, '0')}-${String((index % 25) + 1).padStart(2, '0')}`,
  }
}

function generateChildren(total: number): Child[] {
  const generated: Child[] = []
  for (let id = SEED_CHILDREN.length + 1; id <= total; id++) {
    generated.push(generateChild(id))
  }
  return [...SEED_CHILDREN, ...generated]
}

function generateAttendanceForChildren(children: Child[]): AttendanceRecord[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const records: AttendanceRecord[] = []
  let recordCounter = 1

  for (const child of children) {
    const childIndex = Number(child.id)

    for (let dayOffset = 0; dayOffset < ATTENDANCE_HISTORY_DAYS; dayOffset++) {
      const date = addDays(today, -dayOffset)
      const dateStr = formatDateIso(date)

      // ~42% present today, ~75% present on past days
      const presentThreshold = dayOffset === 0 ? 42 : 75
      const present = childIndex % 100 < presentThreshold

      const record: AttendanceRecord = {
        id: `a${recordCounter++}`,
        childId: child.id,
        date: dateStr,
        present,
      }

      if (present) {
        record.broughtBy = pick(BROUGHT_BY_OPTIONS, childIndex + dayOffset)
        const hour = 7 + ((childIndex + dayOffset) % 3)
        const minute = 10 + ((childIndex * 3 + dayOffset * 7) % 50)
        record.arrivedAt = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
      }

      records.push(record)
    }
  }

  return records
}

const CENTER_SECTORS = [
  'Remera', 'Gatsata', 'Kanombe', 'Kimisagara', 'Kabeza', 'Ndera', 'Kacyiru',
  'Kimironko', 'Gisozi', 'Bumbogo', 'Jali', 'Gikomero', 'Kinyinya', 'Nduba',
  'Rusororo', 'Masaka', 'Niboye', 'Gahanga', 'Kicukiro', 'Gatenga',
]

const CARETAKER_NAMES = [
  'Uwimana Marie', 'Mukeshimana Jean', 'Nyirahabimana Alice', 'Habimana Claude',
  'Uwase Divine', 'Niyonsaba Eric', 'Mugisha Patrick', 'Bizimana Vestine',
  'Niyonzima Olivier', 'Habiyaremye Chantal', 'Munyaneza Bosco', 'Uwizeyimana Diane',
  'Mbarushimana Fabrice', 'Niyigena Esperance', 'Hategekimana Samuel',
  'Niyitegeka Gloria', 'Murekatete Jeanne', 'Uwamahoro David', 'Niyomugabo Eric',
  'Mugwaneza Sandrine', 'Nyiransengimana Moise', 'Ishimwe Grace', 'Nshimiyimana Pierre',
  'Mukamana Alice', 'Habimana Eric',
]

function generateEcdCenters(count: number) {
  const centers = [
    { id: 'c1', name: 'Ikigo cya ECD Remera', sector: 'Remera', children: 45, caretaker: 'Uwimana Marie', attendance: 82 },
    { id: 'c2', name: 'Ikigo cya ECD Gatsata', sector: 'Gatsata', children: 38, caretaker: 'Mukeshimana Jean', attendance: 76 },
    { id: 'c3', name: 'Ikigo cya ECD Kanombe', sector: 'Kanombe', children: 52, caretaker: 'Nyirahabimana Alice', attendance: 88 },
    { id: 'c4', name: 'Ikigo cya ECD Kimisagara', sector: 'Kimisagara', children: 41, caretaker: 'Habimana Claude', attendance: 65 },
    { id: 'c5', name: 'Ikigo cya ECD Kabeza', sector: 'Kabeza', children: 33, caretaker: 'Uwase Divine', attendance: 71 },
    { id: 'c6', name: 'Ikigo cya ECD Ndera', sector: 'Ndera', children: 29, caretaker: 'Niyonsaba Eric', attendance: 58 },
  ]

  for (let i = centers.length + 1; i <= count; i++) {
    const sector = pick(CENTER_SECTORS, i)
    centers.push({
      id: `c${i}`,
      name: `Ikigo cya ECD ${sector} ${i}`,
      sector,
      children: 22 + (i % 35),
      caretaker: pick(CARETAKER_NAMES, i),
      attendance: 55 + (i % 40),
    })
  }

  return centers
}

export const MOCK_CHILDREN: Child[] = generateChildren(MOCK_CHILD_COUNT)

export const MOCK_ATTENDANCE: AttendanceRecord[] = generateAttendanceForChildren(MOCK_CHILDREN)

export const DISTRICT_STATS = {
  totalChildren: 12450,
  presentToday: 9200,
  ecdCenters: 340,
  attendanceRate: 74,
}

export const ECD_CENTERS = generateEcdCenters(42)

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
