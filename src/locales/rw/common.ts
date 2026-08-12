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
  clearFilters: 'Siba ibyo wahisemo',
  nav: {
    openMenu: 'Fungura imbuga nkuru',
    closeMenu: 'Funga imbuga nkuru',
    mainNav: 'Imbuga nkuru',
    collapseSidebar: 'Funga uruhande',
    expandSidebar: 'Fungura uruhande',
  },
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
  labels: {
    name: 'Amazina',
    date: 'Itariki',
    status: 'Imiterere',
    child: 'Umwana',
    parent: 'Umubyeyi',
    gender: 'Igitsina',
    dateOfBirth: "Itariki y'amavuko",
    childGender: "Igitsina cy'umwana",
    relation: 'Isano',
    phone: 'Telefoni',
    actions: 'Ibyakora',
    broughtBy: 'Yazanywe na',
  },
  ui: {
    systemUser: 'Ukoresha sisitemu',
    emptyTable: 'Nta makuru aboneka',
    searching: 'Turimo gushakisha...',
    clearSearch: 'Siba ishakisha',
    searchPlaceholder: 'Shakisha...',
    filtering: 'Gushungura',
    ages: 'Imyaka',
    keyStats: "Imibare y'ingenzi",
    optimal: 'Bikwiye',
    moreItems: '+{count} ibindi',
    centersPrefix: 'Ibigo:',
    stepper: 'Intambwe',
    stepProgress: 'Intambwe {current} / {total}',
  },
  reportPreview: {
    title: 'Reba Raporo',
    reportTitle: 'Izina rya raporo',
    dateRange: "Intera y'itariki",
    filtersApplied: 'Akayunguruzo gakoreshejwe',
    noFilters: 'Nta kayunguruzo kahisemo',
    summary: 'Incamake',
    dataPreview: "Incamake y'amakuru",
    openPreview: 'Reba no kuramo',
    exportPdf: 'Kuramo PDF',
    exportExcel: 'Kuramo Excel',
    exportMock: 'Iyoherezwa ni ikigerageza gusa',
    exportStarted: 'Raporo irimo gukurwa...',
    previewRows: 'Byerekanwa {count} muri {total}',
    emptyPreview: 'Nta makuru yo kugaragaza muri iyi raporo',
  },
  /** LIVE-mode honesty copy — never imply mock/fake success succeeded online. */
  live: {
    unavailableTitle: 'Ntabwo biboneka kuri murongo',
    unavailableDesc:
      'Ibi makuru cyangwa iki gikorwa ntabwo bikoresha API iriho. Ntabwo dukoresha amakuru y’ikigerageza.',
    exportUnavailable: 'Kuramo dosiye ntabwo bishoboka kuri murongo — nta endpoint yo kuramo.',
    settingsSaveUnavailable:
      'Kubika igenamiterere ntabwo bishoboka kuri murongo — nta persistence yo ku murongo.',
    transferAcceptUnavailable:
      'Kwemera koherezwa ntabwo bishoboka kuri murongo muri iki gihe (Transfers domain).',
    transferDestinationsLoading: 'Turimo gushaka ibigo...',
    transferDestinationsEmpty: 'Nta kindi kigo kiboneka cyo kohereza.',
    transferDestinationsError: 'Ntibyashoboye gushaka urutonde rw’ibigo.',
    missingCenterId:
      'Konti nta centerId ifite. Ongera ushyiremo ikigo cyangwa uhure n’ubuyobozi.',
    syntheticAttendanceUnavailable:
      'Urutonde rw’abana ku munsi ntabwo rwabonetse kuri API — ntabwo dukora amakuru y’ikigerageza.',
    sectorFilterUnavailable: 'Akayunguruzo k’umurenge ntabwo gishoboka (nta makuru y’imirenge kuri API).',
    enrollmentKpiLimited:
      'Imibare y’iyandikwa ishingiye ku rutonde rwabonetse gusa (pagination).',
  },
  sync: {
    online: 'Uri ku murongo',
    offline: 'Nta murongo',
    reconnecting: 'Turimo kongera guhuza…',
    syncing: 'Birimo guhuza…',
    failed: 'Guhuza byanze',
    conflict: 'Hari amakuru ahuriye',
    needsAttention: 'Birakeneye kwitabwaho',
    conflictCount: 'Impinduka {count} zikeneye kwitabwaho',
    couldntSync: 'Ntibyashoboye guhuza',
    signInRequired: 'Ongera winjire',
    pending: 'Impinduka {count} zitegereje',
    pendingTitle: 'Impinduka zitegereje koherezwa',
    lastSynced: 'Byahujwe {time}',
    lastSyncedNever: 'Ntabwo byarahujwe',
    tapToSync: 'Kanda kugira ngo uhuzanye',
    syncNow: 'Huza ubu',
    syncingBusy: 'Guhuza birimo gukora…',
    saved: 'Byabitswe',
    savedOnDevice: 'Byabitswe kuri iki gikoresho',
    savedOnDeviceHint: 'Bizahuza iyo murongo ugaruye.',
    logoutBlocked:
      'Hari impinduka {count} zitarahujwe. Huza, bika ku gikoresho, cyangwa usibe mbere yo gusohoka.',
    logoutKeep: 'Bika ku gikoresho',
    logoutDiscard: 'Siba amakuru yo ku gikoresho',
    logoutSync: 'Huza hanyuma usohoke',
    logoutDiscardConfirmTitle: 'Siba amakuru atarahujwe?',
    logoutDiscardConfirm:
      'Ibi bizasiba impinduka zitaroherezwa kuri seriveri. Ntabwo bishobora gusubizwa. Uracyemera?',
    logoutSyncFailed: 'Guhuza byanze. Amakuru agumye ku gikoresho. Ongera ugerageze cyangwa ubike ku gikoresho.',
    noLocalSnapshotTitle: 'Nta makuru yabitswe kuri iki gikoresho',
    noLocalSnapshotBody:
      'Huza interneti rimwe kugira ngo amakuru abanze abikwe. Nyuma ushobora gukora nta murongo.',
    statusPanelTitle: 'Imiterere yo guhuza',
    byDomain: 'Impinduka ku buryo',
    domainChild: 'Abana',
    domainAttendance: 'Ubwitabire',
    domainNutrition: 'Imikurire / Imirire',
    domainFeeding: 'Imirire y’ikigo',
    domainSted: 'STED',
    domainReferral: 'Kohereza',
    domainOther: 'Ibindi',
    storageFull:
      'Ububiko bw’iki gikoresho bwuzuye. Ntabwo byabitswe. Siba dosiye cyangwa uhure n’ubuyobozi.',
    storageUnavailable:
      'Kubika ku gikoresho byanze. Ntabwo byabitswe. Ongera ugerageze.',
    childEditNeedsOnline:
      'Guhindura itariki y’amavuko, igitsina, cyangwa ahantu umwana atuye bisaba umurongo.',
    childEditOfflineTitle: 'Ibi bisaba umurongo',
    conflictServerWins:
      'Amakuru yo kuri seriveri ni yo akoreshwa. Impinduka zawe ntabwo zabitswe kuri seriveri.',
    conflictItem:
      '{label} — ntabwo byashoboye kubikwa kuri seriveri (byahinduwe ku kindi gikoresho).',
    conflictContactSupport:
      'Komeza gukora. Niba ibibazo bikomeje, uhure n’ubufasha bwa tekiniki.',
    conflictAcknowledge: 'Nemera amakuru ya seriveri',
    conflictAcknowledgeHint:
      'Amakuru yo kuri seriveri azakomeza gukoreshwa. Ibi bivanaho ikimenyetso cyo kwitabwaho.',
    failedCount: 'Impinduka {count} zananze',
    blockedCount: 'Impinduka {count} zitegereje izindi',
    failedItem: '{label} — ntabwo byashoboye koherezwa',
    blockedItem: '{label} — itegereje indi mpinduka',
    diagnosticQueue: 'Urutonde: {pending} zitegereje · {failed} zananze · {conflict} zikeneye kwitabwaho',
    requiresInternetTitle: 'Ibi bisaba umurongo wa interneti',
    requiresInternetBody:
      'Amakuru y’akarere ntabwo aboneka nta murongo. Ongera uhure interneti maze wongere ugerageze.',
  },
} as const

export const messages = {
  childRegistered: 'Umwana yanditswe neza.',
  childRegisteredLocal: 'Umwana yabitswe kuri iki gikoresho. Azahuza iyo murongo ugaruye.',
  attendanceRecorded: 'Ubwitabire bwabitswe neza.',
  attendanceRecordedLocal:
    'Ubwitabire bwabitswe kuri iki gikoresho. Buzahuza iyo murongo ugaruye.',
  childUpdated: 'Amakuru yahinduwe neza.',
  childTransferred: 'Umwana yoherejwe ku kindi kigo neza.',
  childTransferAccepted: 'Koherezwa kwemerewe — umwana aba akora kuri iki kigo.',
  childArchived: 'Umwana yashyizwe mu bubiko neza.',
  childReactivated: 'Umwana yasubijwe mu bana bakora neza.',
  formIncomplete: 'Hari amakuru atuzuye. Nyamuneka uzuza ibisabwa.',
  childRegisterFailed: 'Ntibyashobotse kwandika umwana. Ongera ugerageze.',
  childRegisterNoCenter:
    'Ntabwo hashoboye kubona ikigo cyawe. Sohoka winjire ukundi, cyangwa ureba niba umukoresha afite ikigo.',
  mutationFailed: 'Ntibyashobotse kubika. Ongera ugerageze.',
  mutationNoCenter:
    'Ntabwo hashoboye kubona ikigo cyawe. Sohoka winjire ukundi, cyangwa ureba niba umukoresha afite ikigo.',
  mutationNoUser:
    'Sesiyo yawe ntiyuzuye. Sohoka winjire ukundi.',
  mutationNotFound: 'Ibyo ushaka ntibibonetse. Ongera ugerageze.',
  transferAcceptUnavailable:
    'Kwemera koherezwa ntibirashoboka muri ubu buryo bwo gukora. Bitegereje guhuza na sisitemu.',
  deviceRegistrationFailed:
    'Kwiyandikisha kw\'igikoresho byanze. Kohereza amakuru kuri seriveri birashobora guhagarikwa.',
  deviceRegistrationUnauthorized:
    'Sesiyo yarangiye. Injira ukundi kugira ngo amakuru ahuze na seriveri.',
  loginFailed: 'Izina cyangwa ijambo banga sibyo.',
  confirmLogout: 'Urashaka gusohoka?',
  liveFeatureUnavailable: 'Iki gikorwa ntabwo gishoboka kuri murongo.',
  liveExportUnavailable: 'Kuramo dosiye ntabwo bishoboka kuri murongo.',
  liveSettingsUnavailable: 'Kubika igenamiterere ntabwo bishoboka kuri murongo.',
} as const

export const childStatus = {
  active: 'Akora',
  transferred: 'Yoherejwe',
  archived: 'Mu bubiko',
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
