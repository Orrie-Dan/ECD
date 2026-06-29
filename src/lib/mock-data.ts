import type {
  ActionAlert,
  AttendanceRecord,
  BroughtBy,
  Child,
  EnrollmentCenterRanking,
  EnrollmentFollowupItem,
  EnrollmentGeoArea,
  EnrollmentPeriod,
  EnrollmentPeriodSummary,
  EnrollmentTrendPoint,
  GuardianRelation,
  TrendDirection,
} from '@/types'

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
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
    { id: 'c1', name: 'ECD Remera', sector: 'Remera', cell: 'Rukiri', children: 45, caretaker: 'Uwimana Marie', caretakerPhone: '0788123456', attendance: 95, submittedToday: true, enrollmentChange: 8 },
    { id: 'c2', name: 'ECD Kimisagara', sector: 'Kimisagara', cell: 'Gatare', children: 41, caretaker: 'Habimana Claude', caretakerPhone: '0788234567', attendance: 92, submittedToday: true, enrollmentChange: 5 },
    { id: 'c3', name: 'ECD Gisozi', sector: 'Gisozi', cell: 'Kinyinya', children: 38, caretaker: 'Mukeshimana Jean', caretakerPhone: '0788345678', attendance: 90, submittedToday: true, enrollmentChange: 3 },
    { id: 'c4', name: 'ECD Kanombe', sector: 'Kanombe', cell: 'Busanza', children: 52, caretaker: 'Nyirahabimana Alice', caretakerPhone: '0788456789', attendance: 88, submittedToday: true, enrollmentChange: 6 },
    { id: 'c5', name: 'ECD Nyamirambo', sector: 'Nyamirambo', cell: 'Nyakabanda', children: 36, caretaker: 'Uwase Divine', caretakerPhone: '0788567890', attendance: 61, submittedToday: true, enrollmentChange: -2 },
    { id: 'c6', name: 'ECD Bumbogo', sector: 'Bumbogo', cell: 'Bumbogo', children: 29, caretaker: 'Niyonsaba Eric', caretakerPhone: '0788678901', attendance: 58, submittedToday: false, enrollmentChange: -4 },
    { id: 'c7', name: 'ECD Kanyinya', sector: 'Kinyinya', cell: 'Kanyinya', children: 33, caretaker: 'Mugisha Patrick', caretakerPhone: '0788789012', attendance: 55, submittedToday: true, enrollmentChange: -6 },
    { id: 'c8', name: 'ECD Ndera', sector: 'Ndera', cell: 'Rusoro', children: 29, caretaker: 'Bizimana Vestine', caretakerPhone: '0788890123', attendance: 58, submittedToday: false, enrollmentChange: -3 },
  ]

  for (let i = centers.length + 1; i <= count; i++) {
    const sector = pick(CENTER_SECTORS, i)
    centers.push({
      id: `c${i}`,
      name: `ECD ${sector} ${i}`,
      sector,
      cell: `${sector} ${i}`,
      children: 22 + (i % 35),
      caretaker: pick(CARETAKER_NAMES, i),
      caretakerPhone: padPhone(700 + i),
      attendance: 55 + (i % 40),
      submittedToday: i % 5 !== 0,
      enrollmentChange: (i % 7) - 3,
    })
  }

  return centers
}

export const MOCK_CHILDREN: Child[] = generateChildren(MOCK_CHILD_COUNT)

export const MOCK_ATTENDANCE: AttendanceRecord[] = generateAttendanceForChildren(MOCK_CHILDREN)

export const DISTRICT_STATS = {
  totalChildren: 12450,
  presentToday: 9820,
  ecdCenters: 152,
  attendanceRate: 79,
}

export const ECD_CENTERS = generateEcdCenters(42)

export const ATTENDANCE_THRESHOLD = 70

export const ATTENDANCE_OVERVIEW = {
  today: { rate: 79, trend: 'up' as const, change: 2 },
  week: { rate: 81, trend: 'up' as const, change: 1 },
  month: { rate: 78, trend: 'down' as const, change: 3 },
}

/** District-level attendance trend (weekly buckets) for dashboard charts. */
export const DISTRICT_ATTENDANCE_TREND = [
  { label: 'Icyumweru 1', rate: 74 },
  { label: 'Icyumweru 2', rate: 76 },
  { label: 'Icyumweru 3', rate: 78 },
  { label: 'Icyumweru 4', rate: 79 },
  { label: 'Uyu munsi', rate: 79 },
]

export const DISTRICT_ATTENDANCE_TREND_BY_PERIOD: Record<
  EnrollmentPeriod,
  Array<{ label: string; rate: number }>
> = {
  today: [
    { label: '08:00', rate: 71 },
    { label: '10:00', rate: 74 },
    { label: '12:00', rate: 77 },
    { label: '14:00', rate: 79 },
    { label: '16:00', rate: 79 },
  ],
  week: [
    { label: 'Ku wa 1', rate: 74 },
    { label: 'Ku wa 2', rate: 75 },
    { label: 'Ku wa 3', rate: 76 },
    { label: 'Ku wa 4', rate: 78 },
    { label: 'Ku wa 5', rate: 77 },
    { label: 'Ku wa 6', rate: 78 },
    { label: 'Uyu munsi', rate: 79 },
  ],
  month: DISTRICT_ATTENDANCE_TREND,
  year: [
    { label: 'Mutarama', rate: 72 },
    { label: 'Gashyantare', rate: 74 },
    { label: 'Werurwe', rate: 75 },
    { label: 'Mata', rate: 76 },
    { label: 'Gicurasi', rate: 74 },
    { label: 'Kamena', rate: 76 },
    { label: 'Nyakanga', rate: 77 },
    { label: 'Kanama', rate: 79 },
    { label: 'Nzeri', rate: 78 },
    { label: 'Ukwakira', rate: 77 },
    { label: 'Ugushyingo', rate: 76 },
    { label: 'Ukuboza', rate: 75 },
  ],
}

/** District-level schools registered trend for dashboard charts. */
export const DISTRICT_SCHOOLS_TREND = [
  { label: 'Gicurasi', value: 38 },
  { label: 'Kamena', value: 39 },
  { label: 'Nyakanga', value: 40 },
  { label: 'Kanama', value: 42 },
]

export const DISTRICT_SCHOOLS_TREND_BY_PERIOD: Record<
  EnrollmentPeriod,
  Array<{ label: string; value: number }>
> = {
  today: [{ label: 'Uyu munsi', value: 42 }],
  week: [
    { label: 'Ku wa 1', value: 40 },
    { label: 'Ku wa 3', value: 41 },
    { label: 'Ku wa 5', value: 42 },
    { label: 'Uyu munsi', value: 42 },
  ],
  month: DISTRICT_SCHOOLS_TREND,
  year: [
    { label: 'Mutarama', value: 35 },
    { label: 'Gashyantare', value: 36 },
    { label: 'Werurwe', value: 37 },
    { label: 'Mata', value: 37 },
    { label: 'Gicurasi', value: 38 },
    { label: 'Kamena', value: 39 },
    { label: 'Nyakanga', value: 40 },
    { label: 'Kanama', value: 42 },
    { label: 'Nzeri', value: 42 },
    { label: 'Ukwakira', value: 42 },
    { label: 'Ugushyingo', value: 42 },
    { label: 'Ukuboza', value: 42 },
  ],
}

/** District-level teachers trend for dashboard charts. */
export const DISTRICT_TEACHERS_TREND = [
  { label: 'Gicurasi', value: 40 },
  { label: 'Kamena', value: 41 },
  { label: 'Nyakanga', value: 42 },
  { label: 'Kanama', value: 42 },
]

export const DISTRICT_TEACHERS_TREND_BY_PERIOD: Record<
  EnrollmentPeriod,
  Array<{ label: string; value: number }>
> = {
  today: [{ label: 'Uyu munsi', value: 42 }],
  week: [
    { label: 'Ku wa 1', value: 41 },
    { label: 'Ku wa 3', value: 41 },
    { label: 'Ku wa 5', value: 42 },
    { label: 'Uyu munsi', value: 42 },
  ],
  month: DISTRICT_TEACHERS_TREND,
  year: [
    { label: 'Mutarama', value: 38 },
    { label: 'Gashyantare', value: 39 },
    { label: 'Werurwe', value: 39 },
    { label: 'Mata', value: 40 },
    { label: 'Gicurasi', value: 40 },
    { label: 'Kamena', value: 41 },
    { label: 'Nyakanga', value: 41 },
    { label: 'Kanama', value: 42 },
    { label: 'Nzeri', value: 42 },
    { label: 'Ukwakira', value: 42 },
    { label: 'Ugushyingo', value: 42 },
    { label: 'Ukuboza', value: 42 },
  ],
}

export const SECTOR_PERFORMANCE = [
  { sector: 'Remera', rate: 85, centers: 14 },
  { sector: 'Kimironko', rate: 82, centers: 12 },
  { sector: 'Kacyiru', rate: 78, centers: 11 },
  { sector: 'Gatsata', rate: 76, centers: 10 },
  { sector: 'Kimisagara', rate: 65, centers: 18 },
  { sector: 'Ndera', rate: 58, centers: 12 },
  { sector: 'Masaka', rate: 62, centers: 15 },
]

export const ENROLLMENT_STATS = {
  newThisMonth: 342,
  growthPercent: 4.2,
  monthlyTrend: [
    { month: 'Gicurasi', count: 298 },
    { month: 'Kamena', count: 310 },
    { month: 'Nyakanga', count: 320 },
    { month: 'Kanama', count: 342 },
  ],
  topCenters: [
    { name: 'ECD Remera', newChildren: 18 },
    { name: 'ECD Kanombe', newChildren: 15 },
    { name: 'ECD Gisozi', newChildren: 12 },
  ],
}

export const DISTRICT_NAME = 'Gasabo'

export const ENROLLMENT_SUMMARY_BY_PERIOD: Record<EnrollmentPeriod, EnrollmentPeriodSummary> = {
  today: {
    totalEnrolled: 12450,
    newRegistrations: 12,
    dropouts: 2,
    netGrowth: 10,
    trends: {
      totalEnrolled: { direction: 'up', change: 0.1 },
      newRegistrations: { direction: 'up', change: 20 },
      dropouts: { direction: 'down', change: 33 },
      netGrowth: { direction: 'up', change: 25 },
    },
  },
  week: {
    totalEnrolled: 12450,
    newRegistrations: 68,
    dropouts: 11,
    netGrowth: 57,
    trends: {
      totalEnrolled: { direction: 'up', change: 0.5 },
      newRegistrations: { direction: 'up', change: 8 },
      dropouts: { direction: 'down', change: 15 },
      netGrowth: { direction: 'up', change: 12 },
    },
  },
  month: {
    totalEnrolled: 12450,
    newRegistrations: 245,
    dropouts: 37,
    netGrowth: 208,
    trends: {
      totalEnrolled: { direction: 'up', change: 1.7 },
      newRegistrations: { direction: 'up', change: 12 },
      dropouts: { direction: 'up', change: 5 },
      netGrowth: { direction: 'up', change: 18 },
    },
  },
  year: {
    totalEnrolled: 12450,
    newRegistrations: 1842,
    dropouts: 312,
    netGrowth: 1530,
    trends: {
      totalEnrolled: { direction: 'up', change: 14 },
      newRegistrations: { direction: 'up', change: 9 },
      dropouts: { direction: 'down', change: 4 },
      netGrowth: { direction: 'up', change: 11 },
    },
  },
}

export const ENROLLMENT_TREND_BY_PERIOD: Record<EnrollmentPeriod, EnrollmentTrendPoint[]> = {
  today: [
    { label: '08:00', newRegistrations: 2, dropouts: 0, netEnrollment: 2 },
    { label: '10:00', newRegistrations: 4, dropouts: 1, netEnrollment: 3 },
    { label: '12:00', newRegistrations: 7, dropouts: 1, netEnrollment: 6 },
    { label: '14:00', newRegistrations: 10, dropouts: 2, netEnrollment: 8 },
    { label: '16:00', newRegistrations: 12, dropouts: 2, netEnrollment: 10 },
  ],
  week: [
    { label: 'Ku wa 1', newRegistrations: 8, dropouts: 2, netEnrollment: 6 },
    { label: 'Ku wa 2', newRegistrations: 14, dropouts: 1, netEnrollment: 13 },
    { label: 'Ku wa 3', newRegistrations: 22, dropouts: 3, netEnrollment: 19 },
    { label: 'Ku wa 4', newRegistrations: 35, dropouts: 4, netEnrollment: 31 },
    { label: 'Ku wa 5', newRegistrations: 48, dropouts: 7, netEnrollment: 41 },
    { label: 'Ku wa 6', newRegistrations: 58, dropouts: 9, netEnrollment: 49 },
    { label: 'Uyu munsi', newRegistrations: 68, dropouts: 11, netEnrollment: 57 },
  ],
  month: [
    { label: 'Icyumweru 1', newRegistrations: 52, dropouts: 8, netEnrollment: 44 },
    { label: 'Icyumweru 2', newRegistrations: 68, dropouts: 9, netEnrollment: 59 },
    { label: 'Icyumweru 3', newRegistrations: 89, dropouts: 11, netEnrollment: 78 },
    { label: 'Icyumweru 4', newRegistrations: 245, dropouts: 37, netEnrollment: 208 },
  ],
  year: [
    { label: 'Mutarama', newRegistrations: 142, dropouts: 28, netEnrollment: 114 },
    { label: 'Gashyantare', newRegistrations: 156, dropouts: 24, netEnrollment: 132 },
    { label: 'Werurwe', newRegistrations: 168, dropouts: 22, netEnrollment: 146 },
    { label: 'Mata', newRegistrations: 175, dropouts: 26, netEnrollment: 149 },
    { label: 'Gicurasi', newRegistrations: 148, dropouts: 30, netEnrollment: 118 },
    { label: 'Kamena', newRegistrations: 162, dropouts: 27, netEnrollment: 135 },
    { label: 'Nyakanga', newRegistrations: 178, dropouts: 25, netEnrollment: 153 },
    { label: 'Kanama', newRegistrations: 245, dropouts: 37, netEnrollment: 208 },
    { label: 'Nzeri', newRegistrations: 188, dropouts: 29, netEnrollment: 159 },
    { label: 'Ukwakira', newRegistrations: 172, dropouts: 31, netEnrollment: 141 },
    { label: 'Ugushyingo', newRegistrations: 158, dropouts: 18, netEnrollment: 140 },
    { label: 'Ukuboza', newRegistrations: 148, dropouts: 15, netEnrollment: 133 },
  ],
}

export const TOP_REGISTRATION_CENTERS: EnrollmentCenterRanking[] = [
  { id: 'c1', name: 'ECD Remera', sector: 'Remera', count: 45 },
  { id: 'c4', name: 'ECD Kimironko', sector: 'Kimironko', count: 39 },
  { id: 'c2', name: 'ECD Kanombe', sector: 'Kanombe', count: 35 },
  { id: 'c3', name: 'ECD Gisozi', sector: 'Gisozi', count: 28 },
  { id: 'c9', name: 'ECD Kacyiru', sector: 'Kacyiru', count: 24 },
]

export const TOP_DROPOUT_CENTERS: EnrollmentCenterRanking[] = [
  { id: 'c5', name: 'ECD Nyamirambo', sector: 'Nyamirambo', count: 18 },
  { id: 'c6', name: 'ECD Bumbogo', sector: 'Bumbogo', count: 15 },
  { id: 'c7', name: 'ECD Kanyinya', sector: 'Kinyinya', count: 12 },
  { id: 'c8', name: 'ECD Ndera', sector: 'Ndera', count: 9 },
  { id: 'c10', name: 'ECD Kimisagara', sector: 'Kimisagara', count: 8 },
]

export const ENROLLMENT_FOLLOWUP: EnrollmentFollowupItem[] = [
  {
    id: 'ef1',
    centerId: 'c5',
    centerName: 'ECD Nyamirambo',
    sector: 'Nyamirambo',
    insights: ['Abavuye muri Gahunda ya ECD biyongereyeho 12 muri uku kwezi.'],
  },
  {
    id: 'ef2',
    centerId: 'c7',
    centerName: 'ECD Kanyinya',
    sector: 'Kinyinya',
    insights: ['Nta mwana mushya wanditswe muri iki cyumweru.'],
  },
  {
    id: 'ef3',
    centerId: 'c3',
    centerName: 'ECD Gisozi',
    sector: 'Gisozi',
    insights: ['Ubwitabire bwagabanutseho 18%.'],
  },
  {
    id: 'ef4',
    centerId: 'c6',
    centerName: 'ECD Bumbogo',
    sector: 'Bumbogo',
    insights: ['Abanditswe bashya bagabanutseho 40% ugereranyije n\'ukwezi gushize.', 'Ubwitabire uri munsi ya 60%.'],
  },
  {
    id: 'ef5',
    centerId: 'c8',
    centerName: 'ECD Ndera',
    sector: 'Ndera',
    insights: ['Umubare w\'abana wagabanutseho mu gihe cy\'icyumweru.'],
  },
]

export const ENROLLMENT_GEO_INSIGHTS = {
  highRegistration: [
    { area: 'Remera', value: 78, label: '78 abanditswe bashya' },
    { area: 'Kimironko', value: 65, label: '65 abanditswe bashya' },
    { area: 'Kanombe', value: 52, label: '52 abanditswe bashya' },
  ] satisfies EnrollmentGeoArea[],
  highDropout: [
    { area: 'Nyamirambo', value: 18, label: '18% igipimo cy\'abavuye' },
    { area: 'Bumbogo', value: 15, label: '15% igipimo cy\'abavuye' },
    { area: 'Kinyinya', value: 12, label: '12% igipimo cy\'abavuye' },
  ] satisfies EnrollmentGeoArea[],
  intervention: [
    { area: 'Bumbogo', value: 3, label: 'Ibigo 3 bisaba kwitabwaho' },
    { area: 'Ndera', value: 2, label: 'Ibigo 2 bisaba kwitabwaho' },
    { area: 'Kimisagara', value: 2, label: 'Ibigo 2 bisaba kwitabwaho' },
  ] satisfies EnrollmentGeoArea[],
}

export function getUniqueSectors() {
  return [...new Set(ECD_CENTERS.map((c) => c.sector))].sort()
}

export function getEnrollmentSummaryForFilters(
  period: EnrollmentPeriod,
  sector?: string,
  centerId?: string,
) {
  const base = ENROLLMENT_SUMMARY_BY_PERIOD[period]
  if (!sector && !centerId) return base

  const scale = centerId ? 0.08 : sector ? 0.25 : 1
  const center = centerId ? ECD_CENTERS.find((c) => c.id === centerId) : undefined

  return {
    ...base,
    totalEnrolled: center ? center.children : Math.round(base.totalEnrolled * scale),
    newRegistrations: Math.max(1, Math.round(base.newRegistrations * scale)),
    dropouts: Math.max(0, Math.round(base.dropouts * scale)),
    netGrowth: Math.max(0, Math.round(base.netGrowth * scale)),
  }
}

export function filterCenterRankings(
  centers: EnrollmentCenterRanking[],
  sector?: string,
  centerId?: string,
) {
  let result = centers
  if (sector) result = result.filter((c) => c.sector === sector)
  if (centerId) result = result.filter((c) => c.id === centerId)
  return result
}

export function filterFollowupItems(sector?: string, centerId?: string) {
  let items = ENROLLMENT_FOLLOWUP
  if (sector) items = items.filter((i) => i.sector === sector)
  if (centerId) items = items.filter((i) => i.centerId === centerId)
  return items
}

export const CENTER_ALERTS = [
  { id: 'a1', centerId: 'c7', centerName: 'ECD Kanyinya', sector: 'Kinyinya', type: 'low_attendance' as const, value: 55 },
  { id: 'a2', centerId: 'c6', centerName: 'ECD Bumbogo', sector: 'Bumbogo', type: 'no_submission' as const },
  { id: 'a3', centerId: 'c5', centerName: 'ECD Nyamirambo', sector: 'Nyamirambo', type: 'attendance_drop' as const, value: 12 },
  { id: 'a4', centerId: 'c8', centerName: 'ECD Ndera', sector: 'Ndera', type: 'enrollment_decrease' as const, value: 3 },
  { id: 'a5', centerId: 'c6', centerName: 'ECD Bumbogo', sector: 'Bumbogo', type: 'low_attendance' as const, value: 58 },
]

export const ACTION_ALERTS: ActionAlert[] = [
  {
    id: 'aa1',
    centerId: 'c5',
    centerName: 'ECD Nyamirambo',
    sector: 'Nyamirambo',
    category: 'attendance',
    type: 'low_attendance',
    priority: 'high',
    description: 'Ubwitabire uri munsi ya 60%',
    suggestedAction: 'Vugana n\'ikigo kugira ngo ukurikirane.',
    metrics: [
      { label: 'Ubwitabire', value: '48%' },
      { label: 'Abavuye uku kwezi', value: '12' },
    ],
  },
  {
    id: 'aa2',
    centerId: 'c6',
    centerName: 'ECD Bumbogo',
    sector: 'Bumbogo',
    category: 'attendance',
    type: 'no_submission',
    priority: 'high',
    description: 'Nta matangazo y\'ubwitabire yatanzwe uyu munsi',
    suggestedAction: 'Vugana n\'ikigo kugira ngo ukurikirane.',
    metrics: [{ label: 'Ubwitabire', value: '58%' }],
  },
  {
    id: 'aa3',
    centerId: 'c7',
    centerName: 'ECD Kanyinya',
    sector: 'Kinyinya',
    category: 'enrollment',
    type: 'no_new_registrations',
    priority: 'high',
    description: 'Nta mwana mushya wanditswe mu gihe kinini',
    suggestedAction: "Suzuma impamvu z'abavuye muri Gahunda ya ECD.",
    metrics: [{ label: 'Icyumweru', value: '0 bashya' }],
  },
  {
    id: 'aa4',
    centerId: 'c6',
    centerName: 'ECD Bumbogo',
    sector: 'Bumbogo',
    category: 'enrollment',
    type: 'high_dropout',
    priority: 'high',
    description: 'Abavuye muri Gahunda ya ECD benshi',
    suggestedAction: "Suzuma impamvu z'abavuye muri Gahunda ya ECD.",
    metrics: [{ label: 'Abavuye uku kwezi', value: '15' }],
  },
  {
    id: 'aa5',
    centerId: 'c8',
    centerName: 'ECD Ndera',
    sector: 'Ndera',
    category: 'enrollment',
    type: 'declining_enrollment',
    priority: 'medium',
    description: 'Kwiyandikisha kugenda kugabanuka',
    suggestedAction: "Suzuma impamvu z'abavuye muri Gahunda ya ECD.",
    metrics: [{ label: 'Impinduka', value: '-3' }],
  },
  {
    id: 'aa6',
    centerId: 'c3',
    centerName: 'ECD Gisozi',
    sector: 'Gisozi',
    category: 'attendance',
    type: 'attendance_decreasing',
    priority: 'medium',
    description: 'Ubwitabire bugenda bugabanuka',
    suggestedAction: 'Fasha umurezi mu gutanga amakuru.',
    metrics: [{ label: 'Kugabanuka', value: '18%' }],
  },
  {
    id: 'aa7',
    centerId: 'c10',
    centerName: 'ECD Kimisagara',
    sector: 'Kimisagara',
    category: 'data_quality',
    type: 'incomplete_registration',
    priority: 'medium',
    description: 'Kwiyandikisha ntibyuzuye',
    suggestedAction: 'Suzuma amakuru y\'ikigo.',
    metrics: [{ label: 'Amakuru atuzuye', value: '8' }],
  },
  {
    id: 'aa8',
    centerId: 'c8',
    centerName: 'ECD Ndera',
    sector: 'Ndera',
    category: 'data_quality',
    type: 'missing_info',
    priority: 'low',
    description: 'Amakuru atari mu buryo',
    suggestedAction: 'Suzuma amakuru y\'ikigo.',
    metrics: [{ label: 'Ibice byabuze', value: '5' }],
  },
  {
    id: 'aa9',
    centerId: 'c6',
    centerName: 'ECD Bumbogo',
    sector: 'Bumbogo',
    category: 'operational',
    type: 'stale_records',
    priority: 'medium',
    description: 'Amakuru ntavuguruye',
    suggestedAction: 'Fasha umurezi mu gutanga amakuru.',
    metrics: [{ label: 'Iminsi', value: '5' }],
  },
  {
    id: 'aa10',
    centerId: 'c5',
    centerName: 'ECD Nyamirambo',
    sector: 'Nyamirambo',
    category: 'operational',
    type: 'unusual_activity',
    priority: 'low',
    description: 'Ibikorwa bitunguranye byabonetse',
    suggestedAction: 'Suzuma amakuru y\'ikigo.',
  },
]

export const DISTRICT_RECENT_ACTIVITY = [
  { id: 'ra1', centerName: 'ECD Remera', action: 'attendanceSubmitted' as const, time: 'iminota 15' },
  { id: 'ra2', centerName: 'ECD Kimironko', action: 'childRegistered' as const, time: 'iminota 32' },
  { id: 'ra3', centerName: 'ECD Nyamirambo', action: 'dropoutRecorded' as const, time: 'isaha 1' },
  { id: 'ra4', centerName: 'ECD Kanombe', action: 'attendanceSubmitted' as const, time: 'isaha 1' },
  { id: 'ra5', centerName: 'ECD Gisozi', action: 'childRegistered' as const, time: 'amasaha 2' },
  { id: 'ra6', centerName: 'ECD Bumbogo', action: 'alertResolved' as const, time: 'amasaha 3' },
]

export const CHILDREN_DISTRIBUTION = {
  ageGroups: [
    { label: '2-3', count: 3240, percent: 26 },
    { label: '3-4', count: 4105, percent: 33 },
    { label: '4-5', count: 3855, percent: 31 },
    { label: '5-6', count: 1250, percent: 10 },
  ],
  gender: [
    { label: 'Abahungu', count: 6280, percent: 50 },
    { label: 'Abakobwa', count: 6170, percent: 50 },
  ],
}

export function getHighPriorityAlerts(limit?: number) {
  const sorted = [...ACTION_ALERTS].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
  return limit ? sorted.slice(0, limit) : sorted
}

export function filterActionAlerts(category?: string) {
  if (!category || category === 'all') return ACTION_ALERTS
  return ACTION_ALERTS.filter((a) => a.category === category)
}

export function getCenterEnrollmentHistory(centerId: string) {
  return getCenterEnrollmentHistoryForPeriod(centerId, 'month')
}

export function getCenterEnrollmentHistoryForPeriod(
  centerId: string,
  period: EnrollmentPeriod,
) {
  const center = ECD_CENTERS.find((c) => c.id === centerId)
  const base = center?.children ?? 30
  const scale = base / 30

  if (period === 'today') {
    return ENROLLMENT_TREND_BY_PERIOD.today.map((p) => ({
      month: p.label,
      registered: Math.max(1, Math.round(p.newRegistrations * scale * 0.15)),
      dropouts: Math.max(0, Math.round(p.dropouts * scale * 0.15)),
      total: base,
    }))
  }

  if (period === 'week') {
    return ENROLLMENT_TREND_BY_PERIOD.week.map((p) => ({
      month: p.label,
      registered: Math.max(1, Math.round(p.newRegistrations * scale * 0.2)),
      dropouts: Math.max(0, Math.round(p.dropouts * scale * 0.2)),
      total: base,
    }))
  }

  if (period === 'year') {
    const months = [
      'Mutarama', 'Gashyantare', 'Werurwe', 'Mata', 'Gicurasi', 'Kamena',
      'Nyakanga', 'Kanama', 'Nzeri', 'Ukwakira', 'Ugushyingo', 'Ukuboza',
    ]
    return months.map((month, i) => ({
      month,
      registered: Math.max(1, Math.round(base * (0.12 + (i % 5) * 0.02))),
      dropouts: Math.max(0, 1 + (i % 4)),
      total: base - 4 + i,
    }))
  }

  return [
    { month: 'Gicurasi', registered: Math.round(base * 0.15), dropouts: 2, total: base - 4 },
    { month: 'Kamena', registered: Math.round(base * 0.18), dropouts: 1, total: base - 2 },
    { month: 'Nyakanga', registered: Math.round(base * 0.2), dropouts: 3, total: base - 1 },
    {
      month: 'Kanama',
      registered: Math.round(base * 0.22),
      dropouts: center && center.enrollmentChange < 0 ? 4 : 2,
      total: base,
    },
  ]
}

export function getCentersByPerformance() {
  return [...ECD_CENTERS].sort((a, b) => b.attendance - a.attendance)
}

export function searchChildren(query: string, limit = 5): Child[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return MOCK_CHILDREN.filter(
    (c) =>
      c.fullName.toLowerCase().includes(q) ||
      c.guardianName.toLowerCase().includes(q) ||
      c.sector.toLowerCase().includes(q),
  ).slice(0, limit)
}

export const LOW_ATTENDANCE_AREAS = SECTOR_PERFORMANCE
  .filter((s) => s.rate < ATTENDANCE_THRESHOLD)
  .sort((a, b) => a.rate - b.rate)

export const CENTER_RECENT_ACTIVITY: Record<string, { date: string; present: number; total: number }[]> = {
  c1: [
    { date: '2026-06-25', present: 43, total: 45 },
    { date: '2026-06-24', present: 42, total: 45 },
    { date: '2026-06-23', present: 44, total: 45 },
    { date: '2026-06-20', present: 41, total: 45 },
    { date: '2026-06-19', present: 40, total: 44 },
  ],
}

export function getCenterRecentActivity(centerId: string) {
  if (CENTER_RECENT_ACTIVITY[centerId]) return CENTER_RECENT_ACTIVITY[centerId]
  const center = ECD_CENTERS.find((c) => c.id === centerId)
  if (!center) return []
  return [
    { date: '2026-06-25', present: Math.round(center.children * center.attendance / 100), total: center.children },
    { date: '2026-06-24', present: Math.round(center.children * (center.attendance - 2) / 100), total: center.children },
    { date: '2026-06-23', present: Math.round(center.children * (center.attendance + 1) / 100), total: center.children },
  ]
}

export type AttendanceTrendPoint = { date: string; rate: number }

export function getCenterAttendanceTrend(centerId: string, days = 30): AttendanceTrendPoint[] {
  return getCenterAttendanceTrendForPeriod(centerId, days <= 7 ? (days <= 1 ? 'today' : 'week') : 'month')
}

export function getCenterAttendanceTrendForPeriod(
  centerId: string,
  period: EnrollmentPeriod,
): AttendanceTrendPoint[] {
  const center = ECD_CENTERS.find((c) => c.id === centerId)
  if (!center) return []

  if (period === 'year') {
    const months = [
      'Mutarama', 'Gashyantare', 'Werurwe', 'Mata', 'Gicurasi', 'Kamena',
      'Nyakanga', 'Kanama', 'Nzeri', 'Ukwakira', 'Ugushyingo', 'Ukuboza',
    ]
    const base = clamp(center.attendance, 45, 98)
    const seed = parseInt(centerId.replace('c', ''), 10) || 1
    return months.map((month, i) => ({
      date: month,
      rate: clamp(Math.round(base + Math.sin((i + seed) / 2) * 4 + (i % 3) - 1), 35, 100),
    }))
  }

  if (period === 'today') {
    const base = clamp(center.attendance, 45, 98)
    const hours = ['08:00', '10:00', '12:00', '14:00', '16:00']
    return hours.map((hour, i) => ({
      date: hour,
      rate: clamp(base + i - 2, 35, 100),
    }))
  }

  if (period === 'week') {
    return generateDailyAttendanceTrend(centerId, 7)
  }

  return generateDailyAttendanceTrend(centerId, 30)
}

function generateDailyAttendanceTrend(centerId: string, days: number): AttendanceTrendPoint[] {
  const center = ECD_CENTERS.find((c) => c.id === centerId)
  if (!center) return []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const base = clamp(center.attendance, 45, 98)
  const seed = parseInt(centerId.replace('c', ''), 10) || 1

  const points: AttendanceTrendPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i)
    const weekday = d.getDay()
    const weekdayPenalty = weekday === 0 ? 6 : weekday === 6 ? 3 : 0
    const wave = Math.sin((i + seed) / 4) * 3
    const noise = ((i * 17 + seed * 11) % 9) - 4
    const rate = clamp(Math.round(base + wave + noise - weekdayPenalty), 35, 100)
    points.push({ date: formatDateIso(d), rate })
  }
  return points
}

export function getTopCenters(limit = 3) {
  return [...ECD_CENTERS].sort((a, b) => b.attendance - a.attendance).slice(0, limit)
}

export function getBottomCenters(limit = 3) {
  return [...ECD_CENTERS].sort((a, b) => a.attendance - b.attendance).slice(0, limit)
}

export interface SchoolStatsSummary {
  totalSchools: number
  activeSchools: number
  inactiveSchools: number
  totalChildren: number
  totalCaretakers: number
  avgChildrenPerSchool: number
  schoolsRequiringAttention: number
  newSchoolsRegistered: number
  trends: {
    totalSchools: { direction: TrendDirection; change: number }
    activeSchools: { direction: TrendDirection; change: number }
    totalChildren: { direction: TrendDirection; change: number }
    schoolsRequiringAttention: { direction: TrendDirection; change: number }
    newSchoolsRegistered: { direction: TrendDirection; change: number }
  }
}

export const SCHOOL_STATS_SUMMARY: SchoolStatsSummary = {
  totalSchools: ECD_CENTERS.length,
  activeSchools: ECD_CENTERS.filter((c) => c.submittedToday).length,
  inactiveSchools: ECD_CENTERS.filter((c) => !c.submittedToday).length,
  totalChildren: ECD_CENTERS.reduce((sum, c) => sum + c.children, 0),
  totalCaretakers: ECD_CENTERS.length,
  avgChildrenPerSchool: Math.round(ECD_CENTERS.reduce((sum, c) => sum + c.children, 0) / ECD_CENTERS.length),
  schoolsRequiringAttention: ACTION_ALERTS.filter((a) => a.priority === 'high').length,
  newSchoolsRegistered: 3,
  trends: {
    totalSchools: { direction: 'up', change: 5 },
    activeSchools: { direction: 'up', change: 8 },
    totalChildren: { direction: 'up', change: 12 },
    schoolsRequiringAttention: { direction: 'down', change: 15 },
    newSchoolsRegistered: { direction: 'up', change: 50 },
  },
}

export interface SchoolRegistrationTrend {
  month: string
  newRegistrations: number
  dropouts: number
  netChange: number
}

export const SCHOOL_REGISTRATION_TRENDS: SchoolRegistrationTrend[] = [
  { month: 'Mutarama', newRegistrations: 45, dropouts: 8, netChange: 37 },
  { month: 'Gashyantare', newRegistrations: 52, dropouts: 6, netChange: 46 },
  { month: 'Werurwe', newRegistrations: 48, dropouts: 9, netChange: 39 },
  { month: 'Mata', newRegistrations: 61, dropouts: 5, netChange: 56 },
  { month: 'Gicurasi', newRegistrations: 55, dropouts: 7, netChange: 48 },
  { month: 'Kamena', newRegistrations: 68, dropouts: 4, netChange: 64 },
]

export interface SchoolCapacityData {
  id: string
  name: string
  sector: string
  enrolled: number
  capacity: number
  utilizationPercent: number
  status: 'overcrowded' | 'near_capacity' | 'optimal' | 'underutilized'
}

export function getSchoolsCapacity(): SchoolCapacityData[] {
  return ECD_CENTERS.map((center) => {
    const capacity = center.children + 10 + (parseInt(center.id.replace('c', '')) % 20)
    const utilizationPercent = Math.round((center.children / capacity) * 100)
    let status: SchoolCapacityData['status'] = 'optimal'
    if (utilizationPercent > 95) status = 'overcrowded'
    else if (utilizationPercent > 80) status = 'near_capacity'
    else if (utilizationPercent < 50) status = 'underutilized'
    
    return {
      id: center.id,
      name: center.name,
      sector: center.sector,
      enrolled: center.children,
      capacity,
      utilizationPercent,
      status,
    }
  })
}

export interface SchoolDistribution {
  bySector: { sector: string; count: number; percent: number }[]
  byStatus: { status: string; count: number; percent: number }[]
  childrenPerSchool: { range: string; count: number; percent: number }[]
}

export function getSchoolsDistribution(): SchoolDistribution {
  const sectorCounts = ECD_CENTERS.reduce<Record<string, number>>((acc, c) => {
    acc[c.sector] = (acc[c.sector] || 0) + 1
    return acc
  }, {})
  
  const total = ECD_CENTERS.length
  const bySector = Object.entries(sectorCounts)
    .map(([sector, count]) => ({
      sector,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const active = ECD_CENTERS.filter((c) => c.submittedToday).length
  const inactive = total - active
  const byStatus = [
    { status: 'Bikora', count: active, percent: Math.round((active / total) * 100) },
    { status: 'Bidasanzwe', count: inactive, percent: Math.round((inactive / total) * 100) },
  ]

  const childRanges = [
    { range: '0-20', min: 0, max: 20 },
    { range: '21-35', min: 21, max: 35 },
    { range: '36-50', min: 36, max: 50 },
    { range: '50+', min: 51, max: Infinity },
  ]

  const childrenPerSchool = childRanges.map(({ range, min, max }) => {
    const count = ECD_CENTERS.filter((c) => c.children >= min && c.children <= max).length
    return { range, count, percent: Math.round((count / total) * 100) }
  })

  return { bySector, byStatus, childrenPerSchool }
}

export interface SchoolAttentionItem {
  id: string
  centerId: string
  centerName: string
  sector: string
  issue: string
  issueType: 'low_registration' | 'high_dropout' | 'no_activity' | 'missing_caretaker' | 'incomplete_profile' | 'enrollment_decline'
  severity: 'high' | 'medium' | 'low'
  suggestedAction: string
  metrics?: { label: string; value: string }[]
  lastActivity?: string
}

export const SCHOOLS_REQUIRING_ATTENTION: SchoolAttentionItem[] = [
  {
    id: 'sa1',
    centerId: 'c5',
    centerName: 'ECD Nyamirambo',
    sector: 'Nyamirambo',
    issue: 'Kwiyandikisha guke cyane (Munsi ya 30)',
    issueType: 'low_registration',
    severity: 'high',
    suggestedAction: 'Kureba impamvu ikigo kitabona abana benshi',
    metrics: [{ label: 'Abana', value: '36' }],
    lastActivity: '2026-06-20',
  },
  {
    id: 'sa2',
    centerId: 'c6',
    centerName: 'ECD Bumbogo',
    sector: 'Bumbogo',
    issue: 'Abavuye muri Gahunda ya ECD benshi (15 muri uku kwezi)',
    issueType: 'high_dropout',
    severity: 'high',
    suggestedAction: 'Suzuma impamvu abana bavuye muri Gahunda ya ECD',
    metrics: [{ label: 'Abavuye', value: '15' }, { label: 'Igipimo', value: '18%' }],
    lastActivity: '2026-06-24',
  },
  {
    id: 'sa3',
    centerId: 'c8',
    centerName: 'ECD Ndera',
    sector: 'Ndera',
    issue: 'Nta bikorwa mu minsi 5 ishize',
    issueType: 'no_activity',
    severity: 'high',
    suggestedAction: 'Vugana n\'umurezi kugira ngo ukurikirane',
    lastActivity: '2026-06-21',
  },
  {
    id: 'sa4',
    centerId: 'c7',
    centerName: 'ECD Kanyinya',
    sector: 'Kinyinya',
    issue: 'Amakuru y\'ikigo adatuzuye (40%)',
    issueType: 'incomplete_profile',
    severity: 'medium',
    suggestedAction: 'Gusaba umurezi kuzuza amakuru y\'ikigo',
    metrics: [{ label: 'Ubwuzure', value: '40%' }],
  },
  {
    id: 'sa5',
    centerId: 'c10',
    centerName: 'ECD Kimisagara 10',
    sector: 'Kimisagara',
    issue: 'Kwiyandikisha kugabanuka (-25% muri uku kwezi)',
    issueType: 'enrollment_decline',
    severity: 'medium',
    suggestedAction: 'Kureba impamvu kwiyandikisha kugabanuka',
    metrics: [{ label: 'Impinduka', value: '-25%' }],
    lastActivity: '2026-06-25',
  },
  {
    id: 'sa6',
    centerId: 'c12',
    centerName: 'ECD Gatsata 12',
    sector: 'Gatsata',
    issue: 'Nta bana bashya mu cyumweru cyashize',
    issueType: 'low_registration',
    severity: 'low',
    suggestedAction: 'Kugenzura niba ikigo gikeneye ubufasha',
    lastActivity: '2026-06-24',
  },
]

export function getSchoolsRequiringAttention(severity?: 'high' | 'medium' | 'low') {
  const items = severity
    ? SCHOOLS_REQUIRING_ATTENTION.filter((s) => s.severity === severity)
    : SCHOOLS_REQUIRING_ATTENTION
  
  return [...items].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.severity] - order[b.severity]
  })
}

export interface SchoolPerformanceRanking {
  id: string
  name: string
  sector: string
  attendance: number
  enrollmentChange: number
  children: number
  dataCompleteness: number
  activityScore: number
  overallScore: number
}

export function getTopPerformingSchools(limit = 5): SchoolPerformanceRanking[] {
  return ECD_CENTERS
    .map((center) => {
      const dataCompleteness = 70 + (parseInt(center.id.replace('c', '')) % 30)
      const activityScore = center.submittedToday ? 90 : 50
      const overallScore = Math.round(
        (center.attendance * 0.4) + 
        (Math.max(0, center.enrollmentChange + 10) * 2) + 
        (dataCompleteness * 0.2) + 
        (activityScore * 0.1)
      )
      return {
        id: center.id,
        name: center.name,
        sector: center.sector,
        attendance: center.attendance,
        enrollmentChange: center.enrollmentChange,
        children: center.children,
        dataCompleteness,
        activityScore,
        overallScore,
      }
    })
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, limit)
}

export function getSchoolsNeedingSupport(limit = 5): SchoolPerformanceRanking[] {
  return ECD_CENTERS
    .map((center) => {
      const dataCompleteness = 70 + (parseInt(center.id.replace('c', '')) % 30)
      const activityScore = center.submittedToday ? 90 : 50
      const overallScore = Math.round(
        (center.attendance * 0.4) + 
        (Math.max(0, center.enrollmentChange + 10) * 2) + 
        (dataCompleteness * 0.2) + 
        (activityScore * 0.1)
      )
      return {
        id: center.id,
        name: center.name,
        sector: center.sector,
        attendance: center.attendance,
        enrollmentChange: center.enrollmentChange,
        children: center.children,
        dataCompleteness,
        activityScore,
        overallScore,
      }
    })
    .sort((a, b) => a.overallScore - b.overallScore)
    .slice(0, limit)
}

export interface DistrictSchoolInsight {
  id: string
  type: 'positive' | 'warning' | 'info'
  title: string
  description: string
  metric?: string
  schools?: string[]
}

export const DISTRICT_SCHOOL_INSIGHTS: DistrictSchoolInsight[] = [
  {
    id: 'insight1',
    type: 'positive',
    title: 'Ibigo bifite izamuka ryihuse',
    description: 'Ibigo 3 byerekanye izamuka rya 20%+ mu kwiyandikisha muri uku kwezi',
    metric: '+24% impuzandengo',
    schools: ['ECD Remera', 'ECD Kanombe', 'ECD Kimironko'],
  },
  {
    id: 'insight2',
    type: 'warning',
    title: 'Ibigo bikuburirana abana',
    description: 'Ibigo 4 byerekanye kugabanuka kw\'abana gusumba 10% muri uku kwezi',
    metric: '-15% impuzandengo',
    schools: ['ECD Bumbogo', 'ECD Kanyinya'],
  },
  {
    id: 'insight3',
    type: 'info',
    title: 'Ahantu hafite ubwitabire buke',
    description: 'Umurenge wa Ndera ufite ubwitabire bw\'ibigo buke (58%)',
    metric: '58%',
  },
  {
    id: 'insight4',
    type: 'positive',
    title: 'Ahantu hazamuka mu biyandikisha',
    description: 'Umurenge wa Remera ufite kwiyandikisha kwiza cyane (78 bashya)',
    metric: '78 bashya',
  },
  {
    id: 'insight5',
    type: 'info',
    title: 'Ibigo bigera ku bushobozi',
    description: 'Ibigo 5 bifite ubushobozi bwuzuye (>90%)',
    metric: '5 ibigo',
    schools: ['ECD Kanombe', 'ECD Remera'],
  },
  {
    id: 'insight6',
    type: 'warning',
    title: 'Ibigo bifite amakuru yabuze',
    description: 'Ibigo 3 bifite amakuru adatuzuye neza (<60%)',
    metric: '3 ibigo',
  },
]

export interface SchoolTableData {
  id: string
  name: string
  sector: string
  cell: string
  children: number
  caretakers: number
  isActive: boolean
  enrollmentTrend: 'up' | 'down' | 'stable'
  enrollmentChange: number
  lastActivity: string
  attentionStatus: 'none' | 'low' | 'medium' | 'high'
  attendance: number
}

export function getSchoolsTableData(): SchoolTableData[] {
  return ECD_CENTERS.map((center) => {
    const attentionItem = SCHOOLS_REQUIRING_ATTENTION.find((s) => s.centerId === center.id)
    return {
      id: center.id,
      name: center.name,
      sector: center.sector,
      cell: center.cell,
      children: center.children,
      caretakers: 1,
      isActive: center.submittedToday,
      enrollmentTrend: center.enrollmentChange > 0 ? 'up' : center.enrollmentChange < 0 ? 'down' : 'stable',
      enrollmentChange: center.enrollmentChange,
      lastActivity: center.submittedToday ? '2026-06-26' : '2026-06-24',
      attentionStatus: attentionItem?.severity ?? 'none',
      attendance: center.attendance,
    }
  })
}

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
