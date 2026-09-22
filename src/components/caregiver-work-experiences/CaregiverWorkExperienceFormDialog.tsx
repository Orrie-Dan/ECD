import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, TextArea } from '@/components/ui/FormField'
import {
  emptyWorkExperienceFields,
  validateWorkExperienceFields,
  type WorkExperienceFieldValues,
} from '@/lib/caregiver-work-experience-fields'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import type {
  CaregiverWorkExperienceViewModel,
  CreateCaregiverWorkExperienceInput,
  UpdateCaregiverWorkExperienceInput,
} from '@/models/caregiver-work-experiences'

const copy = caretaker.users.workExperience

function fromRecord(record: CaregiverWorkExperienceViewModel): WorkExperienceFieldValues {
  return {
    employer: record.employer,
    jobTitle: record.jobTitle,
    startDate: record.startDate,
    endDate: record.endDate ?? '',
    description: record.description ?? '',
  }
}

export interface CaregiverWorkExperienceFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  record?: CaregiverWorkExperienceViewModel | null
  busy?: boolean
  onClose: () => void
  onCreate: (input: CreateCaregiverWorkExperienceInput) => Promise<void>
  onUpdate: (input: UpdateCaregiverWorkExperienceInput) => Promise<void>
}

export function CaregiverWorkExperienceFormDialog(props: CaregiverWorkExperienceFormDialogProps) {
  if (!props.open) return null
  const remountKey = `${props.mode}:${props.record?.id ?? 'new'}:${props.record?.version ?? 0}`
  return <FormInner key={remountKey} {...props} />
}

function FormInner({
  mode,
  record,
  busy = false,
  onClose,
  onCreate,
  onUpdate,
}: CaregiverWorkExperienceFormDialogProps) {
  const [form, setForm] = useState<WorkExperienceFieldValues>(() =>
    mode === 'edit' && record ? fromRecord(record) : emptyWorkExperienceFields(),
  )
  const [errors, setErrors] = useState<ReturnType<typeof validateWorkExperienceFields>>({})

  function setField<K extends keyof WorkExperienceFieldValues>(
    key: K,
    value: WorkExperienceFieldValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors = validateWorkExperienceFields(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const payload = {
      employer: form.employer.trim(),
      jobTitle: form.jobTitle.trim(),
      startDate: form.startDate,
      endDate: form.endDate.trim() || null,
      description: form.description.trim() || undefined,
    }

    if (mode === 'create') {
      await onCreate(payload)
      return
    }
    if (!record) return
    await onUpdate({
      version: record.version,
      ...payload,
      description: form.description.trim() || null,
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? copy.add : copy.edit}
      size="lg"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {copy.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void handleSubmit({ preventDefault() {} } as FormEvent)}
          >
            {busy ? common.loading : copy.save}
          </Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={copy.employer} required error={errors.employer}>
            <TextInput
              value={form.employer}
              onChange={(e) => setField('employer', e.target.value)}
              maxLength={300}
            />
          </FormField>
          <FormField label={copy.jobTitle} required error={errors.jobTitle}>
            <TextInput
              value={form.jobTitle}
              onChange={(e) => setField('jobTitle', e.target.value)}
              maxLength={200}
            />
          </FormField>
          <FormField label={copy.startDate} required error={errors.startDate}>
            <TextInput
              type="date"
              value={form.startDate}
              onChange={(e) => setField('startDate', e.target.value)}
            />
          </FormField>
          <FormField label={copy.endDate} error={errors.endDate}>
            <TextInput
              type="date"
              value={form.endDate}
              onChange={(e) => setField('endDate', e.target.value)}
            />
            <p className="mt-1 text-caption text-text-muted">{copy.endDateHint}</p>
          </FormField>
        </div>
        <FormField label={copy.description}>
          <TextArea
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={3}
            placeholder={copy.descriptionPlaceholder}
          />
        </FormField>
      </form>
    </Modal>
  )
}
