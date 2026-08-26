import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  buildCaretakerNavGroups,
  BOOK_SECTIONS,
  CARETAKER_PATHS,
  findBookSectionByPath,
  getCaretakerPageTitle,
} from '@/layouts/caretaker/navigation'
import { canDirectorMutate } from '@/api/roles'

describe('FE-1 — Director shell, IA, and role gating', () => {
  describe('navigation architecture', () => {
    it('shows daily nav only for caregivers', () => {
      const groups = buildCaretakerNavGroups(false)
      expect(groups).toHaveLength(1)
      expect(groups[0].id).toBe('daily')
      expect(groups[0].items.map((item) => item.id)).toEqual([
        'home',
        'children',
        'attendance',
        'growth',
        'more',
      ])
      expect(groups[0].items.some((item) => item.path === CARETAKER_PATHS.ikigo)).toBe(false)
    })

    it('adds a compact Ikigo group for directors', () => {
      const groups = buildCaretakerNavGroups(true)
      expect(groups.map((group) => group.id)).toEqual(['daily', 'ikigo'])
      expect(groups[0].items.map((item) => item.id)).toEqual([
        'home',
        'children',
        'attendance',
        'growth',
        'more',
      ])
      expect(groups[1].items.map((item) => item.id)).toEqual(['ikigo', 'book', 'management'])
      expect(groups[1].items.find((item) => item.id === 'book')?.children).toHaveLength(
        BOOK_SECTIONS.length,
      )
      expect(groups[1].items.find((item) => item.id === 'management')?.children?.map((item) => item.id)).toEqual(
        ['users', 'selfEval', 'transfers'],
      )
    })

    it('registers all paper book sections VIII–XIV', () => {
      expect(BOOK_SECTIONS.map((section) => section.paperSection)).toEqual([
        'VIII',
        'IX',
        'X',
        'XI',
        'XII',
        'XIII',
        'XIV',
      ])
      expect(findBookSectionByPath(CARETAKER_PATHS.bookTraining)?.id).toBe('training')
    })

    it('keeps hub page titles when those routes live under Ibindi', () => {
      expect(getCaretakerPageTitle(CARETAKER_PATHS.imirire, false)).toBe('Imirire')
      expect(getCaretakerPageTitle(CARETAKER_PATHS.sted, true)).toBe('Gutahura ubumuga')
      expect(getCaretakerPageTitle(CARETAKER_PATHS.more, true)).toBe('Ibindi')
      expect(getCaretakerPageTitle(CARETAKER_PATHS.bookParentContributions, true)).toBe(
        BOOK_SECTIONS.find((section) => section.id === 'parentContributions')?.label,
      )
    })
  })

  describe('mutation gating helper', () => {
    it('allows director mutations only for ecdDirector', () => {
      expect(canDirectorMutate({ role: 'ecdDirector' })).toBe(true)
      expect(canDirectorMutate({ role: 'caretaker' })).toBe(false)
      expect(canDirectorMutate(null)).toBe(false)
    })
  })

  describe('App routing boundary', () => {
    const app = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8')

    it('registers director shell routes behind ecdDirector guard', () => {
      expect(app).toContain('allowedRole="ecdDirector"')
      expect(app).toContain('path="/caretaker/ikigo"')
      expect(app).toContain('path="/caretaker/imicungire"')
      expect(app).toContain('path="/caretaker/igitabo"')
      expect(app).toContain('path="/caretaker/igitabo/umusanzu"')
      expect(app).toContain('path="/caretaker/igitabo/amahugurwa"')
      expect(app).toContain('ParentContributionsPage')
      expect(app).toContain('ParentingSessionsPage')
      expect(app).toContain('CommitteeMembersPage')
      expect(app).toContain('EducatorsPage')
      expect(app).toContain('CenterSupportPage')
      expect(app).toContain('CenterVisitorsPage')
      expect(app).toContain('StaffTrainingsPage')
      expect(app).toContain('path="/caretaker/igitabo/komite"')
      expect(app).toContain('path="/caretaker/igitabo/abarezi"')
      expect(app).toContain('path="/caretaker/igitabo/ubufasha"')
      expect(app).toContain('path="/caretaker/igitabo/abashyitsi"')
      expect(app).toContain('path="/caretaker/igitabo/amahugurwa"')
    })

    it('keeps shared center routes on ECD_CENTER_ROLES', () => {
      expect(app).toContain('allowedRole={ECD_CENTER_ROLES}')
      expect(app).toContain('path="/caretaker/abana"')
    })
  })

  describe('CaretakerLayout uses grouped navigation config', () => {
    const layout = fs.readFileSync(
      path.resolve(__dirname, '../../layouts/CaretakerLayout.tsx'),
      'utf8',
    )

    it('imports caretaker navigation helpers', () => {
      expect(layout).toContain('@/layouts/caretaker/navigation')
      expect(layout).toContain('buildCaretakerNavGroups')
      expect(layout).toContain('getCaretakerPageTitle')
    })
  })
})
