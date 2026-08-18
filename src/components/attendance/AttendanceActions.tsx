import { Check, X, Pencil, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { caretaker } from '@/locales/rw/caretaker'

interface AttendanceActionsProps {
  childName: string
  mode: 'record' | 'edit'
  /** Smaller hit area; keeps the same success / secondary colors as the original cards. */
  compact?: boolean
  fullWidth?: boolean
  onMarkPresent?: () => void
  onMarkAbsent?: () => void
  onEdit?: () => void
  onView?: () => void
}

const COMPACT_CLASS = 'min-h-9! px-3! text-body'

/** Bottom action row for attendance cards — always equal-width, pinned controls. */
export function AttendanceActions({
  childName,
  mode,
  compact = false,
  fullWidth = true,
  onMarkPresent,
  onMarkAbsent,
  onEdit,
  onView,
}: AttendanceActionsProps) {
  const iconSize = compact ? 16 : 18
  const rowClass = fullWidth ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap justify-end gap-2'
  const buttonClass = compact ? COMPACT_CLASS : undefined

  if (mode === 'edit') {
    if (onView) {
      return (
        <div className={rowClass}>
          <Button
            variant="secondary"
            size="md"
            fullWidth={fullWidth}
            className={buttonClass}
            icon={<Eye size={iconSize} />}
            onClick={onView}
            aria-label={`${caretaker.attendance.view}: ${childName}`}
          >
            {caretaker.attendance.view}
          </Button>
          <Button
            variant="secondary"
            size="md"
            fullWidth={fullWidth}
            className={buttonClass}
            icon={<Pencil size={iconSize} />}
            onClick={onEdit}
            aria-label={`${caretaker.attendance.edit}: ${childName}`}
          >
            {caretaker.attendance.edit}
          </Button>
        </div>
      )
    }

    return (
      <div className={fullWidth ? 'grid grid-cols-1 gap-2' : 'flex justify-end'}>
        <Button
          variant="secondary"
          size="md"
          fullWidth={fullWidth}
          className={buttonClass}
          icon={<Pencil size={iconSize} />}
          onClick={onEdit}
          aria-label={`${caretaker.attendance.edit}: ${childName}`}
        >
          {caretaker.attendance.edit}
        </Button>
      </div>
    )
  }

  return (
    <div className={rowClass}>
      <Button
        variant="success"
        size="md"
        fullWidth={fullWidth}
        className={buttonClass}
        icon={<Check size={iconSize} strokeWidth={2.5} />}
        onClick={onMarkPresent}
        aria-label={`${caretaker.attendance.markArrived}: ${childName}`}
      >
        {caretaker.attendance.markArrived}
      </Button>
      <Button
        variant="secondary"
        size="md"
        fullWidth={fullWidth}
        className={buttonClass}
        icon={<X size={iconSize} />}
        onClick={onMarkAbsent}
        aria-label={`${caretaker.attendance.markAbsent}: ${childName}`}
      >
        {caretaker.attendance.markAbsent}
      </Button>
    </div>
  )
}
