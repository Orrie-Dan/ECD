import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { TextInput, SelectInput } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import type { ApiUserStatus, UpdateUserDto, UserRole } from '@/api/generated/models'
import {
  EDUCATION_LEVEL_OPTIONS,
  PERSON_SEX_OPTIONS,
  type EducationLevel,
  type PersonSex,
} from '@/models/center-educators'

const educationCopy = caretaker.director.educators

export type UserProfileEditInitial = {
  fullName: string
  phone?: string | null
  email?: string | null
  gender?: PersonSex | null
  educationLevel?: EducationLevel | null
  status: ApiUserStatus
  role?: UserRole | string
}

export type UserProfileEditLabels = {
  fullName: string
  phone: string
  email: string
  gender: string
  selectGender: string
  genderMale: string
  genderFemale: string
  educationLevel?: string
  optionalBlank?: string
  status: string
  statusActive: string
  statusSuspended: string
  save: string
  cancel?: string
}

function isCentreStaff(role: string | undefined): boolean {
  return role === 'caregiver' || role === 'ecd_director'
}

export function UserProfileEditForm({
  initial,
  labels,
  pending = false,
  showEducation,
  genderRequired,
  onSubmit,
  onCancel,
  extraActions,
}: {
  initial: UserProfileEditInitial
  labels: UserProfileEditLabels
  pending?: boolean
  showEducation?: boolean
  genderRequired?: boolean
  onSubmit: (dto: UpdateUserDto) => Promise<void>
  onCancel?: () => void
  extraActions?: ReactNode
}) {
  const centreStaff = isCentreStaff(initial.role)
  const requireGender = genderRequired ?? centreStaff
  const includeEducation = showEducation ?? centreStaff

  const [fullName, setFullName] = useState(initial.fullName)
  const [phone, setPhone] = useState(initial.phone ?? '')
  const [email, setEmail] = useState(initial.email ?? '')
  const [gender, setGender] = useState<PersonSex | ''>(initial.gender ?? '')
  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>(
    initial.educationLevel ?? '',
  )
  const [status, setStatus] = useState<ApiUserStatus>(initial.status)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await onSubmit({
      fullName: fullName.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      gender: gender || null,
      ...(includeEducation ? { educationLevel: educationLevel || null } : {}),
      status,
    } as UpdateUserDto)
  }

  return (
    <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={(e) => void handleSubmit(e)}>
      <div>
        <label className="mb-1 block text-caption font-semibold text-text-secondary">
          {labels.fullName}
        </label>
        <TextInput required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-caption font-semibold text-text-secondary">
          {labels.phone}
        </label>
        <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-caption font-semibold text-text-secondary">
          {labels.email}
        </label>
        <TextInput
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-caption font-semibold text-text-secondary">
          {labels.gender}
        </label>
        <SelectInput
          required={requireGender}
          value={gender}
          onChange={(e) => setGender(e.target.value as PersonSex | '')}
        >
          <option value="">{labels.selectGender}</option>
          {PERSON_SEX_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value === 'male' ? labels.genderMale : labels.genderFemale}
            </option>
          ))}
        </SelectInput>
      </div>
      {includeEducation ? (
        <div>
          <label className="mb-1 block text-caption font-semibold text-text-secondary">
            {labels.educationLevel ?? educationCopy.educationLevel}
          </label>
          <SelectInput
            value={educationLevel}
            onChange={(e) => setEducationLevel(e.target.value as EducationLevel | '')}
          >
            <option value="">{labels.optionalBlank ?? educationCopy.optionalBlank}</option>
            {EDUCATION_LEVEL_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {educationCopy.educationLabels[value]}
              </option>
            ))}
          </SelectInput>
        </div>
      ) : null}
      <div>
        <label className="mb-1 block text-caption font-semibold text-text-secondary">
          {labels.status}
        </label>
        <SelectInput
          value={status}
          onChange={(e) => setStatus(e.target.value as ApiUserStatus)}
        >
          <option value="ACTIVE">{labels.statusActive}</option>
          <option value="SUSPENDED">{labels.statusSuspended}</option>
        </SelectInput>
      </div>
      <div className="sm:col-span-2 flex flex-wrap gap-2">
        <Button type="submit" variant="primary" loading={pending} disabled={pending}>
          {labels.save}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            {labels.cancel}
          </Button>
        ) : null}
        {extraActions}
      </div>
    </form>
  )
}
