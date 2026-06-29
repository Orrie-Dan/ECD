/** Consistent chart colors across the ECD District module. */
export const CHART_METRIC_COLORS = {
  /** Ubururu — Abanditswe Bashya */
  newRegistrations: '#2563a8',
  /** Icyatsi — Ubwitabire */
  attendance: '#15803d',
  /** Umutuku — Abavuye */
  dropouts: '#b42318',
  /** Umuhonda — Ibibazo / Alerts */
  alerts: '#c47d1a',
  /** Ibigo byanditswe */
  schools: '#1a6b52',
  /** Abarezi */
  teachers: '#7c3aed',
} as const

export type ChartMetricKey = keyof typeof CHART_METRIC_COLORS
