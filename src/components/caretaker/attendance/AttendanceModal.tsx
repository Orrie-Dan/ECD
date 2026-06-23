import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { caretaker } from '@/locales/rw/caretaker'
import { common, GUARDIAN_RELATION_OPTIONS, OTHER_RELATION_VALUE } from '@/locales/rw/common'
import type { BroughtBy, Child } from '@/types'

interface AttendanceModalProps {
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

export function AttendanceModal({
  open,
  child,
  broughtBy,
  broughtByOther,
  isEditing,
  onBroughtByChange,
  onBroughtByOtherChange,
  onClose,
  onConfirm,
}: AttendanceModalProps) {
  if (!child) return null

  const canConfirm =
    !!broughtBy && (broughtBy !== OTHER_RELATION_VALUE || broughtByOther.trim().length > 0)

  const relationOptions = GUARDIAN_RELATION_OPTIONS

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={caretaker.attendance.whoBrought}
      size="sm"
      footer={
        <>
          <Button variant="tertiary" size="md" onClick={onClose}>
            {common.close}
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {isEditing ? common.save : caretaker.attendance.confirm}
          </Button>
        </>
      }
    >
      <p className="text-body-lg font-semibold text-text mb-1">{child.fullName}</p>
      <p className="text-body text-text-secondary mb-5">
        {isEditing ? caretaker.attendance.edit : caretaker.attendance.whoBrought}
      </p>

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
              placeholder="Urugero: Mukuru w'umwana"
              autoFocus
            />
          </FormField>
        </div>
      )}
    </Modal>
  )
}
