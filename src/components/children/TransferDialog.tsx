import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, TextArea, SelectInput } from '@/components/ui/FormField'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { ECD_CENTERS } from '@/lib/mock-data'
import { useCentersDirectory } from '@/features/centers'
import { caretaker } from '@/locales/rw/caretaker'
import { common, messages } from '@/locales/rw/common'
import type { Child, TransferReason } from '@/types'

interface TransferDialogProps {
  open: boolean
  onClose: () => void
  child: Child
}

const REASON_OPTIONS: TransferReason[] = [
  'relocation',
  'guardian_request',
  'centre_capacity',
  'other',
]

export function TransferDialog({ open, onClose, child }: TransferDialogProps) {
  const { transferChild } = useData()
  const { showSuccess, showError } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const liveCentersQuery = useCentersDirectory({ page: 1, pageSize: 100 }, open && env.isLive)

  const centres = useMemo(() => {
    if (env.isLive) {
      return (liveCentersQuery.data?.items ?? [])
        .filter((c) => c.id !== child.centerId)
        .map((c) => ({
          id: c.id,
          name: c.name,
          label: c.districtName ? `${c.name} — ${c.districtName}` : c.name,
        }))
    }
    return ECD_CENTERS.filter((c) => c.id !== child.centerId).map((c) => ({
      id: c.id,
      name: c.name.startsWith('ECD ') || c.name.startsWith('Ikigo') ? c.name : `ECD ${c.name}`,
      label: `${c.name} — ${c.sector}`,
    }))
  }, [child.centerId, liveCentersQuery.data?.items])

  const [destinationCenterId, setDestinationCenterId] = useState('')
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState<TransferReason | ''>('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Partial<Record<'destination' | 'date' | 'reason', string>>>({})

  const reset = () => {
    setDestinationCenterId('')
    setTransferDate(new Date().toISOString().split('T')[0])
    setReason('')
    setNotes('')
    setErrors({})
    setIsSubmitting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    const nextErrors: typeof errors = {}
    if (!destinationCenterId) nextErrors.destination = caretaker.transfer.destinationRequired
    if (!transferDate) nextErrors.date = caretaker.transfer.dateRequired
    if (!reason) nextErrors.reason = caretaker.transfer.reasonRequired
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      showError(messages.formIncomplete)
      return
    }

    const centre = centres.find((c) => c.id === destinationCenterId)
    if (!centre) return

    setIsSubmitting(true)
    try {
      await transferChild(child.id, {
        destinationCenterId: centre.id,
        destinationCenterName: centre.name,
        transferDate,
        reason: reason as TransferReason,
        notes: notes.trim() || undefined,
      })
      showSuccess(messages.childTransferred)
      handleClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : messages.liveFeatureUnavailable
      showError(message)
      setIsSubmitting(false)
    }
  }

  const liveDestinationsBlocked =
    env.isLive && (liveCentersQuery.isError || (!liveCentersQuery.isLoading && centres.length === 0))

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={caretaker.transfer.title}
      size="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="tertiary" onClick={handleClose} fullWidth className="sm:w-auto">
            {common.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSubmit()}
            fullWidth
            className="sm:w-auto"
            disabled={isSubmitting || liveDestinationsBlocked || (env.isLive && liveCentersQuery.isLoading)}
          >
            {caretaker.transfer.confirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-body text-text-secondary">
          <span className="font-semibold text-text">{child.fullName}</span>
          {' · '}
          {child.centerName}
        </p>

        {env.isLive && liveCentersQuery.isLoading ? (
          <p className="text-body text-text-secondary">{common.live.transferDestinationsLoading}</p>
        ) : null}

        {env.isLive && liveCentersQuery.isError ? (
          <LiveUnavailableState
            compact
            title={common.live.transferDestinationsError}
            description={common.live.unavailableDesc}
          />
        ) : null}

        {env.isLive && !liveCentersQuery.isLoading && !liveCentersQuery.isError && centres.length === 0 ? (
          <LiveUnavailableState
            compact
            title={common.live.transferDestinationsEmpty}
            description={common.live.unavailableDesc}
          />
        ) : null}

        <FormField label={caretaker.transfer.destination} required error={errors.destination}>
          <SelectInput
            value={destinationCenterId}
            onChange={(e) => {
              setDestinationCenterId(e.target.value)
              setErrors((prev) => ({ ...prev, destination: undefined }))
            }}
            placeholder={caretaker.transfer.destinationPlaceholder}
            error={!!errors.destination}
            aria-label={caretaker.transfer.destination}
            disabled={env.isLive && (liveCentersQuery.isLoading || liveDestinationsBlocked)}
          >
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label={caretaker.transfer.date} required error={errors.date}>
          <TextInput
            type="date"
            value={transferDate}
            onChange={(e) => {
              setTransferDate(e.target.value)
              setErrors((prev) => ({ ...prev, date: undefined }))
            }}
            error={!!errors.date}
          />
        </FormField>

        <FormField label={caretaker.transfer.reason} required error={errors.reason}>
          <SelectInput
            value={reason}
            onChange={(e) => {
              setReason(e.target.value as TransferReason | '')
              setErrors((prev) => ({ ...prev, reason: undefined }))
            }}
            placeholder={caretaker.transfer.reasonPlaceholder}
            error={!!errors.reason}
            aria-label={caretaker.transfer.reason}
          >
            {REASON_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {caretaker.transfer.reasons[key]}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label={caretaker.transfer.notes}>
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={caretaker.transfer.notesPlaceholder}
            rows={3}
          />
        </FormField>
      </div>
    </Modal>
  )
}
