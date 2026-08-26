import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, TextArea } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import type {
  CreateParentingSessionInput,
  ParentingSessionViewModel,
  UpdateParentingSessionInput,
} from '@/models/parenting-sessions'
import {
  deriveTotalAttendees,
  parseAttendeeInput,
  validateAttendeeCount,
} from '@/lib/parenting-session-format'

const copy = caretaker.director.parentingSessions

type FormState = {
  sessionDate: string
  topic: string
  facilitatorName: string
  facilitatorRole: string
  messageSummary: string
  maleAttendees: string
  femaleAttendees: string
  notes: string
}

function emptyForm(defaultDate: string): FormState {
  return {
    sessionDate: defaultDate,
    topic: '',
    facilitatorName: '',
    facilitatorRole: '',
    messageSummary: '',
    maleAttendees: '0',
    femaleAttendees: '0',
    notes: '',
  }
}

function fromRecord(record: ParentingSessionViewModel): FormState {
  return {
    sessionDate: record.sessionDate,
    topic: record.topic,
    facilitatorName: record.facilitatorName,
    facilitatorRole: record.facilitatorRole ?? '',
    messageSummary: record.messageSummary,
    maleAttendees: String(record.maleAttendees),
    femaleAttendees: String(record.femaleAttendees),
    notes: record.notes ?? '',
  }
}

export interface ParentingSessionFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  centerId: string
  record?: ParentingSessionViewModel | null
  busy?: boolean
  onClose: () => void
  onCreate: (input: CreateParentingSessionInput) => Promise<void>
  onUpdate: (input: UpdateParentingSessionInput) => Promise<void>
}

export function ParentingSessionFormDialog({
  open,
  mode,
  centerId,
  record,
  busy = false,
  onClose,
  onCreate,
  onUpdate,
}: ParentingSessionFormDialogProps) {
  const defaultDate = record?.sessionDate ?? new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultDate))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  useEffect(() => {
    if (!open) return
    setForm(mode === 'edit' && record ? fromRecord(record) : emptyForm(defaultDate))
    setErrors({})
  }, [open, mode, record, defaultDate])

  const derivedTotal = useMemo(
    () => deriveTotalAttendees(form.maleAttendees, form.femaleAttendees),
    [form.maleAttendees, form.femaleAttendees],
  )

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors: Partial<Record<keyof FormState, string>> = {}

    if (!form.topic.trim()) nextErrors.topic = copy.topicRequired
    if (!form.facilitatorName.trim()) nextErrors.facilitatorName = copy.facilitatorRequired
    if (!form.messageSummary.trim()) nextErrors.messageSummary = copy.summaryRequired
    if (mode === 'create' && !form.sessionDate) nextErrors.sessionDate = copy.sessionDateRequired

    const maleError = validateAttendeeCount(form.maleAttendees)
    if (maleError) nextErrors.maleAttendees = maleError
    const femaleError = validateAttendeeCount(form.femaleAttendees)
    if (femaleError) nextErrors.femaleAttendees = femaleError

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const maleAttendees = parseAttendeeInput(form.maleAttendees)!
    const femaleAttendees = parseAttendeeInput(form.femaleAttendees)!

    if (mode === 'create') {
      await onCreate({
        centerId,
        sessionDate: form.sessionDate,
        topic: form.topic,
        facilitatorName: form.facilitatorName,
        facilitatorRole: form.facilitatorRole || undefined,
        messageSummary: form.messageSummary,
        maleAttendees,
        femaleAttendees,
        notes: form.notes || undefined,
      })
      return
    }

    if (!record) return
    await onUpdate({
      version: record.version,
      topic: form.topic,
      facilitatorName: form.facilitatorName,
      facilitatorRole: form.facilitatorRole || null,
      messageSummary: form.messageSummary,
      maleAttendees,
      femaleAttendees,
      notes: form.notes || null,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? copy.add : copy.edit}
      size="lg"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {mode === 'create' && (
          <FormField label={copy.sessionDate} error={errors.sessionDate}>
            <TextInput
              type="date"
              value={form.sessionDate}
              onChange={(e) => setField('sessionDate', e.target.value)}
              required
            />
          </FormField>
        )}

        <FormField label={copy.topic} error={errors.topic}>
          <TextInput
            value={form.topic}
            onChange={(e) => setField('topic', e.target.value)}
            maxLength={300}
            required
          />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={copy.facilitator} error={errors.facilitatorName}>
            <TextInput
              value={form.facilitatorName}
              onChange={(e) => setField('facilitatorName', e.target.value)}
              maxLength={200}
              required
            />
          </FormField>
          <FormField label={copy.facilitatorRole}>
            <TextInput
              value={form.facilitatorRole}
              onChange={(e) => setField('facilitatorRole', e.target.value)}
              maxLength={200}
              placeholder={copy.facilitatorRolePlaceholder}
            />
          </FormField>
        </div>

        <FormField label={copy.messageSummary} error={errors.messageSummary}>
          <TextArea
            value={form.messageSummary}
            onChange={(e) => setField('messageSummary', e.target.value)}
            rows={4}
            required
          />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={copy.maleAttendees} error={errors.maleAttendees}>
            <TextInput
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={form.maleAttendees}
              onChange={(e) => setField('maleAttendees', e.target.value)}
              required
            />
          </FormField>
          <FormField label={copy.femaleAttendees} error={errors.femaleAttendees}>
            <TextInput
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={form.femaleAttendees}
              onChange={(e) => setField('femaleAttendees', e.target.value)}
              required
            />
          </FormField>
        </div>

        <div className="rounded-xl bg-background-subtle px-4 py-3">
          <p className="text-caption text-text-muted">{copy.totalAttendees}</p>
          <p className="text-heading text-text">{derivedTotal}</p>
        </div>

        <FormField label={copy.notes}>
          <TextArea
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            rows={2}
            placeholder={copy.notesPlaceholder}
          />
        </FormField>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {copy.cancel}
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? common.loading : copy.save}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
