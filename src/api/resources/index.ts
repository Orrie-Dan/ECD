/**

 * Typed API resources for feature hooks.

 * Prefer domain modules over raw generated endpoints.

 */

export * from './auth'

export * from './children'

export * from './attendance'

export * from './growth'

export * from './nutrition'

export * from './feeding'

export * from './sted'

export * from './referrals'

export * from './monitoring'

export * from './reporting'

export * from './centers'

// Remaining domains stay as generated re-exports until migrated.

export * from '@/api/generated/endpoints/transfers/transfers'

export * from '@/api/generated/endpoints/centers/centers'

export * from '@/api/generated/endpoints/devices/devices'

export * from '@/api/generated/endpoints/users/users'

export * from '@/api/generated/endpoints/sync/sync'

export * from '@/api/generated/endpoints/analytics/analytics'

export * from '@/api/generated/endpoints/alerts/alerts'

export * from '@/api/generated/endpoints/monitoring/monitoring'

export * from '@/api/generated/endpoints/reports/reports'

export * from '@/api/generated/endpoints/audit-logs/audit-logs'

export * from '@/api/generated/endpoints/settings/settings'

export * from '@/api/generated/endpoints/geo/geo'

export * from '@/api/generated/endpoints/compliance/compliance'

export * from '@/api/generated/endpoints/wash/wash'


