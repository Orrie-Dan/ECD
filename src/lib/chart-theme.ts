/** Chart colors aligned to ECD design tokens (src/index.css @theme). */
export const CHART_METRIC_COLORS = {
  /** Secondary — Abanditswe Bashya */
  newRegistrations: '#2563a8',
  /** Success — Ubwitabire */
  attendance: '#15803d',
  /** Danger — Abavuye */
  dropouts: '#b42318',
  /** Accent — Ibibazo / Alerts */
  alerts: '#c47d1a',
  /** Primary — Ibigo */
  schools: '#1a6b52',
  /** Secondary (muted) — Abarezi */
  teachers: '#2563a8',
} as const

export type ChartMetricKey = keyof typeof CHART_METRIC_COLORS
