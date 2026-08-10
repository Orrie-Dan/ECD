import { useEffect } from 'react'
import { Clock, User, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card'
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge'
import { caretaker } from '@/locales/rw/caretaker'
import { common, relations } from '@/locales/rw/common'
import {
  formatArrivalTime,
  getAbsentReasonLabel,
  getBroughtByLabel,
} from '@/lib/attendance-utils'
import type { AttendanceRecord, Child } from '@/types'

interface AttendanceViewSheetProps {
  open: boolean
  child: Child | null
  record: AttendanceRecord | null
  onClose: () => void
}

export function AttendanceViewSheet({ open, child, record, onClose }: AttendanceViewSheetProps) {
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

  if (!open || !child || !record) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-view-title"
    >
      <div className="absolute inset-0 bg-text/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <Card padding="none" className="relative w-full max-w-lg shadow-lg" elevated>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 id="attendance-view-title" className="text-heading text-text truncate">
                {child.fullName}
              </h2>
              <div className="mt-1.5">
                <AttendanceStatusBadge status={record.present ? 'present' : 'absent'} size="md" />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-text-muted hover:bg-surface-muted focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 shrink-0"
              aria-label={common.close}
            >
              <X size={22} />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {record.present ? (
            <>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-muted/60 border border-border">
                <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-secondary-light text-secondary shrink-0">
                  <Clock size={22} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-caption text-text-muted">{caretaker.attendance.arrivalTime}</p>
                  <p className="text-subheading text-text font-mono mt-0.5">
                    {formatArrivalTime(record.arrivedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-muted/60 border border-border">
                <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-light text-primary shrink-0">
                  <User size={22} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-caption text-text-muted">{caretaker.attendance.broughtByLabel}</p>
                  <p className="text-subheading text-text mt-0.5">
                    {getBroughtByLabel(record.broughtBy, record.broughtByOther, relations)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-muted/60 border border-border">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-warning-light text-warning shrink-0">
                <FileText size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="text-caption text-text-muted">{caretaker.attendance.absentReason}</p>
                <p className="text-subheading text-text mt-0.5">
                  {getAbsentReasonLabel(record.absentReason)}
                </p>
                {record.notes && (
                  <p className="text-body text-text-secondary mt-1">{record.notes}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-muted/60 border border-border">
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-surface-muted text-text-secondary shrink-0">
              <User size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-caption text-text-muted">{caretaker.attendance.recordedBy}</p>
              <p className="text-subheading text-text mt-0.5">{record.recordedBy ?? '—'}</p>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <Button variant="secondary" size="lg" fullWidth onClick={onClose}>
            {caretaker.attendance.close}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
