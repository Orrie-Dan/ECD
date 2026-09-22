import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { StaffTrainingFields } from '@/components/staff-trainings/StaffTrainingFields'
import {
  emptyStaffTrainingFields,
  validateStaffTrainingFields,
  type StaffTrainingFieldValues,
} from '@/lib/staff-training-fields'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import type {
  CreateStaffTrainingInput,
  StaffTrainingViewModel,
  UpdateStaffTrainingInput,
} from '@/models/staff-trainings'
import { parseDurationDays } from '@/lib/staff-training-format'

const copy = caretaker.director.trainings

export type TraineeOption = {
  id: string
  fullName: string
}

type FormState = StaffTrainingFieldValues & {
  traineeUserId: string
  traineeName: string
  traineeRole: string
}

function emptyForm(defaultDate: string): FormState {
  return {
    ...emptyStaffTrainingFields(defaultDate),
    traineeUserId: '',
    traineeName: '',
    traineeRole: copy.traineeRoleDefault,
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

function initialForm(args: {
  mode: 'create' | 'edit'
  record?: StaffTrainingViewModel | null
  lockedTrainee?: TraineeOption | null
}): FormState {
  const defaultDate = new Date().toISOString().slice(0, 10)
  if (args.mode === 'edit' && args.record) return fromRecord(args.record)
  if (args.lockedTrainee) {
    return {
      ...emptyForm(defaultDate),
      traineeUserId: args.lockedTrainee.id,
      traineeName: args.lockedTrainee.fullName,
      traineeRole: copy.traineeRoleDefault,
    }
  }
  return emptyForm(defaultDate)
}

export interface StaffTrainingFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  centerId: string
  record?: StaffTrainingViewModel | null
  traineeOptions: TraineeOption[]
  busy?: boolean
  /** When set, pre-select trainee and hide name/role overrides for linked create. */
  lockedTrainee?: TraineeOption | null
  onClose: () => void
  onCreate: (input: CreateStaffTrainingInput) => Promise<void>
  onUpdate: (input: UpdateStaffTrainingInput) => Promise<void>
}

export function StaffTrainingFormDialog(props: StaffTrainingFormDialogProps) {
  if (!props.open) return null
  const remountKey = [
    props.mode,
    props.record?.id ?? 'new',
    props.record?.version ?? 0,
    props.lockedTrainee?.id ?? 'none',
  ].join(':')
  return <StaffTrainingFormDialogInner key={remountKey} {...props} />
}

function StaffTrainingFormDialogInner({
  mode,
  centerId,
  record,
  traineeOptions,
  busy = false,
  lockedTrainee = null,
  onClose,
  onCreate,
  onUpdate,
}: StaffTrainingFormDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    initialForm({ mode, record, lockedTrainee }),
  )
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

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
    const fieldErrors = validateStaffTrainingFields(form, {
      requireDate: mode === 'create',
    })
    const nextErrors: Partial<Record<keyof FormState, string>> = { ...fieldErrors }

    if (!form.traineeName.trim()) nextErrors.traineeName = copy.traineeNameRequired
    if (!form.traineeRole.trim()) nextErrors.traineeRole = copy.traineeRoleRequired

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

  const showTraineePicker = !lockedTrainee && traineeOptions.length > 0

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
        {showTraineePicker && (
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

        {!lockedTrainee ? (
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
        ) : null}

        <StaffTrainingFields
          values={form}
          errors={errors}
          dateDisabled={mode === 'edit'}
          onChange={(key, value) => {
            setField(key, value as FormState[typeof key])
          }}
        />
      </form>
    </Modal>
  )
}
