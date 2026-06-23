export const common = {
  appName: "Sisitemu y'Ubwitabire bw'Abana",
  appSubtitle: "Ubuyobozi bw'Iterambere ry'Abana Bato",
  loading: 'Tegereza gato...',
  save: 'Bika Amakuru',
  cancel: 'Hagarika',
  confirm: 'Emeza',
  back: 'Garuka',
  next: 'Komeza',
  close: 'Funga',
  search: 'Shakisha',
  edit: 'Hindura Amakuru',
  view: 'Reba Ibisobanuro',
  logout: 'Sohoka',
  yes: 'Yego',
  no: 'Oya',
  success: 'Byagenze neza',
  error: 'Hari ikibazo',
  required: 'Ibi bisabwa',
  select: 'Hitamo',
  noResults: 'Nta bisubizo bibonetse',
  today: 'Uyu munsi',
  reset: 'Subiramo',
  clearFilters: 'Siba Akayunguruzo',
  pagination: {
    previous: 'Inyuma',
    next: 'Komeza',
    showing: 'Byerekanwa {start}–{end} muri {total}',
    perPage: 'Ku ipaji',
    perPageLabel: 'Umubare ku ipaji',
    page: 'Ipaji',
    of: 'muri',
    firstPage: 'Ipaji ya mbere',
    lastPage: 'Ipaji ya nyuma',
    records: 'inyandiko',
    goToPage: 'Jya ku ipaji {page}',
    currentPage: 'Ipaji {page}, muri {total}',
  },
} as const

export const messages = {
  childRegistered: 'Umwana yanditswe neza.',
  attendanceRecorded: 'Uwitabire bwabitswe neza.',
  childUpdated: 'Amakuru yahinduwe neza.',
  formIncomplete: 'Hari amakuru atuzuye. Nyamuneka uzuza ibisabwa.',
  loginFailed: 'Izina cyangwa ijambo banga sibyo.',
  confirmLogout: 'Urashaka gusohoka?',
} as const

export const gender = {
  Umuhungu: 'Umuhungu',
  Umukobwa: 'Umukobwa',
} as const

export {
  relations,
  GUARDIAN_RELATION_OPTIONS,
  OTHER_RELATION_VALUE,
  getGuardianRelationLabel,
  normalizeGuardianRelation,
} from '@/lib/guardian-relations'

export const location = {
  province: 'Intara',
  district: 'Akarere',
  sector: 'Umurenge',
  cell: 'Akagari',
  village: 'Umudugudu',
  selectProvince: 'Hitamo intara',
  selectDistrict: 'Hitamo akarere',
  selectSector: 'Hitamo umurenge',
  selectCell: 'Hitamo akagari',
  selectVillage: 'Hitamo umudugudu',
} as const
