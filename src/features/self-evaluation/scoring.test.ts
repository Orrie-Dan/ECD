import { describe, expect, it } from 'vitest'
import { loadChecklistCatalog, scoreSelfEvaluation } from './scoring'

describe('self-evaluation scoring', () => {
  const catalog = loadChecklistCatalog()

  it('loads facility checklists from generated JSON', () => {
    expect(catalog.facilityTypes).toHaveLength(2)
    const ids = catalog.facilityTypes.map((f) => f.id)
    expect(ids).toEqual(['daycare', 'ecd_3_5'])
  })

  it('scores 100% green when all items are met (daycare sample)', () => {
    const daycare = catalog.facilityTypes.find((f) => f.id === 'daycare')!
    const answers: Record<string, boolean> = {}
    for (const section of daycare.sections) {
      for (const item of section.items) {
        if (item.indicators.length > 0) {
          for (const ind of item.indicators) {
            answers[ind.id] = true
          }
        } else {
          answers[item.id] = true
        }
      }
    }
    const result = scoreSelfEvaluation(daycare, answers, catalog.ranks)
    expect(result.percent).toBe(100)
    expect(result.rank.id).toBe('green')
    expect(result.earnedScore).toBe(daycare.computedMaxScore)
  })

  it('scores 0% red when nothing is met', () => {
    const ecd = catalog.facilityTypes.find((f) => f.id === 'ecd_3_5')!
    const result = scoreSelfEvaluation(ecd, {}, catalog.ranks)
    expect(result.percent).toBe(0)
    expect(result.rank.id).toBe('red')
  })

  it('maps rank bands correctly', () => {
    const daycare = catalog.facilityTypes.find((f) => f.id === 'daycare')!
    const max = daycare.computedMaxScore
    const metCount = Math.ceil(max * 0.75)
    const answers: Record<string, boolean> = {}
    let count = 0
    outer: for (const section of daycare.sections) {
      for (const item of section.items) {
        if (count >= metCount) break outer
        answers[item.id] = true
        count += item.maxScore
      }
    }
    const result = scoreSelfEvaluation(daycare, answers, catalog.ranks)
    expect(result.percent).toBeGreaterThanOrEqual(70)
    expect(result.percent).toBeLessThanOrEqual(89)
    expect(result.rank.id).toBe('blue')
  })
})
