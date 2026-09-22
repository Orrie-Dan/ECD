import { caretaker } from '@/locales/rw/caretaker'
import { validateDurationDays } from '@/lib/staff-training-format'

const copy = caretaker.director.trainings

/** Shared training field values — reused by register form and caregiver registration. */
export type StaffTrainingFieldValues = {
  trainingDate: string
  trainingProvider: string
  topic: string
  durationDays: string
  certificateReceived: 'yes' | 'no'
  notes: string
}

export type StaffTrainingFieldErrors = Partial<
  Record<keyof StaffTrainingFieldValues, string>
>

export function emptyStaffTrainingFields(defaultDate?: string): StaffTrainingFieldValues {
  return {
    trainingDate: defaultDate ?? new Date().toISOString().slice(0, 10),
    trainingProvider: '',
    topic: '',
    durationDays: '1',
    certificateReceived: 'no',
    notes: '',
  }
}

export function validateStaffTrainingFields(
  values: StaffTrainingFieldValues,
  options?: { requireDate?: boolean },
): StaffTrainingFieldErrors {
  const errors: StaffTrainingFieldErrors = {}
  if (options?.requireDate !== false && !values.trainingDate) {
    errors.trainingDate = copy.trainingDateRequired
  }
  if (!values.trainingProvider.trim()) {
    errors.trainingProvider = copy.trainingProviderRequired
  }
  if (!values.topic.trim()) {
    errors.topic = copy.topicRequired
  }
  const durationError = validateDurationDays(values.durationDays)
  if (durationError) errors.durationDays = durationError
  return errors
}
