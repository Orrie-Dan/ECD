import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { caretaker } from '@/locales/rw/caretaker'
import { common, GUARDIAN_RELATION_OPTIONS, OTHER_RELATION_VALUE } from '@/locales/rw/common'
import type { BroughtBy, Child } from '@/types'

interface AttendanceRecordSheetProps {
  open: boolean
  child: Child | null
  broughtBy: BroughtBy | ''
  broughtByOther: string
  isEditing: boolean
  onBroughtByChange: (v: BroughtBy) => void
  onBroughtByOtherChange: (v: string) => void
  onClose: () => void
  onConfirm: () => void
}

export function AttendanceRecordSheet({
  open,
  child,
  broughtBy,
  broughtByOther,
  isEditing,
  onBroughtByChange,
  onBroughtByOtherChange,
  onClose,
  onConfirm,
}: AttendanceRecordSheetProps) {
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

  if (!open || !child) return null

  const canConfirm =
    !!broughtBy && (broughtBy !== OTHER_RELATION_VALUE || broughtByOther.trim().length > 0)

  const relationOptions = GUARDIAN_RELATION_OPTIONS

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-sheet-title"
    >
      <div className="absolute inset-0 bg-text/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg bg-surface rounded-t-2xl border border-border shadow-lg max-h-[85vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div>
            <h2 id="attendance-sheet-title" className="text-heading text-text">
              {child.fullName}
            </h2>
            <p className="text-caption mt-0.5">
              {isEditing ? caretaker.attendance.edit : caretaker.attendance.markArrived}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-text-muted hover:bg-background-subtle"
            aria-label={common.close}
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-6 py-5">
          <FormField label={caretaker.attendance.whoBrought} required>
            <SearchableSelect
              value={broughtBy}
              onChange={(v) => onBroughtByChange(v as BroughtBy)}
              options={relationOptions}
              placeholder={caretaker.registration.guardianRelationPlaceholder}
              aria-label={caretaker.attendance.whoBrought}
            />
          </FormField>

          {broughtBy === OTHER_RELATION_VALUE && (
            <div className="mt-5">
              <FormField label={caretaker.attendance.broughtByOther} required>
                <TextInput
                  value={broughtByOther}
                  onChange={(e) => onBroughtByOtherChange(e.target.value)}
                  placeholder={caretaker.attendance.broughtByOtherPlaceholder}
                  autoFocus
                />
              </FormField>
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-border bg-background-subtle/50 pb-8">
          <Button
            variant="success"
            size="xl"
            fullWidth
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {caretaker.attendance.confirm}
          </Button>
        </div>
      </div>
    </div>
  )
}
