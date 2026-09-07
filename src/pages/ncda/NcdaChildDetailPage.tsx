import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NcdaChildDetailContent } from '@/components/ncda/children/NcdaChildDetailContent'
import { env } from '@/config/env'
import { useNcdaChildDetail } from '@/features/ncda/children/queries'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'
import { common } from '@/locales/rw/common'
import { caretaker } from '@/locales/rw/caretaker'
import { isNotFoundError } from '@/api/errors'

/**
 * NCDA child detail — read-only national oversight using the same tab layout
 * as caretaker / ECD director ChildDetailContent.
 */
export function NcdaChildDetailPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.children.title}
          subtitle={ncda.children.detailSubtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.children.mockOnlyTitle}
            description={ncda.children.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaChildDetailLive />
}

function NcdaChildDetailLive() {
  const { childId = '' } = useParams<{ childId: string }>()
  const detail = useNcdaChildDetail(childId)

  if (detail.isLoading && !detail.data) {
    return (
      <PageContainer>
        <PageContent>
          <div className="space-y-4" aria-busy="true">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={6} />
          </div>
        </PageContent>
      </PageContainer>
    )
  }

  if (detail.isError && !detail.data) {
    const notFound = isNotFoundError(detail.error)
    return (
      <PageContainer>
        <PageContent>
          <EmptyState
            title={notFound ? caretaker.childDetail.notFound : ncda.children.detailError}
            description={
              notFound ? caretaker.childDetail.notFoundDesc : ncda.children.detailError
            }
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={NCDA_PATHS.children}
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            >
              <ArrowLeft size={18} aria-hidden />
              {ncda.children.backToList}
            </Link>
            {!notFound ? (
              <Button type="button" variant="primary" onClick={() => void detail.refetch()}>
                {ncda.children.retry}
              </Button>
            ) : null}
          </div>
        </PageContent>
      </PageContainer>
    )
  }

  if (!detail.data) {
    return (
      <PageContainer>
        <PageContent>
          <EmptyState
            title={caretaker.childDetail.notFound}
            description={caretaker.childDetail.notFoundDesc}
          />
          <Link
            to={NCDA_PATHS.children}
            className="inline-flex items-center gap-2 text-primary font-semibold mt-4 hover:underline"
          >
            <ArrowLeft size={18} aria-hidden />
            {ncda.children.backToList}
          </Link>
        </PageContent>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader title={detail.data.fullName} subtitle={ncda.children.detailSubtitle} size="compact" />
      <PageContent>
        <Link
          to={NCDA_PATHS.children}
          className="inline-flex items-center gap-2 text-body font-semibold text-text-secondary hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft size={18} aria-hidden />
          {common.back}
        </Link>
        <NcdaChildDetailContent child={detail.data} />
      </PageContent>
    </PageContainer>
  )
}
