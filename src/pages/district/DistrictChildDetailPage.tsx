import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChildDetailContent } from '@/components/children/ChildDetailContent'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { useData } from '@/contexts/AppContext'
import { useDistrictChildDetail } from '@/features/district/children/queries'
import { env } from '@/config/env'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import { isNotFoundError } from '@/api/errors'
import { findChildByRouteKey, isUuidLike } from '@/lib/child-routes'

export function DistrictChildDetailPage() {
  if (!env.isLive) {
    return <DistrictChildDetailPageMock />
  }
  return <DistrictChildDetailPageLive />
}

function DistrictChildDetailPageLive() {
  const { id: routeKey } = useParams<{ id: string }>()
  const { children, childrenLoading } = useData()
  const childFromList = findChildByRouteKey(children, routeKey)
  const childId = childFromList?.id ?? (isUuidLike(routeKey) ? routeKey : undefined)
  const detailQuery = useDistrictChildDetail(childId, !!childId)
  const child = detailQuery.data ?? childFromList

  if ((childrenLoading || detailQuery.isLoading) && !child) {
    return (
      <>
        <SkeletonCard lines={6} />
      </>
    )
  }

  if (detailQuery.isError) {
    const notFound = isNotFoundError(detailQuery.error)
    if (notFound) {
      return (
        <>
          <EmptyState title={district.children.notFound} description={district.children.notFoundDesc} />
          <Link
            to="/district/abana"
            className="inline-flex items-center gap-2 text-primary font-semibold mt-4 hover:underline"
          >
            <ArrowLeft size={18} aria-hidden />
            {common.back}
          </Link>
        </>
      )
    }
    return (
      <>
        <EmptyState title={common.error} description={common.live.unavailableDesc} />
        <Button
          type="button"
          variant="primary"
          className="mt-4"
          onClick={() => void detailQuery.refetch()}
        >
          {common.reset}
        </Button>
      </>
    )
  }

  if (!child) {
    return (
      <>
        <EmptyState title={district.children.notFound} description={district.children.notFoundDesc} />
        <Link
          to="/district/abana"
          className="inline-flex items-center gap-2 text-primary font-semibold mt-4 hover:underline"
        >
          <ArrowLeft size={18} aria-hidden />
          {common.back}
        </Link>
      </>
    )
  }

  return (
    <>
      <Link
        to="/district/abana"
        className="inline-flex items-center gap-2 text-body font-semibold text-text-secondary hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft size={18} aria-hidden />
        {common.back}
      </Link>
      <ChildDetailContent child={child} showActions={false} />
    </>
  )
}

function DistrictChildDetailPageMock() {
  const { id: routeKey } = useParams<{ id: string }>()
  const { children } = useData()
  // In MOCK we keep the original behavior: no live query; we only render from the LocalStore roster.
  const child = findChildByRouteKey(children, routeKey)

  if (!child) {
    return (
      <>
        <EmptyState title={district.children.notFound} description={district.children.notFoundDesc} />
        <Link
          to="/district/abana"
          className="inline-flex items-center gap-2 text-primary font-semibold mt-4 hover:underline"
        >
          <ArrowLeft size={18} aria-hidden />
          {common.back}
        </Link>
      </>
    )
  }

  return (
    <>
      <Link
        to="/district/abana"
        className="inline-flex items-center gap-2 text-body font-semibold text-text-secondary hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft size={18} aria-hidden />
        {common.back}
      </Link>
      <ChildDetailContent child={child} showActions={false} />
    </>
  )
}
