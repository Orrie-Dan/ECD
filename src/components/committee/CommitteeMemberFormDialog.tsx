import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, TextArea } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import type {
  CommitteeMemberViewModel,
  CreateCommitteeMemberInput,
  UpdateCommitteeMemberInput,
} from '@/models/committee-members'

const copy = caretaker.director.committee

type FormState = {
  fullName: string
  position: string
  phone: string
  startDate: string
  notes: string
}

function emptyForm(defaultDate: string): FormState {
  return {
    fullName: '',
    position: '',
    phone: '',
    startDate: defaultDate,
    notes: '',
  }
}

function fromRecord(record: CommitteeMemberViewModel): FormState {
  return {
    fullName: record.fullName,
    position: record.position,
    phone: record.phone ?? '',
    startDate: record.startDate ?? '',
    notes: record.notes ?? '',
  }
}

export interface CommitteeMemberFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  centerId: string
  record?: CommitteeMemberViewModel | null
  busy?: boolean
  onClose: () => void
  onCreate: (input: CreateCommitteeMemberInput) => Promise<void>
  onUpdate: (input: UpdateCommitteeMemberInput) => Promise<void>
}

export function CommitteeMemberFormDialog({
  open,
  mode,
  centerId,
  record,
  busy = false,
  onClose,
  onCreate,
  onUpdate,
}: CommitteeMemberFormDialogProps) {
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
    if (!form.fullName.trim()) nextErrors.fullName = copy.nameRequired
    if (!form.position.trim()) nextErrors.position = copy.positionRequired
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    if (mode === 'create') {
      await onCreate({
        centerId,
        fullName: form.fullName,
        position: form.position,
        phone: form.phone || undefined,
        startDate: form.startDate || undefined,
        notes: form.notes || undefined,
      })
      return
    }

    if (!record) return
    await onUpdate({
      version: record.version,
      fullName: form.fullName,
      position: form.position,
      phone: form.phone || null,
      startDate: form.startDate || null,
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
        <FormField label={copy.fullName} error={errors.fullName}>
          <TextInput
            value={form.fullName}
            onChange={(e) => setField('fullName', e.target.value)}
            maxLength={200}
            required
          />
        </FormField>

        <FormField label={copy.position} error={errors.position}>
          <TextInput
            value={form.position}
            onChange={(e) => setField('position', e.target.value)}
            maxLength={200}
            required
            placeholder={copy.positionPlaceholder}
          />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={copy.phone}>
            <TextInput
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              maxLength={50}
              placeholder={copy.phonePlaceholder}
            />
          </FormField>
          <FormField label={copy.startDate}>
            <TextInput
              type="date"
              value={form.startDate}
              onChange={(e) => setField('startDate', e.target.value)}
            />
          </FormField>
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
