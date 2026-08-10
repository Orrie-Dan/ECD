import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, TextArea } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import { common, messages } from '@/locales/rw/common'
import { useToast } from '@/components/ui/Toast'
import { calculateAge } from '@/lib/mock-data'
import {
  getTodayDate,
  parseMeasurementInput,
  toYearMonth,
  validateMeasurementInput,
} from '@/lib/nutrition-utils'
import type { Child, GrowthMeasurement } from '@/types'

export interface MeasurementDialogResult {
  date: string
  weightKg: number
  /** Retained on the model for future use; not collected in Form VII UI. */
  heightCm: number
  muacCm: number
  /** Retained on the model for future use; not collected in Form VII UI. */
  headCircumferenceCm?: number
  notes?: string
}

interface MeasurementDialogProps {
  open: boolean
  child: Child | null
  existing?: GrowthMeasurement | null
  /** When set, date must fall in this YYYY-MM (one measurement per child per month). */
  sessionYearMonth?: string
  /** Preserves prior height on the data model when not collected in Form VII. */
  fallbackHeightCm?: number
  onClose: () => void
  onConfirm: (result: MeasurementDialogResult) => void
}

function validationMessage(code: string): string {
  if (code === 'future') return caretaker.growth.validationFuture
  if (code === 'range') return caretaker.growth.validationRange
  if (code === 'month') return caretaker.growth.validationMonth
  return caretaker.growth.validationRequired
}

function defaultDateForSession(sessionYearMonth: string | undefined, today: string): string {
  if (!sessionYearMonth) return today
  const current = toYearMonth(today)
  if (sessionYearMonth === current) return today
  const [y, m] = sessionYearMonth.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${sessionYearMonth}-${String(Math.min(15, lastDay)).padStart(2, '0')}`
}

/**
 * Form VII (paper register) measurement entry:
 * Weight (kg) + MUAC (cm) + optional notes. Height / HC are not collected.
 */
export function MeasurementDialog({
  open,
  child,
  existing,
  sessionYearMonth,
  fallbackHeightCm = 0,
  onClose,
  onConfirm,
}: MeasurementDialogProps) {
  const { showError } = useToast()
  const today = getTodayDate()

  const [date, setDate] = useState(today)
  const [weightKg, setWeightKg] = useState('')
  const [muacCm, setMuacCm] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setDate(existing?.date ?? defaultDateForSession(sessionYearMonth, today))
    setWeightKg(existing ? String(existing.weightKg) : '')
    setMuacCm(existing ? String(existing.muacCm) : '')
    setNotes(existing?.notes ?? '')
    setErrors({})
  }, [open, child?.id, existing?.id, today, sessionYearMonth])

  if (!child) return null

  const handleConfirm = () => {
    const rawErrors = validateMeasurementInput(
      {
        date,
        weightKg,
        heightCm: '',
        muacCm,
        headCircumferenceCm: '',
      },
      today,
      { requireHeight: false },
    )

    if (sessionYearMonth && date && toYearMonth(date) !== sessionYearMonth) {
      rawErrors.date = 'month'
    }

    if (Object.keys(rawErrors).length > 0) {
      const next: Record<string, string> = {}
      for (const [key, code] of Object.entries(rawErrors)) {
        next[key] = validationMessage(code)
      }
      setErrors(next)
      showError(messages.formIncomplete)
      return
    }

    const parsed = parseMeasurementInput(
      {
        weightKg,
        heightCm: '',
        muacCm,
        headCircumferenceCm: '',
      },
      existing?.heightCm ?? fallbackHeightCm,
    )

    onConfirm({
      date,
      weightKg: parsed.weightKg,
      heightCm: parsed.heightCm,
      muacCm: parsed.muacCm,
      // Preserve existing HC if present; do not collect new values in Form VII.
      headCircumferenceCm: existing?.headCircumferenceCm,
      notes: notes.trim() || undefined,
    })
  }

  const minDate = sessionYearMonth ? `${sessionYearMonth}-01` : undefined
  const maxDate = sessionYearMonth
    ? (() => {
        const [y, m] = sessionYearMonth.split('-').map(Number)
        const last = new Date(y, m, 0).getDate()
        const monthEnd = `${sessionYearMonth}-${String(last).padStart(2, '0')}`
        return monthEnd < today ? monthEnd : today
      })()
    : today

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? caretaker.growth.update : caretaker.growth.recordMeasurement}
      size="md"
      footer={
        <>
          <Button variant="tertiary" onClick={onClose} fullWidth className="sm:w-auto">
            {common.cancel}
          </Button>
          <Button variant="primary" onClick={handleConfirm} fullWidth className="sm:w-auto">
            {existing ? caretaker.growth.update : caretaker.growth.save}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-background-subtle/80 px-4 py-3">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
            {caretaker.growth.childInfo}
          </p>
          <p className="text-subheading text-text mt-1">{child.fullName}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-caption text-text-muted">{caretaker.growth.ageYears}</dt>
              <dd className="text-body font-semibold text-text tabular-nums">
                {calculateAge(child.dateOfBirth)}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">{common.labels.gender}</dt>
              <dd className="text-body font-semibold text-text">{child.gender}</dd>
            </div>
          </dl>
        </div>

        <FormField label={caretaker.growth.measurementDate} required error={errors.date}>
          <TextInput
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            error={!!errors.date}
            onChange={(e) => setDate(e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={caretaker.growth.weight} required error={errors.weightKg}>
            <TextInput
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0.1}
              max={50}
              value={weightKg}
              error={!!errors.weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="text-heading font-semibold tabular-nums"
            />
          </FormField>
          <FormField label={caretaker.growth.muac} required error={errors.muacCm}>
            <TextInput
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0.1}
              max={25}
              value={muacCm}
              error={!!errors.muacCm}
              onChange={(e) => setMuacCm(e.target.value)}
              className="text-heading font-semibold tabular-nums"
            />
          </FormField>
        </div>

        <FormField label={caretaker.growth.notes}>
          <TextArea
            value={notes}
            placeholder={caretaker.growth.notesPlaceholder}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </FormField>
      </div>
    </Modal>
  )
}
