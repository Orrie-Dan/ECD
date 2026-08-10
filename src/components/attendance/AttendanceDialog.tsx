import { useEffect, useId, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, TextArea, SelectInput } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { caretaker } from '@/locales/rw/caretaker'
import { common, GUARDIAN_RELATION_OPTIONS, OTHER_RELATION_VALUE, messages } from '@/locales/rw/common'
import { useToast } from '@/components/ui/Toast'
import {
  getTodayDate,
  isoFromDateAndTime,
  timeInputFromIso,
} from '@/lib/attendance-utils'
import type { AbsentReason, AttendanceRecord, BroughtBy, Child } from '@/types'

const ABSENT_REASONS: AbsentReason[] = ['sick', 'family', 'transport', 'weather', 'other']

export interface AttendanceDialogResult {
  present: boolean
  arrivedAt?: string
  broughtBy?: BroughtBy
  broughtByOther?: string
  absentReason?: AbsentReason
  notes?: string
}

interface AttendanceDialogProps {
  open: boolean
  child: Child | null
  existing?: AttendanceRecord | null
  /** Prefill present/absent when opening from a quick action */
  initialPresent?: boolean | null
  recordedBy: string
  onClose: () => void
  onConfirm: (result: AttendanceDialogResult) => void
}

export function AttendanceDialog({
  open,
  child,
  existing,
  initialPresent = null,
  recordedBy,
  onClose,
  onConfirm,
}: AttendanceDialogProps) {
  const { showError } = useToast()
  const statusGroupId = useId()
  const today = getTodayDate()

  const [present, setPresent] = useState<boolean | null>(null)
  const [arrivalTime, setArrivalTime] = useState('')
  const [broughtBy, setBroughtBy] = useState<BroughtBy | ''>('')
  const [broughtByOther, setBroughtByOther] = useState('')
  const [absentReason, setAbsentReason] = useState<AbsentReason | ''>('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return

    const nextPresent =
      initialPresent !== null && initialPresent !== undefined
        ? initialPresent
        : existing
          ? existing.present
          : null

    setPresent(nextPresent)
    setArrivalTime(timeInputFromIso(existing?.arrivedAt))
    setBroughtBy(existing?.broughtBy ?? '')
    setBroughtByOther(existing?.broughtByOther ?? '')
    setAbsentReason(existing?.absentReason ?? '')
    setNotes(existing?.notes ?? '')
    setErrors({})
  }, [open, child?.id, existing?.id, initialPresent])

  if (!child) return null

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (present === null) {
      next.status = common.required
    } else if (present) {
      if (!arrivalTime) next.arrivalTime = caretaker.attendance.arrivalTimeRequired
      if (!broughtBy) next.broughtBy = common.required
      if (broughtBy === OTHER_RELATION_VALUE && !broughtByOther.trim()) {
        next.broughtByOther = common.required
      }
    } else {
      if (!absentReason) next.absentReason = caretaker.attendance.absentReasonRequired
      if (absentReason === 'other' && !notes.trim()) {
        next.notes = caretaker.attendance.notesRequired
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleConfirm = () => {
    if (!validate()) {
      showError(messages.formIncomplete)
      return
    }

    if (present) {
      onConfirm({
        present: true,
        arrivedAt: isoFromDateAndTime(existing?.date ?? today, arrivalTime),
        broughtBy: broughtBy as BroughtBy,
        broughtByOther:
          broughtBy === OTHER_RELATION_VALUE ? broughtByOther.trim() : undefined,
        notes: notes.trim() || undefined,
      })
    } else {
      onConfirm({
        present: false,
        absentReason: absentReason as AbsentReason,
        notes: notes.trim() || undefined,
      })
    }
  }

  const confirmLabel =
    present === true
      ? caretaker.attendance.confirmPresent
      : present === false
        ? caretaker.attendance.confirmAbsent
        : caretaker.attendance.confirm

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={caretaker.attendance.dialogTitle}
      size="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="tertiary" onClick={onClose} fullWidth className="sm:w-auto">
            {common.cancel}
          </Button>
          <Button variant="primary" onClick={handleConfirm} fullWidth className="sm:w-auto">
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-body-lg font-semibold text-text">{child.fullName}</p>
          <p className="text-caption text-text-secondary mt-0.5">
            {caretaker.attendance.recordedBy}: {recordedBy}
          </p>
        </div>

        <fieldset>
          <legend className="text-body font-semibold text-text mb-2">
            {caretaker.attendance.chooseStatus}
            <span className="text-error ml-1" aria-hidden>
              *
            </span>
          </legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby={statusGroupId}>
            <span id={statusGroupId} className="sr-only">
              {caretaker.attendance.chooseStatus}
            </span>
            <button
              type="button"
              role="radio"
              aria-checked={present === true}
              onClick={() => {
                setPresent(true)
                setErrors((e) => {
                  const { status: _s, ...rest } = e
                  return rest
                })
              }}
              className={`min-h-11 rounded-xl border-2 px-3 py-2.5 text-body font-semibold transition-all focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 ${
                present === true
                  ? 'border-success bg-success-light text-success'
                  : 'border-border bg-surface text-text-secondary hover:border-success/40'
              }`}
            >
              {caretaker.attendance.markArrived}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={present === false}
              onClick={() => {
                setPresent(false)
                setErrors((e) => {
                  const { status: _, ...rest } = e
                  return rest
                })
              }}
              className={`min-h-11 rounded-xl border-2 px-3 py-2.5 text-body font-semibold transition-all focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 ${
                present === false
                  ? 'border-warning bg-warning-light text-warning'
                  : 'border-border bg-surface text-text-secondary hover:border-warning/40'
              }`}
            >
              {caretaker.attendance.markAbsent}
            </button>
          </div>
          {errors.status && <p className="text-caption text-error mt-1.5">{errors.status}</p>}
        </fieldset>

        {present === true && (
          <div className="space-y-4">
            <FormField label={caretaker.attendance.arrivalTime} required error={errors.arrivalTime}>
              <TextInput
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                error={!!errors.arrivalTime}
                aria-label={caretaker.attendance.arrivalTime}
              />
            </FormField>
            <FormField label={caretaker.attendance.whoBrought} required error={errors.broughtBy}>
              <SearchableSelect
                value={broughtBy}
                onChange={(v) => setBroughtBy(v as BroughtBy)}
                options={GUARDIAN_RELATION_OPTIONS}
                placeholder={caretaker.registration.guardianRelationPlaceholder}
                error={!!errors.broughtBy}
                aria-label={caretaker.attendance.whoBrought}
              />
            </FormField>
            {broughtBy === OTHER_RELATION_VALUE && (
              <FormField
                label={caretaker.attendance.broughtByOther}
                required
                error={errors.broughtByOther}
              >
                <TextInput
                  value={broughtByOther}
                  onChange={(e) => setBroughtByOther(e.target.value)}
                  placeholder={caretaker.attendance.broughtByOtherPlaceholder}
                  error={!!errors.broughtByOther}
                  autoFocus
                />
              </FormField>
            )}
          </div>
        )}

        {present === false && (
          <div className="space-y-4">
            <FormField
              label={caretaker.attendance.absentReason}
              required
              error={errors.absentReason}
            >
              <SelectInput
                value={absentReason}
                onChange={(e) => setAbsentReason(e.target.value as AbsentReason | '')}
                placeholder={caretaker.attendance.absentReasonPlaceholder}
                error={!!errors.absentReason}
                aria-label={caretaker.attendance.absentReason}
              >
                {ABSENT_REASONS.map((key) => (
                  <option key={key} value={key}>
                    {caretaker.attendance.reasons[key]}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField
              label={caretaker.attendance.notes}
              required={absentReason === 'other'}
              error={errors.notes}
            >
              <TextArea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={caretaker.attendance.notesPlaceholder}
                rows={3}
              />
            </FormField>
          </div>
        )}
      </div>
    </Modal>
  )
}

/** @deprecated Prefer AttendanceDialog — kept as alias for gradual migration */
export { AttendanceDialog as AttendanceModal }
