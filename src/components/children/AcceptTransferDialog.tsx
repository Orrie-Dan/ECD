import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/children/StatusBadge'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { env } from '@/config/env'
import { calculateAge, formatDate } from '@/lib/mock-data'
import { caretaker } from '@/locales/rw/caretaker'
import { common, messages, gender } from '@/locales/rw/common'
import type { Child, TransferReason } from '@/types'
import { ArrowRight } from 'lucide-react'

interface AcceptTransferDialogProps {
  open: boolean
  onClose: () => void
  child: Child
}

function reasonLabel(reason?: string): string {
  if (!reason) return '—'
  const key = reason as TransferReason
  return caretaker.transfer.reasons[key] ?? reason
}

export function AcceptTransferDialog({ open, onClose, child }: AcceptTransferDialogProps) {
  const { acceptTransfer } = useData()
  const { showSuccess, showError } = useToast()

  const handleConfirm = () => {
    if (env.isLive) {
      showError(messages.liveFeatureUnavailable)
      return
    }
    acceptTransfer(child.id)
    showSuccess(messages.childTransferAccepted)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={caretaker.incomingTransfers.acceptTitle}
      size="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="tertiary" onClick={onClose} fullWidth className="sm:w-auto">
            {common.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            fullWidth
            className="sm:w-auto"
            disabled={env.isLive}
          >
            {caretaker.incomingTransfers.acceptConfirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {env.isLive ? (
          <LiveUnavailableState
            compact
            title={common.live.transferAcceptUnavailable}
            description={common.live.unavailableDesc}
          />
        ) : null}

        <div className="rounded-xl border border-border bg-background-subtle/60 p-4 space-y-2">
          <p className="text-caption text-text-muted uppercase tracking-wide font-semibold">
            {caretaker.incomingTransfers.acceptSummary}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-subheading text-text">{child.fullName}</p>
            <StatusBadge status={child.status} />
          </div>
          <p className="text-body text-text-secondary">
            {caretaker.children.age}: {calculateAge(child.dateOfBirth)} · {gender[child.gender]}
          </p>
          <p className="text-caption text-text-secondary font-mono">{child.registrationNumber}</p>
          <p className="text-body text-text-secondary">
            {caretaker.incomingTransfers.guardian}: {child.guardianName}
          </p>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
            <div>
              <p className="text-caption text-text-muted font-semibold">
                {caretaker.incomingTransfers.transferDate}
              </p>
              <p className="text-body text-text">
                {child.transferredAt ? formatDate(child.transferredAt) : '—'}
              </p>
            </div>
            <div>
              <p className="text-caption text-text-muted font-semibold">
                {caretaker.incomingTransfers.reason}
              </p>
              <p className="text-body text-text">{reasonLabel(child.transferReason)}</p>
            </div>
          </div>
        </div>

        {!env.isLive ? (
          <p className="text-body text-text-secondary leading-relaxed">
            {caretaker.incomingTransfers.acceptHint}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
