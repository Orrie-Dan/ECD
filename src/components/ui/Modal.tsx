import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { common } from '@/locales/rw/common'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-text/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`
          relative w-full ${sizeClasses[size]} bg-surface
          rounded-t-2xl sm:rounded-xl border border-border shadow-lg
          max-h-[90vh] flex flex-col
        `}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-border shrink-0 bg-surface gap-3">
          <h2 id="modal-title" className="text-heading text-text min-w-0">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="touch-target flex items-center justify-center rounded-xl text-text-muted hover:bg-background-subtle transition-colors shrink-0"
            aria-label={common.close}
          >
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">{children}</div>
        {footer && (
          <div className="shrink-0 px-4 sm:px-6 py-4 sm:py-5 border-t border-border bg-surface shadow-[0_-4px_16px_rgb(28_35_48/0.06)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = common.confirm,
  cancelLabel = common.cancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="tertiary" onClick={onClose} fullWidth className="sm:w-auto">
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm} fullWidth className="sm:w-auto">
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-body-lg text-text-secondary">{message}</p>
    </Modal>
  )
}
