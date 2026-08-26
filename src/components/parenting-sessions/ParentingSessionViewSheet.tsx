import { useEffect } from 'react'
import { X, Calendar, User, Users, MessageSquare, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import type { ParentingSessionViewModel } from '@/models/parenting-sessions'
import {
  formatAttendeeCount,
  formatFacilitatorLine,
  formatSessionDate,
} from '@/lib/parenting-session-format'

const copy = caretaker.director.parentingSessions

interface ParentingSessionViewSheetProps {
  open: boolean
  record: ParentingSessionViewModel | null
  canMutate: boolean
  onClose: () => void
  onEdit?: () => void
}

export function ParentingSessionViewSheet({
  open,
  record,
  canMutate,
  onClose,
  onEdit,
}: ParentingSessionViewSheetProps) {
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
      aria-labelledby="parenting-session-sheet-title"
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
            <p id="parenting-session-sheet-title" className="text-heading text-text">
              {copy.detailTitle}
            </p>
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
            icon={<BookOpen size={18} aria-hidden="true" />}
            label={copy.topic}
            value={record.topic}
          />
          <DetailRow
            icon={<Calendar size={18} aria-hidden="true" />}
            label={copy.sessionDate}
            value={formatSessionDate(record.sessionDate)}
          />
          <DetailRow
            icon={<User size={18} aria-hidden="true" />}
            label={copy.facilitator}
            value={formatFacilitatorLine(record)}
          />
          <DetailRow
            icon={<MessageSquare size={18} aria-hidden="true" />}
            label={copy.messageSummary}
            value={record.messageSummary}
          />
          <DetailRow
            icon={<Users size={18} aria-hidden="true" />}
            label={copy.attendanceBreakdown}
            value={`${copy.maleAttendees}: ${formatAttendeeCount(record.maleAttendees)} · ${copy.femaleAttendees}: ${formatAttendeeCount(record.femaleAttendees)} · ${copy.totalAttendees}: ${formatAttendeeCount(record.totalAttendees)}`}
          />
          {record.notes && <DetailRow label={copy.notes} value={record.notes} />}
        </CardContent>
        <CardFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end px-4 sm:px-6 py-4 border-t border-border shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-4">
          <Button variant="secondary" onClick={onClose}>
            {common.close}
          </Button>
          {canMutate && onEdit && (
            <Button variant="secondary" onClick={onEdit}>
              {copy.edit}
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
