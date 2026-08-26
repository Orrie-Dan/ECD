import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { formatRegisterDate, pickLatestByDate } from '@/lib/register-format'

describe('FE-7 — Unified register UX and director overview', () => {
  describe('shared register formatting', () => {
    it('formats ISO dates in Kinyarwanda locale style', () => {
      const formatted = formatRegisterDate('2026-03-15')
      expect(formatted).not.toBe('2026-03-15')
      expect(formatted).toMatch(/2026/)
    })

    it('picks the latest record by ISO date', () => {
      const latest = pickLatestByDate(
        [
          { id: 'a', date: '2026-01-10' },
          { id: 'b', date: '2026-03-01' },
          { id: 'c', date: '2026-02-20' },
        ],
        (row) => row.date,
      )
      expect(latest?.id).toBe('b')
    })
  })

  describe('shared register primitives', () => {
    const primitives = fs.readFileSync(
      path.resolve(__dirname, '../../components/caretaker/register/RegisterPrimitives.tsx'),
      'utf8',
    )

    it('exports unified list, filter, and action building blocks', () => {
      expect(primitives).toContain('RegisterFiltersCard')
      expect(primitives).toContain('RegisterListPanel')
      expect(primitives).toContain('RegisterRecordCard')
      expect(primitives).toContain('RegisterViewEditActions')
      expect(primitives).toContain('responsive-table-cards')
    })
  })

  describe('director register overview', () => {
    const ikigoPage = fs.readFileSync(
      path.resolve(__dirname, '../../pages/caretaker/director/DirectorPages.tsx'),
      'utf8',
    )
    const overview = fs.readFileSync(
      path.resolve(__dirname, '../../components/caretaker/DirectorRegisterOverview.tsx'),
      'utf8',
    )

    it('renders linked overview tiles on Ikigo page', () => {
      expect(ikigoPage).toContain('DirectorRegisterOverview')
      expect(overview).toContain('CARETAKER_PATHS.bookParentContributions')
      expect(overview).toContain('CARETAKER_PATHS.bookEnvironmentTalks')
      expect(overview).toContain('CARETAKER_PATHS.bookCommittee')
      expect(overview).toContain('CARETAKER_PATHS.bookStaff')
      expect(overview).toContain('CARETAKER_PATHS.bookSupport')
      expect(overview).toContain('CARETAKER_PATHS.bookVisitors')
      expect(overview).toContain('CARETAKER_PATHS.bookTraining')
    })

    it('covers the seven register summary domains', () => {
      const copy = fs.readFileSync(
        path.resolve(__dirname, '../../locales/rw/caretaker.ts'),
        'utf8',
      )
      expect(copy).toContain('registerOverview')
      expect(copy).toContain('contributions')
      expect(copy).toContain('latestParenting')
      expect(copy).toContain('committeeCount')
      expect(copy).toContain('activeCaregivers')
      expect(copy).toContain('latestSupport')
      expect(copy).toContain('latestVisitor')
      expect(copy).toContain('trainingCoverage')
    })
  })

  describe('register pages use shared primitives', () => {
    const pages = [
      'ParentContributionsPage.tsx',
      'ParentingSessionsPage.tsx',
      'CommitteeMembersPage.tsx',
      'EducatorsPage.tsx',
      'CenterSupportPage.tsx',
      'CenterVisitorsPage.tsx',
      'StaffTrainingsPage.tsx',
    ]

    for (const page of pages) {
      it(`${page} imports register primitives`, () => {
        const source = fs.readFileSync(
          path.resolve(__dirname, `../../pages/caretaker/director/${page}`),
          'utf8',
        )
        expect(source).toContain('@/components/caretaker/register')
      })
    }
  })
})
