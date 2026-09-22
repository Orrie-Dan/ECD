import { describe, it, expect } from 'vitest'
import {
  emptyWorkExperienceFields,
  validateWorkExperienceFields,
} from '@/lib/caregiver-work-experience-fields'
import type { CreateCaregiverWorkExperienceInput } from '@/models/caregiver-work-experiences'
import { caretaker } from '@/locales/rw/caretaker'

describe('SF-13 — caregiver work experience (Ubunararibonye)', () => {
  it('uses CV-style locale labels', () => {
    expect(caretaker.users.workExperience.title).toBe('Ubunararibonye')
    expect(caretaker.users.workExperience.empty).toBe('Nta bunararibonye bwanditswe.')
    expect(caretaker.users.workExperience.employer).toBeTruthy()
    expect(caretaker.users.workExperience.jobTitle).toBeTruthy()
  })

  it('allows zero work experiences', () => {
    expect([] as ReturnType<typeof emptyWorkExperienceFields>[]).toHaveLength(0)
  })

  it('validates required employer, title, and start date', () => {
    const invalid = validateWorkExperienceFields(emptyWorkExperienceFields())
    expect(invalid.employer).toBeTruthy()
    expect(invalid.jobTitle).toBeTruthy()
    expect(invalid.startDate).toBeTruthy()

    const valid = validateWorkExperienceFields({
      employer: 'NCDA',
      jobTitle: 'Caregiver',
      startDate: '2021-01-01',
      endDate: '2023-12-31',
      description: 'Support',
    })
    expect(Object.keys(valid)).toHaveLength(0)
  })

  it('rejects endDate before startDate', () => {
    const errors = validateWorkExperienceFields({
      employer: 'NCDA',
      jobTitle: 'Caregiver',
      startDate: '2024-01-01',
      endDate: '2020-01-01',
      description: '',
    })
    expect(errors.endDate).toBeTruthy()
  })

  it('maps drafts to create payload without inventing userId/centerId', () => {
    const drafts = [
      {
        employer: 'NCDA',
        jobTitle: 'Caregiver',
        startDate: '2021-01-01',
        endDate: '',
        description: '',
      },
    ]
    const payload: CreateCaregiverWorkExperienceInput[] = drafts.map((values) => ({
      employer: values.employer.trim(),
      jobTitle: values.jobTitle.trim(),
      startDate: values.startDate,
      endDate: values.endDate.trim() || undefined,
      description: values.description.trim() || undefined,
    }))
    expect(payload[0]).toEqual({
      employer: 'NCDA',
      jobTitle: 'Caregiver',
      startDate: '2021-01-01',
      endDate: undefined,
      description: undefined,
    })
    expect(payload[0]).not.toHaveProperty('userId')
  })
})
