import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/children/StatusBadge'
import { useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { calculateAge, formatDate } from '@/lib/mock-data'
import { caretaker } from '@/locales/rw/caretaker'
import { common, messages, gender } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import type { ArchiveReason, Child } from '@/types'

interface ReactivateChildDialogProps {
  open: boolean
  onClose: () => void
  child: Child
}

function archiveReasonLabel(reason?: string): string {
  if (!reason) return caretaker.childDetail.noArchiveReason
  const key = reason as ArchiveReason
  return caretaker.archive.reasons[key] ?? reason
}

export function ReactivateChildDialog({ open, onClose, child }: ReactivateChildDialogProps) {
  const { reactivateChild } = useData()
  const { showSuccess, showError } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await reactivateChild(child.id)
      showSuccess(messages.childReactivated)
      onClose()
    } catch (err) {
      showError(messageForMutationFailure(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={caretaker.reactivate.title}
      size="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="tertiary" onClick={onClose} fullWidth className="sm:w-auto">
            {common.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleConfirm()}
            fullWidth
            className="sm:w-auto"
            loading={submitting}
          >
            {caretaker.reactivate.confirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-background-subtle/60 p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-subheading text-text">{child.fullName}</p>
            <StatusBadge status={child.status} />
          </div>
          <p className="text-body text-text-secondary">
            {caretaker.children.age}: {calculateAge(child.dateOfBirth)} · {gender[child.gender]}
          </p>
          <p className="text-caption text-text-secondary font-mono">{child.registrationNumber}</p>
          {child.archivedAt && (
            <p className="text-body text-text-secondary">
              {caretaker.childDetail.archiveDate}: {formatDate(child.archivedAt)}
            </p>
          )}
          <p className="text-body text-text-secondary">
            {caretaker.childDetail.archiveReason}: {archiveReasonLabel(child.archiveReason)}
          </p>
        </div>

        <p className="text-body text-text-secondary leading-relaxed">
          {caretaker.reactivate.message.replace('{name}', child.fullName)}
        </p>
        <p className="text-caption text-text-muted">{caretaker.reactivate.hint}</p>
      </div>
    </Modal>
  )
}
