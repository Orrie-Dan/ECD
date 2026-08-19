import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, TextArea } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AppContext'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import {
  useTransfersControllerCreate,
  getTransfersControllerFindOutgoingQueryKey,
} from '@/api/generated/endpoints/transfers/transfers'
import { useCentersControllerFindAll } from '@/api/generated/endpoints/centers/centers'
import { useQueryClient } from '@tanstack/react-query'

interface InitiateTransferModalProps {
  open: boolean
  onClose: () => void
  childId: string
  childName: string
  childVersion: number
  currentCenterId: string
}

const REASON_OPTIONS = [
  { value: 'relocation', label: caretaker.transfer.reasons.relocation },
  { value: 'guardian_request', label: caretaker.transfer.reasons.guardian_request },
  { value: 'centre_capacity', label: caretaker.transfer.reasons.centre_capacity },
  { value: 'other', label: caretaker.transfer.reasons.other },
]

export function InitiateTransferModal({
  open,
  onClose,
  childId,
  childName,
  childVersion,
  currentCenterId,
}: InitiateTransferModalProps) {
  const [toCenterId, setToCenterId] = useState('')
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { showToast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const districtId = user?.districtId
  const centersQuery = useCentersControllerFindAll(
    { districtId, pageSize: 100 },
    { query: { enabled: open } },
  )
  const createMutation = useTransfersControllerCreate()

  const centerOptions = (centersQuery.data?.items ?? [])
    .filter((c) => c.id !== currentCenterId)
    .map((c) => ({ value: c.id, label: c.name }))

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!toCenterId) e.toCenterId = caretaker.transfer.destinationRequired
    if (!transferDate) e.transferDate = caretaker.transfer.dateRequired
    if (!reason) e.reason = caretaker.transfer.reasonRequired
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    createMutation.mutate(
      {
        data: {
          childId,
          toCenterId,
          transferDate,
          reason: REASON_OPTIONS.find((r) => r.value === reason)?.label ?? reason,
          notes: notes.trim() || undefined,
          childVersion,
        },
      },
      {
        onSuccess: () => {
          showToast(`${childName} — ${caretaker.transfer.confirm}`, 'success')
          void queryClient.invalidateQueries({
            queryKey: getTransfersControllerFindOutgoingQueryKey(),
          })
          resetAndClose()
        },
        onError: () => showToast(common.error, 'error'),
      },
    )
  }

  const resetAndClose = () => {
    setToCenterId('')
    setTransferDate(new Date().toISOString().slice(0, 10))
    setReason('')
    setNotes('')
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={caretaker.transfer.title}
      size="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="tertiary" onClick={resetAndClose}>
            {common.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={createMutation.isPending}
            icon={<span aria-hidden="true">→</span>}
          >
            {caretaker.transfer.confirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-background-subtle border border-border px-4 py-3">
          <p className="text-caption text-text-muted mb-0.5">{caretaker.incomingTransfers.childName}</p>
          <p className="text-body font-semibold text-text">{childName}</p>
        </div>

        <FormField
          label={caretaker.transfer.destination}
          required
          error={errors.toCenterId}
        >
          <SearchableSelect
            value={toCenterId}
            onChange={(v) => {
              setToCenterId(v)
              setErrors((prev) => ({ ...prev, toCenterId: '' }))
            }}
            options={centerOptions}
            placeholder={caretaker.transfer.destinationPlaceholder}
            error={!!errors.toCenterId}
          />
        </FormField>

        <FormField
          label={caretaker.transfer.date}
          required
          error={errors.transferDate}
        >
          <TextInput
            type="date"
            value={transferDate}
            onChange={(e) => {
              setTransferDate(e.target.value)
              setErrors((prev) => ({ ...prev, transferDate: '' }))
            }}
            error={!!errors.transferDate}
          />
        </FormField>

        <FormField
          label={caretaker.transfer.reason}
          required
          error={errors.reason}
        >
          <SearchableSelect
            value={reason}
            onChange={(v) => {
              setReason(v)
              setErrors((prev) => ({ ...prev, reason: '' }))
            }}
            options={REASON_OPTIONS}
            placeholder={caretaker.transfer.reasonPlaceholder}
            error={!!errors.reason}
          />
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
