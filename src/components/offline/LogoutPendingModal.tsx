import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { common, messages } from '@/locales/rw/common'
import type { LogoutAction } from '@/offline/logout-policy'

interface LogoutPendingModalProps {
  open: boolean
  pendingCount: number
  message: string
  syncBusy?: boolean
  onClose: () => void
  onAction: (action: LogoutAction) => void
}

/**
 * Three-choice logout when unsynced work exists:
 * Sync then logout | Keep on device | Discard (with confirm).
 */
export function LogoutPendingModal({
  open,
  pendingCount,
  message,
  syncBusy = false,
  onClose,
  onAction,
}: LogoutPendingModalProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  if (!open) return null

  if (confirmDiscard) {
    return (
      <Modal
        open={open}
        onClose={() => setConfirmDiscard(false)}
        title={common.sync.logoutDiscardConfirmTitle}
        size="sm"
        footer={
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setConfirmDiscard(false)
                onAction('discard_local')
              }}
            >
              {common.sync.logoutDiscard}
            </Button>
            <Button variant="tertiary" fullWidth onClick={() => setConfirmDiscard(false)}>
              {common.cancel}
            </Button>
          </div>
        }
      >
        <p className="text-body-lg text-text-secondary">{common.sync.logoutDiscardConfirm}</p>
        <p className="text-caption text-warning mt-3">
          {common.sync.pending.replace('{count}', String(pendingCount))}
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={common.logout}
      size="sm"
      footer={
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            fullWidth
            disabled={syncBusy}
            onClick={() => onAction('sync_then_logout')}
          >
            {syncBusy ? common.sync.syncingBusy : common.sync.logoutSync}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            disabled={syncBusy}
            onClick={() => onAction('keep_on_device')}
          >
            {common.sync.logoutKeep}
          </Button>
          <Button
            variant="tertiary"
            fullWidth
            disabled={syncBusy}
            onClick={() => setConfirmDiscard(true)}
          >
            {common.sync.logoutDiscard}
          </Button>
          <Button variant="tertiary" fullWidth disabled={syncBusy} onClick={onClose}>
            {common.cancel}
          </Button>
        </div>
      }
    >
      <p className="text-body-lg text-text-secondary">{message}</p>
    </Modal>
  )
}

interface LogoutSimpleModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

/** Clean logout (no pending) — keep-on-device by default. */
export function LogoutSimpleModal({ open, onClose, onConfirm }: LogoutSimpleModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={common.logout}
      size="sm"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="tertiary" onClick={onClose} fullWidth className="sm:w-auto">
            {common.no}
          </Button>
          <Button variant="primary" onClick={onConfirm} fullWidth className="sm:w-auto">
            {common.yes}
          </Button>
        </div>
      }
    >
      <p className="text-body-lg text-text-secondary">{messages.confirmLogout}</p>
    </Modal>
  )
}
