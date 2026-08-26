import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, TextArea, SelectInput } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import type {
  CenterSupportCategory,
  CenterSupportViewModel,
  CreateCenterSupportInput,
  UpdateCenterSupportInput,
} from '@/models/center-support'
import { CENTER_SUPPORT_CATEGORIES } from '@/models/center-support'
import {
  parseSupportQuantity,
  validateSupportQuantity,
} from '@/lib/center-support-format'

const copy = caretaker.director.support

type FormState = {
  receivedDate: string
  supportCategory: CenterSupportCategory
  description: string
  quantity: string
  unit: string
  providerName: string
  providerOrganization: string
  receivedByName: string
  notes: string
}

function emptyForm(defaultDate: string): FormState {
  return {
    receivedDate: defaultDate,
    supportCategory: 'food',
    description: '',
    quantity: '',
    unit: '',
    providerName: '',
    providerOrganization: '',
    receivedByName: '',
    notes: '',
  }
}

function fromRecord(record: CenterSupportViewModel): FormState {
  return {
    receivedDate: record.receivedDate,
    supportCategory: record.supportCategory,
    description: record.description,
    quantity: record.quantity != null ? String(record.quantity) : '',
    unit: record.unit ?? '',
    providerName: record.providerName,
    providerOrganization: record.providerOrganization ?? '',
    receivedByName: record.receivedByName ?? '',
    notes: record.notes ?? '',
  }
}

export interface SupportFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  centerId: string
  record?: CenterSupportViewModel | null
  busy?: boolean
  onClose: () => void
  onCreate: (input: CreateCenterSupportInput) => Promise<void>
  onUpdate: (input: UpdateCenterSupportInput) => Promise<void>
}

export function SupportFormDialog({
  open,
  mode,
  centerId,
  record,
  busy = false,
  onClose,
  onCreate,
  onUpdate,
}: SupportFormDialogProps) {
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

    if (mode === 'create' && !form.receivedDate) {
      nextErrors.receivedDate = copy.receivedDateRequired
    }
    if (!form.supportCategory) nextErrors.supportCategory = copy.supportCategoryRequired
    if (!form.description.trim()) nextErrors.description = copy.descriptionRequired
    if (!form.providerName.trim()) nextErrors.providerName = copy.providerNameRequired
    const quantityError = validateSupportQuantity(form.quantity)
    if (quantityError) nextErrors.quantity = quantityError

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const quantity = parseSupportQuantity(form.quantity)

    if (mode === 'create') {
      await onCreate({
        centerId,
        receivedDate: form.receivedDate,
        supportCategory: form.supportCategory,
        description: form.description,
        quantity: quantity ?? undefined,
        unit: form.unit || undefined,
        providerName: form.providerName,
        providerOrganization: form.providerOrganization || undefined,
        receivedByName: form.receivedByName || undefined,
        notes: form.notes || undefined,
      })
      return
    }

    if (!record) return
    await onUpdate({
      version: record.version,
      supportCategory: form.supportCategory,
      description: form.description,
      quantity,
      unit: form.unit || null,
      providerName: form.providerName,
      providerOrganization: form.providerOrganization || null,
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
        {mode === 'create' ? (
          <FormField label={copy.receivedDate} required error={errors.receivedDate}>
            <TextInput
              type="date"
              value={form.receivedDate}
              onChange={(e) => setField('receivedDate', e.target.value)}
            />
          </FormField>
        ) : (
          <FormField label={copy.receivedDate}>
            <TextInput type="date" value={form.receivedDate} disabled />
          </FormField>
        )}

        <FormField label={copy.supportCategory} required error={errors.supportCategory}>
          <SelectInput
            value={form.supportCategory}
            onChange={(e) =>
              setField('supportCategory', e.target.value as CenterSupportCategory)
            }
          >
            {CENTER_SUPPORT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {copy.categories[category]}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label={copy.description} required error={errors.description}>
          <TextArea
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            maxLength={500}
            rows={3}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={copy.quantity} error={errors.quantity}>
            <TextInput
              type="number"
              min={0}
              step="0.001"
              value={form.quantity}
              onChange={(e) => setField('quantity', e.target.value)}
            />
          </FormField>
          <FormField label={copy.unit}>
            <TextInput
              value={form.unit}
              onChange={(e) => setField('unit', e.target.value)}
              placeholder={copy.unitPlaceholder}
              maxLength={50}
            />
          </FormField>
        </div>

        <FormField label={copy.providerName} required error={errors.providerName}>
          <TextInput
            value={form.providerName}
            onChange={(e) => setField('providerName', e.target.value)}
            maxLength={200}
            autoComplete="organization"
          />
        </FormField>

        <FormField label={copy.providerOrganization}>
          <TextInput
            value={form.providerOrganization}
            onChange={(e) => setField('providerOrganization', e.target.value)}
            maxLength={200}
          />
        </FormField>

        {mode === 'create' && (
          <FormField label={copy.receivedByName} hint={copy.receivedByHint}>
            <TextInput
              value={form.receivedByName}
              onChange={(e) => setField('receivedByName', e.target.value)}
              maxLength={200}
              autoComplete="name"
            />
          </FormField>
        )}

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
