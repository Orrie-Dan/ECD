import { useEffect } from 'react'
import { Clock, User, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { caretaker } from '@/locales/rw/caretaker'
import { relations } from '@/locales/rw/common'
import { formatArrivalTime, getBroughtByLabel } from '@/lib/attendance-utils'
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

      <div className="relative w-full max-w-lg bg-surface rounded-xl border border-border shadow-lg">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 id="attendance-view-title" className="text-heading text-text">
              {child.fullName}
            </h2>
            <p className="text-caption mt-0.5">{caretaker.attendance.viewCheckIn}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-text-muted hover:bg-background-subtle"
            aria-label="Funga"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-background-subtle/60 border border-border">
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

          <div className="flex items-center gap-4 p-4 rounded-xl bg-background-subtle/60 border border-border">
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
        </div>

        <div className="px-6 py-5 border-t border-border bg-background-subtle/50">
          <Button variant="secondary" size="lg" fullWidth onClick={onClose}>
            {caretaker.attendance.close}
          </Button>
        </div>
      </div>
    </div>
  )
}
