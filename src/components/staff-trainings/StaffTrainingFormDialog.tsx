import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, TextArea, SelectInput } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import type {
  CreateStaffTrainingInput,
  StaffTrainingViewModel,
  UpdateStaffTrainingInput,
} from '@/models/staff-trainings'
import { parseDurationDays, validateDurationDays } from '@/lib/staff-training-format'

const copy = caretaker.director.trainings

export type TraineeOption = {
  id: string
  fullName: string
}

type FormState = {
  traineeUserId: string
  traineeName: string
  traineeRole: string
  trainingDate: string
  trainingProvider: string
  topic: string
  durationDays: string
  certificateReceived: 'yes' | 'no'
  notes: string
}

function emptyForm(defaultDate: string): FormState {
  return {
    traineeUserId: '',
    traineeName: '',
    traineeRole: copy.traineeRoleDefault,
    trainingDate: defaultDate,
    trainingProvider: '',
    topic: '',
    durationDays: '1',
    certificateReceived: 'no',
    notes: '',
  }
}

function fromRecord(record: StaffTrainingViewModel): FormState {
  return {
    traineeUserId: record.traineeUserId ?? '',
    traineeName: record.traineeName,
    traineeRole: record.traineeRole,
    trainingDate: record.trainingDate,
    trainingProvider: record.trainingProvider,
    topic: record.topic,
    durationDays: String(record.durationDays),
    certificateReceived: record.certificateReceived ? 'yes' : 'no',
    notes: record.notes ?? '',
  }
}

export interface StaffTrainingFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  centerId: string
  record?: StaffTrainingViewModel | null
  traineeOptions: TraineeOption[]
  busy?: boolean
  onClose: () => void
  onCreate: (input: CreateStaffTrainingInput) => Promise<void>
  onUpdate: (input: UpdateStaffTrainingInput) => Promise<void>
}

export function StaffTrainingFormDialog({
  open,
  mode,
  centerId,
  record,
  traineeOptions,
  busy = false,
  onClose,
  onCreate,
  onUpdate,
}: StaffTrainingFormDialogProps) {
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

  function onTraineeSelect(userId: string) {
    const option = traineeOptions.find((item) => item.id === userId)
    setForm((prev) => ({
      ...prev,
      traineeUserId: userId,
      traineeName: option?.fullName ?? prev.traineeName,
      traineeRole: option ? copy.traineeRoleDefault : prev.traineeRole,
    }))
    setErrors((prev) => ({ ...prev, traineeUserId: undefined, traineeName: undefined }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors: Partial<Record<keyof FormState, string>> = {}

    if (mode === 'create' && !form.trainingDate) {
      nextErrors.trainingDate = copy.trainingDateRequired
    }
    if (!form.traineeName.trim()) nextErrors.traineeName = copy.traineeNameRequired
    if (!form.traineeRole.trim()) nextErrors.traineeRole = copy.traineeRoleRequired
    if (!form.trainingProvider.trim()) {
      nextErrors.trainingProvider = copy.trainingProviderRequired
    }
    if (!form.topic.trim()) nextErrors.topic = copy.topicRequired
    const durationError = validateDurationDays(form.durationDays)
    if (durationError) nextErrors.durationDays = durationError

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const durationDays = parseDurationDays(form.durationDays)
    const certificateReceived = form.certificateReceived === 'yes'

    if (mode === 'create') {
      await onCreate({
        centerId,
        traineeUserId: form.traineeUserId || undefined,
        traineeName: form.traineeName,
        traineeRole: form.traineeRole,
        trainingDate: form.trainingDate,
        trainingProvider: form.trainingProvider,
        topic: form.topic,
        durationDays,
        certificateReceived,
        notes: form.notes || undefined,
      })
      return
    }

    if (!record) return
    await onUpdate({
      version: record.version,
      traineeUserId: form.traineeUserId || null,
      traineeName: form.traineeName,
      traineeRole: form.traineeRole,
      trainingProvider: form.trainingProvider,
      topic: form.topic,
      durationDays,
      certificateReceived,
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
          <FormField label={copy.trainingDate} required error={errors.trainingDate}>
            <TextInput
              type="date"
              value={form.trainingDate}
              onChange={(e) => setField('trainingDate', e.target.value)}
            />
          </FormField>
        ) : (
          <FormField label={copy.trainingDate}>
            <TextInput type="date" value={form.trainingDate} disabled />
          </FormField>
        )}

        {traineeOptions.length > 0 && (
          <FormField label={copy.traineeUser}>
            <SelectInput
              value={form.traineeUserId}
              onChange={(e) => onTraineeSelect(e.target.value)}
            >
              <option value="">{copy.traineeOther}</option>
              {traineeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.fullName}
                </option>
              ))}
            </SelectInput>
          </FormField>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={copy.traineeName} required error={errors.traineeName}>
            <TextInput
              value={form.traineeName}
              onChange={(e) => setField('traineeName', e.target.value)}
              maxLength={200}
              autoComplete="name"
            />
          </FormField>
          <FormField label={copy.traineeRole} required error={errors.traineeRole}>
            <TextInput
              value={form.traineeRole}
              onChange={(e) => setField('traineeRole', e.target.value)}
              maxLength={200}
            />
          </FormField>
        </div>

        <FormField label={copy.trainingProvider} required error={errors.trainingProvider}>
          <TextInput
            value={form.trainingProvider}
            onChange={(e) => setField('trainingProvider', e.target.value)}
            maxLength={300}
          />
        </FormField>

        <FormField label={copy.topic} required error={errors.topic}>
          <TextInput
            value={form.topic}
            onChange={(e) => setField('topic', e.target.value)}
            maxLength={300}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={copy.durationDays} required error={errors.durationDays}>
            <TextInput
              type="number"
              min={1}
              max={365}
              step={1}
              value={form.durationDays}
              onChange={(e) => setField('durationDays', e.target.value)}
            />
          </FormField>
          <FormField label={copy.certificateReceived}>
            <SelectInput
              value={form.certificateReceived}
              onChange={(e) => setField('certificateReceived', e.target.value as 'yes' | 'no')}
            >
              <option value="no">{copy.certificateNo}</option>
              <option value="yes">{copy.certificateYes}</option>
            </SelectInput>
          </FormField>
        </div>

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
