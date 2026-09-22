import { useEffect, useId, useState, type MutableRefObject } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, TextArea } from '@/components/ui/FormField'
import {
  emptyWorkExperienceFields,
  validateWorkExperienceFields,
  type WorkExperienceFieldErrors,
  type WorkExperienceFieldValues,
} from '@/lib/caregiver-work-experience-fields'
import { caretaker } from '@/locales/rw/caretaker'
import type { CreateCaregiverWorkExperienceInput } from '@/models/caregiver-work-experiences'

const copy = caretaker.users.workExperience

export interface CaregiverWorkExperiencesEditorProps {
  drafts: WorkExperienceFieldValues[]
  onChange: (drafts: WorkExperienceFieldValues[]) => void
  validateRef?: MutableRefObject<(() => CreateCaregiverWorkExperienceInput[] | null) | null>
}

export function CaregiverWorkExperiencesEditor({
  drafts,
  onChange,
  validateRef,
}: CaregiverWorkExperiencesEditorProps) {
  const titleId = useId()
  const [rowErrors, setRowErrors] = useState<WorkExperienceFieldErrors[]>(() =>
    drafts.map(() => ({})),
  )

  function setDraft(index: number, next: WorkExperienceFieldValues) {
    onChange(drafts.map((row, i) => (i === index ? next : row)))
    setRowErrors((prev) => {
      const nextErrors = [...prev]
      while (nextErrors.length < drafts.length) nextErrors.push({})
      nextErrors[index] = {}
      return nextErrors
    })
  }

  function addDraft() {
    onChange([...drafts, emptyWorkExperienceFields()])
    setRowErrors((prev) => [...prev, {}])
  }

  function removeDraft(index: number) {
    onChange(drafts.filter((_, i) => i !== index))
    setRowErrors((prev) => prev.filter((_, i) => i !== index))
  }

  function validateAll(): CreateCaregiverWorkExperienceInput[] | null {
    if (drafts.length === 0) return []
    const nextErrors = drafts.map((values) => validateWorkExperienceFields(values))
    setRowErrors(nextErrors)
    if (nextErrors.some((err) => Object.keys(err).length > 0)) return null
    return drafts.map((values) => ({
      employer: values.employer.trim(),
      jobTitle: values.jobTitle.trim(),
      startDate: values.startDate,
      endDate: values.endDate.trim() || undefined,
      description: values.description.trim() || undefined,
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
            {copy.title}
          </h3>
          <p className="text-caption text-text-secondary">{copy.hint}</p>
        </div>
        <Button type="button" variant="secondary" size="sm" icon={<Plus size={16} />} onClick={addDraft}>
          {copy.add}
        </Button>
      </div>

      {drafts.length === 0 ? (
        <p className="text-body text-text-secondary">{copy.empty}</p>
      ) : (
        <ul className="space-y-4">
          {drafts.map((values, index) => {
            const errors = rowErrors[index] ?? {}
            return (
              <li
                key={`work-draft-${index}`}
                className="rounded-md border border-border bg-background-subtle p-3 sm:p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption font-semibold text-text-secondary">
                    {copy.itemLabel.replace('{n}', String(index + 1))}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={() => removeDraft(index)}
                    aria-label={copy.remove}
                  >
                    {copy.remove}
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label={copy.employer} required error={errors.employer}>
                    <TextInput
                      value={values.employer}
                      onChange={(e) => setDraft(index, { ...values, employer: e.target.value })}
                      maxLength={300}
                    />
                  </FormField>
                  <FormField label={copy.jobTitle} required error={errors.jobTitle}>
                    <TextInput
                      value={values.jobTitle}
                      onChange={(e) => setDraft(index, { ...values, jobTitle: e.target.value })}
                      maxLength={200}
                    />
                  </FormField>
                  <FormField label={copy.startDate} required error={errors.startDate}>
                    <TextInput
                      type="date"
                      value={values.startDate}
                      onChange={(e) => setDraft(index, { ...values, startDate: e.target.value })}
                    />
                  </FormField>
                  <FormField label={copy.endDate} error={errors.endDate}>
                    <TextInput
                      type="date"
                      value={values.endDate}
                      onChange={(e) => setDraft(index, { ...values, endDate: e.target.value })}
                    />
                    <p className="mt-1 text-caption text-text-muted">{copy.endDateHint}</p>
                  </FormField>
                </div>
                <FormField label={copy.description}>
                  <TextArea
                    value={values.description}
                    onChange={(e) => setDraft(index, { ...values, description: e.target.value })}
                    rows={2}
                    placeholder={copy.descriptionPlaceholder}
                  />
                </FormField>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
