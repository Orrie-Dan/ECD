import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import type { TransferResponseDto } from '@/api/generated/models'
import { TransferStatus } from '@/api/generated/models/transferStatus'

const STATUS_BADGE: Record<string, BadgeVariant> = {
  pending: 'warning',
  accepted: 'success',
  cancelled: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  pending: caretaker.incomingTransfers.statusPending,
  accepted: caretaker.incomingTransfers.statusAccepted,
  cancelled: 'Byahagaritswe',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('rw-RW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

interface TransferDetailModalProps {
  transfer: TransferResponseDto | null
  direction: 'incoming' | 'outgoing'
  onClose: () => void
  onAccept: (t: TransferResponseDto) => void
  onCancel: (t: TransferResponseDto) => void
  accepting: boolean
  cancelling: boolean
  childName?: string
  fromCenterName?: string
  toCenterName?: string
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-text-muted mb-0.5">{label}</dt>
      <dd className="text-body text-text font-medium">{value}</dd>
    </div>
  )
}

export function TransferDetailModal({
  transfer,
  direction,
  onClose,
  onAccept,
  onCancel,
  accepting,
  cancelling,
  childName,
  fromCenterName,
  toCenterName,
}: TransferDetailModalProps) {
  if (!transfer) return null

  const isPending = transfer.status === TransferStatus.pending
  const canAccept = isPending && direction === 'incoming'
  const canCancel = isPending

  return (
    <Modal
      open={!!transfer}
      onClose={onClose}
      title={caretaker.incomingTransfers.detailsTitle}
      size="md"
      footer={
        isPending ? (
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            {canCancel && (
              <Button
                variant="danger"
                onClick={() => onCancel(transfer)}
                loading={cancelling}
                disabled={accepting}
              >
                {common.cancel}
              </Button>
            )}
            {canAccept && (
              <Button
                variant="primary"
                onClick={() => onAccept(transfer)}
                loading={accepting}
                disabled={cancelling}
              >
                {caretaker.incomingTransfers.acceptConfirm}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_BADGE[transfer.status] ?? 'neutral'} size="md">
            {STATUS_LABEL[transfer.status] ?? transfer.status}
          </Badge>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailRow
            label={caretaker.incomingTransfers.childName}
            value={childName || transfer.childId}
          />
          <DetailRow
            label={caretaker.incomingTransfers.sourceCenter}
            value={fromCenterName || transfer.fromCenterId}
          />
          <DetailRow
            label={caretaker.incomingTransfers.destinationCenter}
            value={toCenterName || transfer.toCenterId}
          />
          <DetailRow
            label={caretaker.incomingTransfers.transferDate}
            value={formatDate(transfer.transferDate)}
          />
          <DetailRow
            label={caretaker.transfer.reason}
            value={transfer.reason}
          />
          {transfer.notes && (
            <div className="sm:col-span-2">
              <DetailRow
                label={caretaker.incomingTransfers.notes}
                value={transfer.notes}
              />
            </div>
          )}
          {transfer.acceptedAt && (
            <DetailRow
              label="Byakiriwe ku"
              value={formatDate(transfer.acceptedAt)}
            />
          )}
        </dl>

        {canAccept && (
          <div className="rounded-xl bg-primary-light/40 border border-primary/20 px-4 py-3">
            <p className="text-body text-primary font-medium">
              {caretaker.incomingTransfers.acceptHint}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
