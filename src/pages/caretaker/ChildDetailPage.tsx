import { useParams } from 'react-router-dom'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChildDetailContent } from '@/components/children/ChildDetailContent'
import { useData } from '@/contexts/AppContext'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'

export function ChildDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { children } = useData()
  const child = children.find((c) => c.id === id)

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
