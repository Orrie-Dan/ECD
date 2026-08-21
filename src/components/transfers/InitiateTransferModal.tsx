import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, TextArea } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { StatusBadge } from '@/components/children/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AppContext'
import { calculateAge, formatDate } from '@/lib/mock-data'
import { getGuardianRelationLabel } from '@/lib/guardian-relations'
import { caretaker } from '@/locales/rw/caretaker'
import { common, gender } from '@/locales/rw/common'
import {
  useTransfersControllerCreate,
  getTransfersControllerFindOutgoingQueryKey,
} from '@/api/generated/endpoints/transfers/transfers'
import { transfers } from '@/api/query-keys'
import { useCentersControllerFindAll } from '@/api/generated/endpoints/centers/centers'
import { useQueryClient } from '@tanstack/react-query'
import type { Child } from '@/types'
import { env } from '@/config/env'
import { invalidateChildrenQueries } from '@/features/children/mutations'
import {
  markChildPendingTransferLocal,
} from '@/features/children/transfer-local'
import { getLocalStore } from '@/storage'
import { getSyncEngine } from '@/sync/sync-engine'

interface InitiateTransferModalProps {
  open: boolean
  onClose: () => void
  child: Child
}

const REASON_OPTIONS = [
  { value: 'relocation', label: caretaker.transfer.reasons.relocation },
  { value: 'guardian_request', label: caretaker.transfer.reasons.guardian_request },
  { value: 'centre_capacity', label: caretaker.transfer.reasons.centre_capacity },
  { value: 'other', label: caretaker.transfer.reasons.other },
]

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null
  return (
    <div>
      <dt className="text-caption text-text-muted mb-0.5">{label}</dt>
      <dd className="text-body text-text font-medium">{value}</dd>
    </div>
  )
}

function homeLocation(child: Child): string {
  return [child.village, child.cell, child.sector, child.district].filter(Boolean).join(', ')
}

export function InitiateTransferModal({
  open,
  onClose,
  child,
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
    .filter((c) => c.id !== child.centerId)
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
          childId: child.id,
          toCenterId,
          transferDate,
          reason: REASON_OPTIONS.find((r) => r.value === reason)?.label ?? reason,
          notes: notes.trim() || undefined,
          childVersion: child.version ?? 0,
        },
      },
      {
        onSuccess: () => {
          showToast(`${child.fullName} — ${caretaker.transfer.confirm}`, 'success')
          void queryClient.invalidateQueries({
            queryKey: getTransfersControllerFindOutgoingQueryKey(),
          })
          void queryClient.invalidateQueries({ queryKey: transfers.keys.all })
          if (env.isLive) {
            void markChildPendingTransferLocal(getLocalStore(), child.id).then(() =>
              invalidateChildrenQueries(queryClient, child.id),
            )
            void getSyncEngine().syncNow()
          } else {
            void invalidateChildrenQueries(queryClient, child.id)
          }
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
        <div className="rounded-xl border border-border bg-background-subtle/60 p-4 space-y-3">
          <p className="text-caption text-text-muted uppercase tracking-wide font-semibold">
            {caretaker.transfer.summary}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-subheading text-text">{child.fullName}</p>
            <StatusBadge status={child.status} />
          </div>
          <p className="text-body text-text-secondary">
            {caretaker.children.age}: {calculateAge(child.dateOfBirth)} · {gender[child.gender]} ·{' '}
            {formatDate(child.dateOfBirth)}
          </p>
          {child.nationalId?.trim() ? (
            <p className="text-caption text-text-secondary font-mono">{child.nationalId.trim()}</p>
          ) : null}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border">
            <SummaryRow
              label={caretaker.transfer.currentCenter}
              value={child.centerName}
            />
            {child.classroomLabel ? (
              <SummaryRow
                label={caretaker.classrooms.gradeLabel}
                value={child.classroomLabel}
              />
            ) : null}
            <SummaryRow
              label={caretaker.incomingTransfers.guardian}
              value={child.guardianName}
            />
            <SummaryRow
              label={caretaker.incomingTransfers.phone}
              value={child.guardianPhone}
            />
            <SummaryRow
              label={common.labels.relation}
              value={getGuardianRelationLabel(child.guardianRelation)}
            />
            <SummaryRow
              label={caretaker.registration.reviewLocation}
              value={homeLocation(child)}
            />
          </dl>
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
