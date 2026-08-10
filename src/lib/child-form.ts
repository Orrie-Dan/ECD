import { caretaker } from '@/locales/rw/caretaker'
import type { ChildRegistrationForm, Child, Gender, GuardianRelation } from '@/types'
import { getProvinceDisplayName, getProvinceKeyFromDisplayName } from '@/lib/rwanda-admin'
import { calculateAge } from '@/lib/mock-data'
import { common } from '@/locales/rw/common'

export const EMPTY_CHILD_FORM: ChildRegistrationForm = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  specialNeeds: '',
  guardianName: '',
  guardianPhone: '',
  guardianRelation: '',
  guardian2Name: '',
  guardian2Phone: '',
  guardian2Relation: '',
  province: '',
  district: '',
  sector: '',
  cell: '',
  village: '',
}

export function childToForm(child: Child): ChildRegistrationForm {
  return {
    fullName: child.fullName,
    dateOfBirth: child.dateOfBirth,
    gender: child.gender,
    specialNeeds: child.specialNeeds ?? '',
    guardianName: child.guardianName,
    guardianPhone: child.guardianPhone,
    guardianRelation: child.guardianRelation,
    guardian2Name: child.guardian2Name ?? '',
    guardian2Phone: child.guardian2Phone ?? '',
    guardian2Relation: child.guardian2Relation ?? '',
    province: getProvinceKeyFromDisplayName(child.province),
    district: child.district,
    sector: child.sector,
    cell: child.cell,
    village: child.village,
  }
}

export function formToChildPayload(form: ChildRegistrationForm) {
  return {
    fullName: form.fullName.trim(),
    dateOfBirth: form.dateOfBirth,
    gender: form.gender as Gender,
    ...(form.specialNeeds.trim() ? { specialNeeds: form.specialNeeds.trim() } : { specialNeeds: undefined }),
    guardianName: form.guardianName.trim(),
    guardianPhone: form.guardianPhone.trim(),
    guardianRelation: form.guardianRelation as GuardianRelation,
    ...(form.guardian2Name.trim()
      ? {
          guardian2Name: form.guardian2Name.trim(),
          guardian2Phone: form.guardian2Phone.trim(),
          guardian2Relation: form.guardian2Relation as GuardianRelation,
        }
      : {
          guardian2Name: undefined,
          guardian2Phone: undefined,
          guardian2Relation: undefined,
        }),
    province: getProvinceDisplayName(form.province),
    district: form.district,
    sector: form.sector,
    cell: form.cell,
    village: form.village,
  }
}

const PHONE_PATTERN = /^(07\d{8}|2507\d{8}|\+2507\d{8})$/

export function isValidRwandaPhone(phone: string): boolean {
  return PHONE_PATTERN.test(phone.replace(/[\s-]/g, ''))
}

export function validateChildFormStep(
  form: ChildRegistrationForm,
  currentStep: number,
): Partial<Record<keyof ChildRegistrationForm, string>> {
  const newErrors: Partial<Record<keyof ChildRegistrationForm, string>> = {}

  if (currentStep === 1) {
    if (!form.fullName.trim()) newErrors.fullName = common.required
    if (!form.dateOfBirth) {
      newErrors.dateOfBirth = common.required
    } else {
      const today = new Date().toISOString().split('T')[0]
      if (form.dateOfBirth > today) {
        newErrors.dateOfBirth = caretaker.registration.dateOfBirthFuture
      } else {
        const age = calculateAge(form.dateOfBirth)
        if (age > 8) {
          newErrors.dateOfBirth = caretaker.registration.dateOfBirthTooOld
        }
      }
    }
    if (!form.gender) newErrors.gender = common.required
  }

  if (currentStep === 2) {
    if (!form.guardianName.trim()) newErrors.guardianName = common.required
    if (!form.guardianPhone.trim()) {
      newErrors.guardianPhone = common.required
    } else if (!isValidRwandaPhone(form.guardianPhone)) {
      newErrors.guardianPhone = caretaker.registration.guardianPhoneInvalid
    }
    if (!form.guardianRelation) {
      newErrors.guardianRelation = caretaker.registration.guardianRelationRequired
    }

    const hasGuardian2 =
      form.guardian2Name.trim() || form.guardian2Phone.trim() || form.guardian2Relation
    if (hasGuardian2) {
      if (!form.guardian2Name.trim()) newErrors.guardian2Name = common.required
      if (!form.guardian2Phone.trim()) {
        newErrors.guardian2Phone = common.required
      } else if (!isValidRwandaPhone(form.guardian2Phone)) {
        newErrors.guardian2Phone = caretaker.registration.guardianPhoneInvalid
      }
      if (!form.guardian2Relation) {
        newErrors.guardian2Relation = caretaker.registration.guardianRelationRequired
      }
    }
  }

  if (currentStep === 3) {
    if (!form.province) newErrors.province = common.required
    if (!form.district) newErrors.district = common.required
    if (!form.sector) newErrors.sector = common.required
    if (!form.cell) newErrors.cell = common.required
    if (!form.village) newErrors.village = common.required
  }

  return newErrors
}

export function applyLocationCascade(
  prev: ChildRegistrationForm,
  key: keyof ChildRegistrationForm,
  value: ChildRegistrationForm[keyof ChildRegistrationForm],
): ChildRegistrationForm {
  const next = { ...prev, [key]: value }
  if (key === 'province') {
    next.district = ''
    next.sector = ''
    next.cell = ''
    next.village = ''
  }
  if (key === 'district') {
    next.sector = ''
    next.cell = ''
    next.village = ''
  }
  if (key === 'sector') {
    next.cell = ''
    next.village = ''
  }
  if (key === 'cell') {
    next.village = ''
  }
  return next
}
