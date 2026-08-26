import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, TextArea } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import type {
  CenterVisitViewModel,
  CreateCenterVisitInput,
  UpdateCenterVisitInput,
} from '@/models/center-visits'

const copy = caretaker.director.visitors

type FormState = {
  visitDate: string
  visitorName: string
  organization: string
  occupationOrRole: string
  purposeOrMessage: string
  notes: string
}

function emptyForm(defaultDate: string): FormState {
  return {
    visitDate: defaultDate,
    visitorName: '',
    organization: '',
    occupationOrRole: '',
    purposeOrMessage: '',
    notes: '',
  }
}

function fromRecord(record: CenterVisitViewModel): FormState {
  return {
    visitDate: record.visitDate,
    visitorName: record.visitorName,
    organization: record.organization ?? '',
    occupationOrRole: record.occupationOrRole ?? '',
    purposeOrMessage: record.purposeOrMessage,
    notes: record.notes ?? '',
  }
}

export interface VisitFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  centerId: string
  record?: CenterVisitViewModel | null
  busy?: boolean
  onClose: () => void
  onCreate: (input: CreateCenterVisitInput) => Promise<void>
  onUpdate: (input: UpdateCenterVisitInput) => Promise<void>
}

export function VisitFormDialog({
  open,
  mode,
  centerId,
  record,
  busy = false,
  onClose,
  onCreate,
  onUpdate,
}: VisitFormDialogProps) {
  const defaultDate = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultDate))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  useEffect(() => {
    if (!open) return
    setForm(mode === 'edit' && record ? fromRecord(record) : emptyForm(defaultDate))
    setErrors({})
  }, [open, mode, record, defaultDate])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors: Partial<Record<keyof FormState, string>> = {}

    if (mode === 'create' && !form.visitDate) {
      nextErrors.visitDate = copy.visitDateRequired
    }
    if (!form.visitorName.trim()) nextErrors.visitorName = copy.visitorNameRequired
    if (!form.purposeOrMessage.trim()) nextErrors.purposeOrMessage = copy.purposeRequired

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    if (mode === 'create') {
      await onCreate({
        centerId,
        visitDate: form.visitDate,
        visitorName: form.visitorName,
        organization: form.organization || undefined,
        occupationOrRole: form.occupationOrRole || undefined,
        purposeOrMessage: form.purposeOrMessage,
        notes: form.notes || undefined,
      })
      return
    }

    if (!record) return
    await onUpdate({
      version: record.version,
      visitorName: form.visitorName,
      organization: form.organization || null,
      occupationOrRole: form.occupationOrRole || null,
      purposeOrMessage: form.purposeOrMessage,
      notes: form.notes || null,
    })
  }

  return (
    <Modal
      open={open}
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
            onClick={() => {
              void handleSubmit({ preventDefault() {} } as FormEvent)
            }}
            disabled={busy}
          >
            {busy ? common.loading : copy.save}
          </Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        <p className="text-caption text-text-muted">{copy.provenanceHint}</p>

        {mode === 'create' ? (
          <FormField label={copy.visitDate} required error={errors.visitDate}>
            <TextInput
              type="date"
              value={form.visitDate}
              onChange={(e) => setField('visitDate', e.target.value)}
            />
          </FormField>
        ) : (
          <FormField label={copy.visitDate}>
            <TextInput type="date" value={form.visitDate} disabled />
          </FormField>
        )}

        <FormField label={copy.visitorName} required error={errors.visitorName}>
          <TextInput
            value={form.visitorName}
            onChange={(e) => setField('visitorName', e.target.value)}
            maxLength={200}
            autoComplete="name"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={copy.organization}>
            <TextInput
              value={form.organization}
              onChange={(e) => setField('organization', e.target.value)}
              maxLength={200}
              autoComplete="organization"
            />
          </FormField>
          <FormField label={copy.occupationOrRole}>
            <TextInput
              value={form.occupationOrRole}
              onChange={(e) => setField('occupationOrRole', e.target.value)}
              maxLength={200}
            />
          </FormField>
        </div>

        <FormField label={copy.purposeOrMessage} required error={errors.purposeOrMessage}>
          <TextArea
            value={form.purposeOrMessage}
            onChange={(e) => setField('purposeOrMessage', e.target.value)}
            rows={3}
          />
        </FormField>

        <FormField label={copy.notes}>
          <TextArea
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder={copy.notesPlaceholder}
            rows={2}
          />
        </FormField>
      </form>
    </Modal>
  )
}
