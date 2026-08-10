import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChildDetailContent } from '@/components/children/ChildDetailContent'
import { useData } from '@/contexts/AppContext'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'

export function DistrictChildDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { children } = useData()
  const child = children.find((c) => c.id === id)

  if (!child) {
    return (
      <DistrictLayout>
        <EmptyState title={district.children.notFound} description={district.children.notFoundDesc} />
        <Link
          to="/district/abana"
          className="inline-flex items-center gap-2 text-primary font-semibold mt-4 hover:underline"
        >
          <ArrowLeft size={18} aria-hidden />
          {common.back}
        </Link>
      </DistrictLayout>
    )
  }

  return (
    <DistrictLayout>
      <Link
        to="/district/abana"
        className="inline-flex items-center gap-2 text-body font-semibold text-text-secondary hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft size={18} aria-hidden />
        {common.back}
      </Link>
      <ChildDetailContent child={child} />
    </DistrictLayout>
  )
}
