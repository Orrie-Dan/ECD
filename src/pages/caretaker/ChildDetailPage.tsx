import { useParams } from 'react-router-dom'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChildDetailContent } from '@/components/children/ChildDetailContent'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useData } from '@/contexts/AppContext'
import { useChildDetail } from '@/features/children'
import { env } from '@/config/env'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { findChildByRouteKey, isUuidLike } from '@/lib/child-routes'

export function ChildDetailPage() {
  const { id: routeKey } = useParams<{ id: string }>()
  const { children, childrenLoading } = useData()
  const childFromList = findChildByRouteKey(children, routeKey)
  const childId = childFromList?.id ?? (isUuidLike(routeKey) ? routeKey : undefined)
  const detailQuery = useChildDetail(childId, env.isLive && !!childId)
  const child = env.isLive ? (detailQuery.data ?? childFromList) : childFromList

  if (env.isLive && (childrenLoading || detailQuery.isLoading) && !child) {
    return (
      <CaretakerLayout pageTitle={caretaker.childDetail.title} backTo="/caretaker/abana" backLabel={common.back}>
        <div className="space-y-4" aria-busy="true">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={6} />
        </div>
      </CaretakerLayout>
    )
  }

  if (env.isLive && detailQuery.isError && !child) {
    return (
      <CaretakerLayout pageTitle={caretaker.childDetail.title} backTo="/caretaker/abana" backLabel={common.back}>
        <EmptyState title={caretaker.childDetail.notFound} description={caretaker.childDetail.notFoundDesc} />
      </CaretakerLayout>
    )
  }

  if (!child) {
    return (
      <CaretakerLayout pageTitle={caretaker.childDetail.title} backTo="/caretaker/abana" backLabel={common.back}>
        <EmptyState title={caretaker.childDetail.notFound} description={caretaker.childDetail.notFoundDesc} />
      </CaretakerLayout>
    )
  }

  return (
    <CaretakerLayout pageTitle={child.fullName} backTo="/caretaker/abana" backLabel={common.back}>
      <ChildDetailContent child={child} />
    </CaretakerLayout>
  )
}
