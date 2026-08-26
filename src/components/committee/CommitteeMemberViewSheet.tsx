import { useEffect } from 'react'
import { X, User, Phone, Briefcase, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import type { CommitteeMemberViewModel } from '@/models/committee-members'
import {
  formatCommitteePhone,
  formatCommitteeStatus,
  formatMembershipSpan,
} from '@/lib/committee-educator-format'

const copy = caretaker.director.committee

interface CommitteeMemberViewSheetProps {
  open: boolean
  record: CommitteeMemberViewModel | null
  canMutate: boolean
  onClose: () => void
  onEdit?: () => void
  onDeactivate?: () => void
}

export function CommitteeMemberViewSheet({
  open,
  record,
  canMutate,
  onClose,
  onEdit,
  onDeactivate,
}: CommitteeMemberViewSheetProps) {
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

  if (!open || !record) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="committee-member-sheet-title"
    >
      <div
        className="absolute inset-0 bg-text/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <Card
        elevated
        padding="none"
        className="relative w-full max-w-lg rounded-t-2xl sm:rounded-xl max-h-[min(90vh,100dvh)] flex flex-col overflow-hidden"
      >
        <CardHeader className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <p id="committee-member-sheet-title" className="text-heading text-text">
              {copy.detailTitle}
            </p>
            <p className="text-body font-semibold text-text mt-1">{record.fullName}</p>
            <div className="mt-2">
              <Badge variant={record.isActive ? 'success' : 'neutral'}>
                {formatCommitteeStatus(record.isActive)}
              </Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target flex items-center justify-center rounded-xl text-text-muted hover:bg-background-subtle"
            aria-label={common.close}
          >
            <X size={22} />
          </button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          <DetailRow
            icon={<Briefcase size={18} aria-hidden="true" />}
            label={copy.position}
            value={record.position}
          />
          <DetailRow
            icon={<Phone size={18} aria-hidden="true" />}
            label={copy.phone}
            value={formatCommitteePhone(record.phone)}
          />
          <DetailRow
            icon={<Calendar size={18} aria-hidden="true" />}
            label={copy.membership}
            value={formatMembershipSpan(record)}
          />
          <DetailRow
            icon={<User size={18} aria-hidden="true" />}
            label={copy.status}
            value={formatCommitteeStatus(record.isActive)}
          />
          {record.notes && <DetailRow label={copy.notes} value={record.notes} />}
        </CardContent>
        <CardFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end px-4 sm:px-6 py-4 border-t border-border shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-4">
          <Button variant="secondary" onClick={onClose}>
            {common.close}
          </Button>
          {canMutate && record.isActive && onEdit && (
            <Button variant="secondary" onClick={onEdit}>
              {copy.edit}
            </Button>
          )}
          {canMutate && record.isActive && onDeactivate && (
            <Button variant="danger" onClick={onDeactivate}>
              {copy.deactivate}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-background-subtle px-4 py-3">
      <div className="flex items-center gap-2 text-caption text-text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-body font-semibold text-text mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  )
}
