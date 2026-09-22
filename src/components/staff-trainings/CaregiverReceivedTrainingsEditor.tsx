import { useEffect, useId, useState, type MutableRefObject } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StaffTrainingFields } from '@/components/staff-trainings/StaffTrainingFields'
import {
  emptyStaffTrainingFields,
  validateStaffTrainingFields,
  type StaffTrainingFieldErrors,
  type StaffTrainingFieldValues,
} from '@/lib/staff-training-fields'
import { caretaker } from '@/locales/rw/caretaker'
import { parseDurationDays } from '@/lib/staff-training-format'
import type { CreateCaregiverTrainingInput } from '@/models/staff-trainings'

const copy = caretaker.director.trainings

export interface CaregiverReceivedTrainingsEditorProps {
  /** Controlled draft list (parent owns state for create submit). */
  drafts: StaffTrainingFieldValues[]
  onChange: (drafts: StaffTrainingFieldValues[]) => void
  /** When set, validates all drafts and returns payload or null if invalid. */
  validateRef?: MutableRefObject<(() => CreateCaregiverTrainingInput[] | null) | null>
}

/**
 * Amahugurwa yabonye — zero-or-more training drafts for caregiver create/edit.
 * Reuses StaffTrainingFields (same domain as Section XIV).
 */
export function CaregiverReceivedTrainingsEditor({
  drafts,
  onChange,
  validateRef,
}: CaregiverReceivedTrainingsEditorProps) {
  const titleId = useId()
  const [rowErrors, setRowErrors] = useState<StaffTrainingFieldErrors[]>(() =>
    drafts.map(() => ({})),
  )

  function setDraft(index: number, next: StaffTrainingFieldValues) {
    onChange(drafts.map((row, i) => (i === index ? next : row)))
    setRowErrors((prev) => {
      const nextErrors = [...prev]
      while (nextErrors.length < drafts.length) nextErrors.push({})
      nextErrors[index] = {}
      return nextErrors
    })
  }

  function addDraft() {
    onChange([...drafts, emptyStaffTrainingFields()])
    setRowErrors((prev) => [...prev, {}])
  }

  function removeDraft(index: number) {
    onChange(drafts.filter((_, i) => i !== index))
    setRowErrors((prev) => prev.filter((_, i) => i !== index))
  }

  function validateAll(): CreateCaregiverTrainingInput[] | null {
    if (drafts.length === 0) return []
    const nextErrors = drafts.map((values) => validateStaffTrainingFields(values))
    setRowErrors(nextErrors)
    if (nextErrors.some((err) => Object.keys(err).length > 0)) {
      return null
    }
    return drafts.map((values) => ({
      trainingDate: values.trainingDate,
      trainingProvider: values.trainingProvider.trim(),
      topic: values.topic.trim(),
      durationDays: parseDurationDays(values.durationDays),
      certificateReceived: values.certificateReceived === 'yes',
      notes: values.notes.trim() || undefined,
    }))
  }

  useEffect(() => {
    if (!validateRef) return
    validateRef.current = validateAll
    return () => {
      validateRef.current = null
    }
  })

  return (
    <section className="space-y-3" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={titleId} className="text-subheading font-semibold text-text">
            {copy.receivedTitle}
          </h3>
          <p className="text-caption text-text-secondary">{copy.receivedHint}</p>
        </div>
        <Button type="button" variant="secondary" size="sm" icon={<Plus size={16} />} onClick={addDraft}>
          {copy.add}
        </Button>
      </div>

      {drafts.length === 0 ? (
        <p className="text-body text-text-secondary">{copy.receivedEmpty}</p>
      ) : (
        <ul className="space-y-4">
          {drafts.map((values, index) => (
            <li
              key={`training-draft-${index}`}
              className="rounded-md border border-border bg-background-subtle p-3 sm:p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-caption font-semibold text-text-secondary">
                  {copy.receivedItemLabel.replace('{n}', String(index + 1))}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => removeDraft(index)}
                  aria-label={copy.receivedRemove}
                >
                  {copy.receivedRemove}
                </Button>
              </div>
              <StaffTrainingFields
                values={values}
                errors={rowErrors[index] ?? {}}
                onChange={(key, value) => setDraft(index, { ...values, [key]: value })}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
