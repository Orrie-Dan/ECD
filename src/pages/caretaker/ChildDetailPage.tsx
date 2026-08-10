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

export function ChildDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { children } = useData()
  const detailQuery = useChildDetail(id, env.isLive && !!id)
  const childFromList = children.find((c) => c.id === id)
  const child = env.isLive ? (detailQuery.data ?? childFromList) : childFromList

  if (env.isLive && detailQuery.isLoading && !child) {
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
