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
  present: '#15803d',
  absent: '#b45309',
  nutritionNormal: '#15803d',
  nutritionAtRisk: '#c47d1a',
  nutritionModerate: '#b45309',
  nutritionSevere: '#b42318',
  referralPending: '#c47d1a',
  referralCompleted: '#15803d',
  referralCancelled: '#6b7280',
  referralCreated: '#2563a8',
  feedingMilk: '#2563a8',
  feedingPorridge: '#c47d1a',
  feedingBalanced: '#1a6b52',
  washWater: '#2563a8',
  washSanitation: '#1a6b52',
  washHandwashing: '#0f766e',
  washWaste: '#c47d1a',
  childrenActive: '#1a6b52',
  childrenArchived: '#6b7280',
  childrenTransferred: '#2563a8',
} as const

/** Sequential palette for categorical slices (compliance status, STED bands, etc.). */
export const CHART_PALETTE = [
  '#1a6b52',
  '#2563a8',
  '#c47d1a',
  '#15803d',
  '#b42318',
  '#b45309',
  '#0f766e',
  '#64748b',
] as const

export type ChartMetricKey = keyof typeof CHART_METRIC_COLORS
