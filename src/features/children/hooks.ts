/**
 * @deprecated Import from `@/features/children` (queries / mutations) instead.
 */
export { useChildrenList, useChildDetail } from './queries'
export {
  useCreateChild,
  useUpdateChild,
  useArchiveChild,
  useReactivateChild,
  useTransferChild,
  invalidateChildrenQueries,
} from './mutations'
