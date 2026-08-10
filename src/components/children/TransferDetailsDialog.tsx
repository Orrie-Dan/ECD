import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/children/StatusBadge'
import { calculateAge, formatDate } from '@/lib/mock-data'
import { caretaker } from '@/locales/rw/caretaker'
import { common, gender } from '@/locales/rw/common'
import type { Child, TransferReason } from '@/types'
import { ArrowRight } from 'lucide-react'

interface TransferDetailsDialogProps {
  open: boolean
  onClose: () => void
  child: Child
  onAccept?: () => void
}

function reasonLabel(reason?: string): string {
  if (!reason) return '—'
  const key = reason as TransferReason
  return caretaker.transfer.reasons[key] ?? reason
}

export function TransferDetailsDialog({
  open,
  onClose,
  child,
  onAccept,
}: TransferDetailsDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={caretaker.incomingTransfers.detailsTitle}
      size="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="tertiary" onClick={onClose} fullWidth className="sm:w-auto">
            {common.close}
          </Button>
          {onAccept && (
            <Button
              variant="primary"
              onClick={() => {
                onClose()
                onAccept()
              }}
              fullWidth
              className="sm:w-auto"
            >
              {caretaker.incomingTransfers.accept}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-background-subtle/60 p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-subheading text-text">{child.fullName}</p>
            <StatusBadge status={child.status} />
            <span className="inline-flex items-center rounded-full bg-warning-light px-2.5 py-0.5 text-caption font-semibold text-warning">
              {caretaker.incomingTransfers.statusPending}
            </span>
          </div>
          <p className="text-body text-text-secondary">
            {caretaker.children.age}: {calculateAge(child.dateOfBirth)} · {gender[child.gender]}
          </p>
          <p className="text-caption text-text-secondary font-mono">{child.registrationNumber}</p>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-caption text-text-muted font-semibold">
              {caretaker.incomingTransfers.guardian}
            </dt>
            <dd className="text-body text-text mt-1">{child.guardianName}</dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted font-semibold">
              {caretaker.incomingTransfers.phone}
            </dt>
            <dd className="text-body text-text mt-1 font-mono">{child.guardianPhone}</dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted font-semibold">
              {caretaker.incomingTransfers.transferDate}
            </dt>
            <dd className="text-body text-text mt-1">
              {child.transferredAt ? formatDate(child.transferredAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-text-muted font-semibold">
              {caretaker.incomingTransfers.reason}
            </dt>
            <dd className="text-body text-text mt-1">{reasonLabel(child.transferReason)}</dd>
          </div>
        </dl>

        <div className="rounded-xl border border-border p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-caption text-text-muted font-semibold">
                {caretaker.incomingTransfers.sourceCenter}
              </p>
              <p className="text-body font-semibold text-text break-words">{child.centerName}</p>
            </div>
            <ArrowRight size={18} className="text-text-muted shrink-0 hidden sm:block" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-caption text-text-muted font-semibold">
                {caretaker.incomingTransfers.destinationCenter}
              </p>
              <p className="text-body font-semibold text-text break-words">
                {child.transferredToCenterName ?? '—'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-caption text-text-muted font-semibold mb-1">
            {caretaker.incomingTransfers.notes}
          </p>
          <p className="text-body text-text-secondary">
            {child.transferNotes?.trim() || caretaker.incomingTransfers.noNotes}
          </p>
        </div>
      </div>
    </Modal>
  )
}
