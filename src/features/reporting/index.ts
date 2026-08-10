/**
 * Reporting domain feature module.
 *
 * Precedence:
 * 1. /reports/* for enrollment, dropouts, centers, district KPI shapes
 * 2. /monitoring/* for attendance & nutrition aggregates (canonical)
 * 3. Operational APIs for caretaker child-level attendance history
 *
 * No backend file export endpoints — UI export remains toast/mock.
 * No /reports/sectors — product gap.
 */
export {
  useEnrollmentReport,
  useDropoutsReport,
  useCentersReport,
  useDistrictReport,
} from './queries'
export {
  useReportingRepository,
  useDistrictAttendanceReport,
  useReportPreviewData,
} from './repository'
export * from './mappers'
export type * from './models'
export { datesToReportingRange, roundPct } from './utils/filters'
