import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextArea, SelectInput } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/children/StatusBadge'
import { useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { calculateAge } from '@/lib/mock-data'
import { caretaker } from '@/locales/rw/caretaker'
import { common, messages, gender } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import type { ArchiveReason, Child } from '@/types'

interface ArchiveDialogProps {
  open: boolean
  onClose: () => void
  child: Child
}

const REASON_OPTIONS: ArchiveReason[] = [
  'age_out',
  'moved_away',
  'guardian_request',
  'duplicate',
  'other',
]

export function ArchiveDialog({ open, onClose, child }: ArchiveDialogProps) {
  const { archiveChild } = useData()
  const { showSuccess, showError } = useToast()
  const [reason, setReason] = useState<ArchiveReason | ''>('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setReason('')
    setNotes('')
    setError(undefined)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!reason) {
      setError(caretaker.archive.reasonRequired)
      showError(messages.formIncomplete)
      return
    }

    setSubmitting(true)
    try {
      await archiveChild(child.id, {
        reason,
        notes: notes.trim() || undefined,
      })
      showSuccess(messages.childArchived)
      handleClose()
    } catch (err) {
      showError(messageForMutationFailure(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={caretaker.archive.title}
      size="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="tertiary" onClick={handleClose} fullWidth className="sm:w-auto">
            {common.cancel}
          </Button>
          <Button variant="danger" onClick={() => void handleSubmit()} fullWidth className="sm:w-auto" loading={submitting}>
            {caretaker.archive.confirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-background-subtle/60 p-4 space-y-2">
          <p className="text-caption text-text-muted uppercase tracking-wide font-semibold">
            {caretaker.archive.summary}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-subheading text-text">{child.fullName}</p>
            <StatusBadge status={child.status} />
          </div>
          <p className="text-body text-text-secondary">
            {caretaker.children.age}: {calculateAge(child.dateOfBirth)} · {gender[child.gender]}
          </p>
          {child.nationalId?.trim() ? (
            <p className="text-caption text-text-secondary font-mono">{child.nationalId.trim()}</p>
          ) : null}
        </div>

        <div
          className="flex gap-3 rounded-xl border border-warning/30 bg-warning-light/40 px-4 py-3"
          role="alert"
        >
          <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" aria-hidden />
          <p className="text-body text-text-secondary leading-relaxed">{caretaker.archive.warning}</p>
        </div>

        <FormField label={caretaker.archive.reason} required error={error}>
          <SelectInput
            value={reason}
            onChange={(e) => {
              setReason(e.target.value as ArchiveReason | '')
              setError(undefined)
            }}
            placeholder={caretaker.archive.reasonPlaceholder}
            error={!!error}
            aria-label={caretaker.archive.reason}
          >
            {REASON_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {caretaker.archive.reasons[key]}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label={caretaker.archive.notes}>
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={caretaker.archive.notesPlaceholder}
            rows={3}
          />
        </FormField>
      </div>
    </Modal>
  )
}
