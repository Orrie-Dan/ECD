import { Check, X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { caretaker } from '@/locales/rw/caretaker'

interface AttendanceActionsProps {
  childName: string
  mode: 'record' | 'edit'
  onMarkPresent?: () => void
  onMarkAbsent?: () => void
  onEdit?: () => void
}

/** Bottom action row for attendance cards — always equal-width, pinned controls. */
export function AttendanceActions({
  childName,
  mode,
  onMarkPresent,
  onMarkAbsent,
  onEdit,
}: AttendanceActionsProps) {
  if (mode === 'edit') {
    return (
      <div className="grid grid-cols-1 gap-2">
        <Button
          variant="secondary"
          size="md"
          fullWidth
          icon={<Pencil size={18} />}
          onClick={onEdit}
          aria-label={`${caretaker.attendance.edit}: ${childName}`}
          className="min-h-11"
        >
          {caretaker.attendance.edit}
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="success"
        size="md"
        fullWidth
        icon={<Check size={18} strokeWidth={2.5} />}
        onClick={onMarkPresent}
        aria-label={`${caretaker.attendance.markArrived}: ${childName}`}
        className="min-h-11"
      >
        {caretaker.attendance.markArrived}
      </Button>
      <Button
        variant="secondary"
        size="md"
        fullWidth
        icon={<X size={18} />}
        onClick={onMarkAbsent}
        aria-label={`${caretaker.attendance.markAbsent}: ${childName}`}
        className="min-h-11"
      >
        {caretaker.attendance.markAbsent}
      </Button>
    </div>
  )
}
