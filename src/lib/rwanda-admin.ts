export const PROVINCES = [
  { id: 'iburasirazuba', name: 'Iburasirazuba' },
  { id: 'kigali', name: 'Umujyi wa Kigali' },
  { id: 'amajyaruguru', name: 'Amajyaruguru' },
  { id: 'amajyepfo', name: 'Amajyepfo' },
  { id: 'iburengerazuba', name: 'Iburengerazuba' },
] as const

export const DISTRICTS_BY_PROVINCE: Record<string, { id: string; name: string }[]> = {
  iburasirazuba: [
    { id: 'bugesera', name: 'Bugesera' },
    { id: 'gatsibo', name: 'Gatsibo' },
    { id: 'kayonza', name: 'Kayonza' },
    { id: 'kirehe', name: 'Kirehe' },
    { id: 'ngoma', name: 'Ngoma' },
    { id: 'nyagatare', name: 'Nyagatare' },
    { id: 'rwamagana', name: 'Rwamagana' },
  ],
  kigali: [
    { id: 'gasabo', name: 'Gasabo' },
    { id: 'kicukiro', name: 'Kicukiro' },
    { id: 'nyarugenge', name: 'Nyarugenge' },
  ],
  amajyaruguru: [
    { id: 'burera', name: 'Burera' },
    { id: 'gakenke', name: 'Gakenke' },
    { id: 'gicumbi', name: 'Gicumbi' },
    { id: 'musanze', name: 'Musanze' },
    { id: 'rulindo', name: 'Rulindo' },
  ],
  amajyepfo: [
    { id: 'gisagara', name: 'Gisagara' },
    { id: 'huye', name: 'Huye' },
    { id: 'kamonyi', name: 'Kamonyi' },
    { id: 'muhanga', name: 'Muhanga' },
    { id: 'nyamagabe', name: 'Nyamagabe' },
    { id: 'nyanza', name: 'Nyanza' },
    { id: 'nyaruguru', name: 'Nyaruguru' },
    { id: 'ruhango', name: 'Ruhango' },
  ],
  iburengerazuba: [
    { id: 'karongi', name: 'Karongi' },
    { id: 'ngororero', name: 'Ngororero' },
    { id: 'nyabihu', name: 'Nyabihu' },
    { id: 'nyamasheke', name: 'Nyamasheke' },
    { id: 'rubavu', name: 'Rubavu' },
    { id: 'rusizi', name: 'Rusizi' },
    { id: 'rutsiro', name: 'Rutsiro' },
  ],
}

export const SECTORS_BY_DISTRICT: Record<string, string[]> = {
  gasabo: ['Bumbogo', 'Gatsata', 'Jali', 'Kinyinya', 'Ndera', 'Remera'],
  kicukiro: ['Gahanga', 'Gatenga', 'Kagarama', 'Kanombe', 'Kicukiro', 'Masaka'],
  nyarugenge: ['Gitega', 'Kanyinya', 'Kigali', 'Kimisagara', 'Mageragere', 'Nyakabanda'],
  bugesera: ['Gashora', 'Juru', 'Kamabuye', 'Mareba', 'Mayange', 'Musenyi'],
  rwamagana: ['Fumbwe', 'Gahengeri', 'Gishari', 'Karenge', 'Kigabiro', 'Muhazi'],
}

export const CELLS_BY_SECTOR: Record<string, string[]> = {
  Remera: ['Rukiri I', 'Rukiri II', 'Amahoro', 'Urugwiro'],
  Kanombe: ['Kanombe I', 'Kanombe II', 'Busanza', 'Kabeza'],
  Gatsata: ['Gatsata I', 'Gatsata II', 'Muhororo', 'Rugando'],
}

export const VILLAGES_BY_CELL: Record<string, string[]> = {
  'Rukiri I': ['Umudugudu wa Kabuga', 'Umudugudu wa Nyamirambo', 'Umudugudu wa Kacyiru'],
  'Kanombe I': ['Umudugudu wa Kanombe', 'Umudugudu wa Nyarutarama', 'Umudugudu wa Kinyinya'],
  'Gatsata I': ['Umudugudu wa Gatsata', 'Umudugudu wa Bumbogo', 'Umudugudu wa Rusororo'],
}

export function getDistricts(provinceId: string) {
  return DISTRICTS_BY_PROVINCE[provinceId] ?? []
}

export function getSectors(districtId: string) {
  return SECTORS_BY_DISTRICT[districtId] ?? ['Umurenge wa Mbere', 'Umurenge wa Kabiri']
}

export function getCells(sector: string) {
  return CELLS_BY_SECTOR[sector] ?? ['Akagari ka Mbere', 'Akagari ka Kabiri']
}

export function getVillages(cell: string) {
  return VILLAGES_BY_CELL[cell] ?? ['Umudugudu wa Mbere', 'Umudugudu wa Kabiri']
}
