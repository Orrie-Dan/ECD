import { caretaker } from '@/locales/rw/caretaker'
import type { EducationLevel, PersonSex } from '@/models/center-educators'
import type { CommitteeMemberViewModel } from '@/models/committee-members'

const committeeCopy = caretaker.director.committee
const educatorsCopy = caretaker.director.educators

export function formatCommitteeStatus(isActive: boolean): string {
  return isActive ? committeeCopy.statusActive : committeeCopy.statusInactive
}

export function formatCommitteeDate(date: string | null | undefined): string {
  if (!date) return '—'
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  return new Intl.DateTimeFormat('rw-RW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

export function formatCommitteePhone(phone: string | null | undefined): string {
  return phone?.trim() || '—'
}

export function formatMembershipSpan(member: CommitteeMemberViewModel): string {
  const start = formatCommitteeDate(member.startDate)
  if (member.isActive) {
    return `${start} → ${committeeCopy.ongoing}`
  }
  return `${start} → ${formatCommitteeDate(member.endDate)}`
}

export function formatPersonSex(value: PersonSex | null | undefined): string {
  if (!value) return '—'
  return educatorsCopy.genderLabels[value] ?? value
}

export function formatEducationLevel(value: EducationLevel | null | undefined): string {
  if (!value) return '—'
  return educatorsCopy.educationLabels[value] ?? value
}
