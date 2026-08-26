import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import type {
  CreateParentContributionInput,
  InKindItemType,
  ParentContributionType,
  ParentContributionViewModel,
  UpdateParentContributionInput,
} from '@/models/contributions'

const copy = caretaker.director.contributions

const IN_KIND_OPTIONS: { value: InKindItemType; label: string }[] = [
  { value: 'flour', label: copy.itemTypes.flour },
  { value: 'potatoes', label: copy.itemTypes.potatoes },
  { value: 'maize', label: copy.itemTypes.maize },
  { value: 'milk', label: copy.itemTypes.milk },
  { value: 'firewood', label: copy.itemTypes.firewood },
  { value: 'other', label: copy.itemTypes.other },
]

type FormState = {
  contributorName: string
  contributorPhone: string
  contributionDate: string
  contributionType: ParentContributionType
  amount: string
  itemType: InKindItemType | ''
  quantity: string
  unit: string
  description: string
  notes: string
}

function emptyForm(defaultDate: string): FormState {
  return {
    contributorName: '',
    contributorPhone: '',
    contributionDate: defaultDate,
    contributionType: 'cash',
    amount: '',
    itemType: '',
    quantity: '',
    unit: '',
    description: '',
    notes: '',
  }
}

function fromRecord(record: ParentContributionViewModel): FormState {
  return {
    contributorName: record.contributorName,
    contributorPhone: record.contributorPhone ?? '',
    contributionDate: record.contributionDate,
    contributionType: record.contributionType,
    amount: record.amount != null ? String(record.amount) : '',
    itemType: record.itemType ?? '',
    quantity: record.quantity != null ? String(record.quantity) : '',
    unit: record.unit ?? '',
    description: record.description ?? '',
    notes: record.notes ?? '',
  }
}

export interface ContributionFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  centerId: string
  record?: ParentContributionViewModel | null
  busy?: boolean
  onClose: () => void
  onCreate: (input: CreateParentContributionInput) => Promise<void>
  onUpdate: (input: UpdateParentContributionInput) => Promise<void>
}

export function ContributionFormDialog({
  open,
  mode,
  centerId,
  record,
  busy = false,
  onClose,
  onCreate,
  onUpdate,
}: ContributionFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => emptyForm(new Date().toISOString().slice(0, 10)))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    const today = new Date().toISOString().slice(0, 10)
    setForm(record ? fromRecord(record) : emptyForm(today))
  }, [open, record])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.contributorName.trim()) {
      next.contributorName = copy.contributorNameRequired
    }
    if (mode === 'create' && !form.contributionDate) {
      next.contributionDate = copy.contributionDateRequired
    }
    if (!form.contributionType) {
      next.contributionType = copy.contributionTypeRequired
    }
    if (form.contributionType === 'cash') {
      const amount = Number(form.amount)
      if (form.amount.trim() === '' || Number.isNaN(amount) || amount < 0) {
        next.amount = copy.amountRequired
      }
    } else if (!form.itemType) {
      next.itemType = copy.itemTypeRequired
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    if (mode === 'create') {
      const input: CreateParentContributionInput = {
        centerId,
        contributorName: form.contributorName.trim(),
        contributorPhone: form.contributorPhone.trim() || undefined,
        contributionDate: form.contributionDate,
        contributionType: form.contributionType,
        description: form.description.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }
      if (form.contributionType === 'cash') {
        input.amount = Number(form.amount)
      } else {
        input.itemType = form.itemType as InKindItemType
        if (form.quantity.trim()) input.quantity = Number(form.quantity)
        if (form.unit.trim()) input.unit = form.unit.trim()
      }
      await onCreate(input)
      return
    }

    if (!record) return
    const input: UpdateParentContributionInput = {
      version: record.version,
      contributorName: form.contributorName.trim(),
      contributorPhone: form.contributorPhone.trim() || null,
      contributionType: form.contributionType,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
    }
    if (form.contributionType === 'cash') {
      input.amount = Number(form.amount)
      input.itemType = null
      input.quantity = null
      input.unit = null
    } else {
      input.amount = null
      input.itemType = form.itemType as InKindItemType
      input.quantity = form.quantity.trim() ? Number(form.quantity) : null
      input.unit = form.unit.trim() || null
    }
    await onUpdate(input)
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
              void onSubmit({ preventDefault() {} } as FormEvent)
            }}
            disabled={busy}
          >
            {busy ? common.loading : copy.save}
          </Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <FormField label={copy.contributorName} required error={errors.contributorName}>
          <TextInput
            value={form.contributorName}
            onChange={(e) => setField('contributorName', e.target.value)}
            autoComplete="name"
          />
        </FormField>
        <FormField label={copy.contributorPhone}>
          <TextInput
            value={form.contributorPhone}
            onChange={(e) => setField('contributorPhone', e.target.value)}
            inputMode="tel"
            placeholder="0781234567"
          />
        </FormField>
        {mode === 'create' ? (
          <FormField label={copy.contributionDate} required error={errors.contributionDate}>
            <TextInput
              type="date"
              value={form.contributionDate}
              onChange={(e) => setField('contributionDate', e.target.value)}
            />
          </FormField>
        ) : (
          <FormField label={copy.contributionDate}>
            <TextInput type="date" value={form.contributionDate} disabled />
          </FormField>
        )}
        <FormField label={copy.contributionType} required error={errors.contributionType}>
          <SelectInput
            value={form.contributionType}
            onChange={(e) =>
              setField('contributionType', e.target.value as ParentContributionType)
            }
          >
            <option value="cash">{copy.typeCash}</option>
            <option value="in_kind">{copy.typeInKind}</option>
          </SelectInput>
        </FormField>
        {form.contributionType === 'cash' ? (
          <FormField label={copy.amount} required error={errors.amount}>
            <TextInput
              type="number"
              min={0}
              step="1"
              value={form.amount}
              onChange={(e) => setField('amount', e.target.value)}
            />
          </FormField>
        ) : (
          <>
            <FormField label={copy.itemType} required error={errors.itemType}>
              <SelectInput
                value={form.itemType}
                onChange={(e) => setField('itemType', e.target.value as InKindItemType | '')}
              >
                <option value="">{common.select}</option>
                {IN_KIND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={copy.quantity}>
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
                />
              </FormField>
            </div>
          </>
        )}
        <FormField label={copy.description}>
          <TextInput
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
          />
        </FormField>
        <FormField label={copy.notes}>
          <TextInput
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder={copy.notesPlaceholder}
          />
        </FormField>
      </form>
    </Modal>
  )
}
