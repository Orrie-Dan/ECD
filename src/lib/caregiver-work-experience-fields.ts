import { caretaker } from '@/locales/rw/caretaker'

const copy = caretaker.users.workExperience

export type WorkExperienceFieldValues = {
  employer: string
  jobTitle: string
  startDate: string
  endDate: string
  description: string
}

export type WorkExperienceFieldErrors = Partial<
  Record<keyof WorkExperienceFieldValues, string>
>

export function emptyWorkExperienceFields(): WorkExperienceFieldValues {
  return {
    employer: '',
    jobTitle: '',
    startDate: '',
    endDate: '',
    description: '',
  }
}

export function validateWorkExperienceFields(
  values: WorkExperienceFieldValues,
): WorkExperienceFieldErrors {
  const errors: WorkExperienceFieldErrors = {}
  if (!values.employer.trim()) errors.employer = copy.employerRequired
  if (!values.jobTitle.trim()) errors.jobTitle = copy.jobTitleRequired
  if (!values.startDate) errors.startDate = copy.startDateRequired
  if (values.endDate && values.startDate && values.endDate < values.startDate) {
    errors.endDate = copy.endDateInvalid
  }
  return errors
}
