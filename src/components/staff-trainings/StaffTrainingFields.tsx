import { FormField, TextInput, TextArea, SelectInput } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import type {
  StaffTrainingFieldErrors,
  StaffTrainingFieldValues,
} from '@/lib/staff-training-fields'

const copy = caretaker.director.trainings

export interface StaffTrainingFieldsProps {
  values: StaffTrainingFieldValues
  errors?: StaffTrainingFieldErrors
  /** When true, date is shown disabled (edit mode for existing records). */
  dateDisabled?: boolean
  onChange: <K extends keyof StaffTrainingFieldValues>(
    key: K,
    value: StaffTrainingFieldValues[K],
  ) => void
}

/**
 * Shared StaffTraining form fields (date, provider, topic, duration, certificate, notes).
 * Extracted so caregiver registration and the Section XIV dialog stay aligned.
 */
export function StaffTrainingFields({
  values,
  errors = {},
  dateDisabled = false,
  onChange,
}: StaffTrainingFieldsProps) {
  return (
    <div className="space-y-4">
      <FormField label={copy.trainingDate} required={!dateDisabled} error={errors.trainingDate}>
        <TextInput
          type="date"
          value={values.trainingDate}
          disabled={dateDisabled}
          onChange={(e) => onChange('trainingDate', e.target.value)}
        />
      </FormField>

      <FormField label={copy.trainingProvider} required error={errors.trainingProvider}>
        <TextInput
          value={values.trainingProvider}
          onChange={(e) => onChange('trainingProvider', e.target.value)}
          maxLength={300}
        />
      </FormField>

      <FormField label={copy.topic} required error={errors.topic}>
        <TextInput
          value={values.topic}
          onChange={(e) => onChange('topic', e.target.value)}
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
            value={values.durationDays}
            onChange={(e) => onChange('durationDays', e.target.value)}
          />
        </FormField>
        <FormField label={copy.certificateReceived}>
          <SelectInput
            value={values.certificateReceived}
            onChange={(e) =>
              onChange('certificateReceived', e.target.value as 'yes' | 'no')
            }
          >
            <option value="no">{copy.certificateNo}</option>
            <option value="yes">{copy.certificateYes}</option>
          </SelectInput>
        </FormField>
      </div>

      <FormField label={copy.notes}>
        <TextArea
          value={values.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder={copy.notesPlaceholder}
          rows={2}
        />
      </FormField>
    </div>
  )
}
