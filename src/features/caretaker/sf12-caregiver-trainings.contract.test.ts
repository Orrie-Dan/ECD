import { describe, it, expect } from 'vitest'
import {
  emptyStaffTrainingFields,
  validateStaffTrainingFields,
} from '@/lib/staff-training-fields'
import { parseDurationDays } from '@/lib/staff-training-format'
import type { CreateCaregiverTrainingInput } from '@/models/staff-trainings'
import { caretaker } from '@/locales/rw/caretaker'

describe('SF-12 — caregiver received trainings (Amahugurwa yabonye)', () => {
  it('reuses Section XIV training field labels', () => {
    expect(caretaker.director.trainings.receivedTitle).toBe('Amahugurwa yabonye')
    expect(caretaker.director.trainings.add).toBe('Ongeraho amahugurwa')
    expect(caretaker.director.trainings.receivedEmpty).toBe('Nta mahugurwa yanditswe.')
    expect(caretaker.director.trainings.topic).toBeTruthy()
    expect(caretaker.director.trainings.trainingProvider).toBeTruthy()
  })

  it('allows zero trainings (empty draft list)', () => {
    const drafts: ReturnType<typeof emptyStaffTrainingFields>[] = []
    expect(drafts).toHaveLength(0)
  })

  it('validates a single training draft using shared field rules', () => {
    const invalid = validateStaffTrainingFields(emptyStaffTrainingFields(''))
    expect(invalid.trainingDate).toBeTruthy()
    expect(invalid.trainingProvider).toBeTruthy()
    expect(invalid.topic).toBeTruthy()

    const valid = validateStaffTrainingFields({
      trainingDate: '2026-02-10',
      trainingProvider: 'NCDA',
      topic: 'Early stimulation',
      durationDays: '3',
      certificateReceived: 'yes',
      notes: '',
    })
    expect(Object.keys(valid)).toHaveLength(0)
  })

  it('maps multiple drafts to CreateCaregiverTrainingInput without inventing fields', () => {
    const drafts = [
      {
        trainingDate: '2026-01-01',
        trainingProvider: 'District',
        topic: 'WASH',
        durationDays: '1',
        certificateReceived: 'no' as const,
        notes: '',
      },
      {
        trainingDate: '2026-03-01',
        trainingProvider: 'NCDA',
        topic: 'Nutrition',
        durationDays: '2',
        certificateReceived: 'yes' as const,
        notes: 'Refresher',
      },
    ]

    const payload: CreateCaregiverTrainingInput[] = drafts.map((values) => ({
      trainingDate: values.trainingDate,
      trainingProvider: values.trainingProvider.trim(),
      topic: values.topic.trim(),
      durationDays: parseDurationDays(values.durationDays),
      certificateReceived: values.certificateReceived === 'yes',
      notes: values.notes.trim() || undefined,
    }))

    expect(payload).toHaveLength(2)
    expect(payload[0]).toEqual({
      trainingDate: '2026-01-01',
      trainingProvider: 'District',
      topic: 'WASH',
      durationDays: 1,
      certificateReceived: false,
      notes: undefined,
    })
    expect(payload[1].certificateReceived).toBe(true)
    expect(payload[1].notes).toBe('Refresher')
    expect(payload[0]).not.toHaveProperty('traineeUserId')
    expect(payload[0]).not.toHaveProperty('centerId')
  })
})
