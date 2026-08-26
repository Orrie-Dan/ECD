import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import {
  DISTRICT_REGISTER_SECTIONS,
  NCDA_REGISTER_SECTIONS,
} from '@/components/registers/register-sections'
import { hasRegisterListScope } from '@/lib/register-scope'

describe('FE-8 — District and NCDA supervisory register views', () => {
  const app = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8')
  const districtPages = fs.readFileSync(
    path.resolve(__dirname, '../../pages/district/registers/DistrictRegisterPages.tsx'),
    'utf8',
  )
  const ncdaPages = fs.readFileSync(
    path.resolve(__dirname, '../../pages/ncda/registers/NcdaRegisterPages.tsx'),
    'utf8',
  )
  const contributionList = fs.readFileSync(
    path.resolve(__dirname, '../../components/registers/ContributionList.tsx'),
    'utf8',
  )

  describe('route registration', () => {
    it('registers district book routes behind districtOfficer guard', () => {
      expect(app).toContain('allowedRole="districtOfficer"')
      expect(app).toContain('path="/district/igitabo"')
      expect(app).toContain('path="/district/igitabo/:section"')
      expect(app).toContain('DistrictRegisterHubPage')
      expect(app).toContain('DistrictRegisterSectionPage')
    })

    it('registers NCDA book routes behind ncda guard', () => {
      expect(app).toContain('allowedRole="ncda"')
      expect(app).toContain('path="/ncda/igitabo"')
      expect(app).toContain('path="/ncda/igitabo/:section"')
      expect(app).toContain('NcdaRegisterHubPage')
      expect(app).toContain('NcdaRegisterSectionPage')
    })
  })

  describe('read-only supervisory pages', () => {
    it('district pages show read-only banner and scope filters without mutation hooks', () => {
      expect(districtPages).toContain('SupervisoryReadOnlyBanner')
      expect(districtPages).toContain('DistrictRegisterScopeFilters')
      expect(districtPages).not.toMatch(
        /useCreate|useUpdate|useArchive|useDeactivate|ContributionFormDialog/,
      )
    })

    it('NCDA pages show read-only banner and scope filters without mutation hooks', () => {
      expect(ncdaPages).toContain('SupervisoryReadOnlyBanner')
      expect(ncdaPages).toContain('NcdaRegisterScopeFilters')
      expect(ncdaPages).not.toMatch(
        /useCreate|useUpdate|useArchive|useDeactivate|ContributionFormDialog/,
      )
    })

    it('ContributionList supports readOnly mode for supervisory reuse', () => {
      expect(contributionList).toContain('mode === \'readOnly\'')
      expect(contributionList).toContain('RegisterViewEditActions')
    })
  })

  describe('register section parity', () => {
    it('mirrors director book sections VIII–XIV for district and NCDA', () => {
      const paperSections = DISTRICT_REGISTER_SECTIONS.map((section) => section.paperSection)
      expect(paperSections).toEqual(['VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'])
      expect(NCDA_REGISTER_SECTIONS.map((section) => section.id)).toEqual(
        DISTRICT_REGISTER_SECTIONS.map((section) => section.id),
      )
    })

    it('uses consistent path segments under book hub', () => {
      const segments = DISTRICT_REGISTER_SECTIONS.map((section) => section.pathSegment)
      expect(segments).toEqual([
        'umusanzu',
        'ibiganiro',
        'komite',
        'abarezi',
        'ubufasha',
        'abashyitsi',
        'amahugurwa',
      ])
      expect(`${DISTRICT_PATHS.book}/${segments[0]}`).toBe('/district/igitabo/umusanzu')
      expect(`${NCDA_PATHS.book}/${segments.at(-1)!}`).toBe('/ncda/igitabo/amahugurwa')
    })
  })

  describe('register list scope', () => {
    it('allows district-wide queries when districtId is present', () => {
      expect(hasRegisterListScope({ districtId: 'district-1' })).toBe(true)
      expect(hasRegisterListScope({ districtId: 'district-1', centerId: undefined })).toBe(true)
    })

    it('requires district or center selection for national scope', () => {
      expect(hasRegisterListScope({})).toBe(false)
      expect(hasRegisterListScope({ centerId: 'center-1' })).toBe(true)
      expect(hasRegisterListScope({ districtId: 'district-1' })).toBe(true)
    })
  })
})
