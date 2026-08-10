import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, RadioGroup, TextInput } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { FilterAccordionSection } from '@/components/ui/FilterAccordion'
import { caretaker } from '@/locales/rw/caretaker'
import { common, gender as genderLabels, GUARDIAN_RELATION_OPTIONS, location } from '@/locales/rw/common'
import {
  DEFAULT_ATTENDANCE_SEARCH,
  DEFAULT_CHILDREN_SEARCH,
  DEFAULT_ROSTER_SEARCH,
  isAttendanceSearchActive,
  isChildrenSearchActive,
  isRosterSearchActive,
  resetLocationField,
  type AttendanceSearchFilters,
  type ChildrenSearchFilters,
  type RosterSearchFilters,
  type SharedChildFilters,
  type ChildStatusFilter,
} from '@/lib/child-filters'
import {
  PROVINCES,
  getDistricts,
  getSectors,
  getCells,
  getVillages,
  getProvinceDisplayName,
  toLocationOptions,
} from '@/lib/rwanda-admin'
import { getGuardianRelationLabel } from '@/lib/guardian-relations'

export type { ChildrenSearchFilters, AttendanceSearchFilters, RosterSearchFilters } from '@/lib/child-filters'
export {
  DEFAULT_CHILDREN_SEARCH,
  DEFAULT_ATTENDANCE_SEARCH,
  DEFAULT_ROSTER_SEARCH,
  DEFAULT_CHILDREN_ADVANCED,
  DEFAULT_ATTENDANCE_ADVANCED,
  isChildrenSearchActive,
  isAttendanceSearchActive,
  isRosterSearchActive,
  isChildrenAdvancedActive,
  isAttendanceAdvancedActive,
} from '@/lib/child-filters'

type SearchFiltersVariant = 'attendance' | 'children' | 'roster'

interface SearchFiltersPanelProps {
  open: boolean
  onClose: () => void
  variant: SearchFiltersVariant
  filters: ChildrenSearchFilters | AttendanceSearchFilters | RosterSearchFilters
  onApply: (
    filters: ChildrenSearchFilters | AttendanceSearchFilters | RosterSearchFilters,
  ) => void
}

function getGenderPreview(value: SharedChildFilters['gender']): string | undefined {
  if (value === 'all') return undefined
  return genderLabels[value]
}

function getAgePreview(value: SharedChildFilters['age']): string | undefined {
  if (value === 'all') return undefined
  if (value === '3-4') return caretaker.children.age34
  return caretaker.children.age56
}

function getLocationPreview(filters: SharedChildFilters): string | undefined {
  const parts: string[] = []
  if (filters.province) parts.push(getProvinceDisplayName(filters.province))
  if (filters.district) parts.push(filters.district)
  if (filters.sector) parts.push(filters.sector)
  return parts.length > 0 ? parts.join(' · ') : undefined
}

function getGuardianPreview(filters: SharedChildFilters): string | undefined {
  const parts: string[] = []
  if (filters.guardianName.trim()) parts.push(filters.guardianName.trim())
  if (filters.guardianRelation) parts.push(getGuardianRelationLabel(filters.guardianRelation))
  return parts.length > 0 ? parts.join(' · ') : undefined
}

export function SearchFiltersPanel({
  open,
  onClose,
  variant,
  filters,
  onApply,
}: SearchFiltersPanelProps) {
  const [draft, setDraft] = useState(filters)
  const defaults =
    variant === 'attendance'
      ? DEFAULT_ATTENDANCE_SEARCH
      : variant === 'roster'
        ? DEFAULT_ROSTER_SEARCH
        : DEFAULT_CHILDREN_SEARCH

  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  const updateDraft = <K extends keyof SharedChildFilters>(key: K, value: SharedChildFilters[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'province' || key === 'district' || key === 'sector' || key === 'cell') {
        return resetLocationField(next, key)
      }
      return next
    })
  }

  const handleApply = () => {
    onApply(draft)
    onClose()
  }

  const handleClear = () => {
    setDraft(defaults)
  }

  const sortOptions =
    variant === 'attendance'
      ? [
          { value: 'absent-first', label: caretaker.filters.sortAbsentFirst },
          { value: 'name-asc', label: caretaker.filters.sortNameAsc },
          { value: 'recent-first', label: caretaker.filters.sortRecentFirst },
        ]
      : variant === 'roster'
        ? [
            { value: 'name-asc', label: caretaker.filters.sortNameAsc },
            { value: 'name-desc', label: caretaker.filters.sortNameDesc },
            { value: 'recent-first', label: caretaker.filters.sortRecentActivity },
          ]
        : [
            { value: 'name-asc', label: caretaker.filters.sortNameAsc },
            { value: 'name-desc', label: caretaker.filters.sortNameDesc },
            { value: 'registered-desc', label: caretaker.filters.sortRegisteredDesc },
          ]

  const isActive =
    variant === 'attendance'
      ? isAttendanceSearchActive(draft as AttendanceSearchFilters, defaults as AttendanceSearchFilters)
      : variant === 'roster'
        ? isRosterSearchActive(draft as RosterSearchFilters, defaults as RosterSearchFilters)
        : isChildrenSearchActive(draft as ChildrenSearchFilters, defaults as ChildrenSearchFilters)

  const childPreview = useMemo(() => {
    const parts = [
      draft.childName.trim() || undefined,
      getGenderPreview(draft.gender),
      getAgePreview(draft.age),
    ].filter(Boolean)
    if (variant === 'children') {
      const status = (draft as ChildrenSearchFilters).status
      if (status === 'active') parts.push(caretaker.filters.statusActive)
      else if (status === 'archived') parts.push(caretaker.filters.statusArchived)
    }
    return parts.length > 0 ? parts.join(' · ') : undefined
  }, [draft, variant])

  const districtOptions = draft.province ? toLocationOptions(getDistricts(draft.province)) : []
  const sectorOptions =
    draft.province && draft.district
      ? toLocationOptions(getSectors(draft.province, draft.district))
      : []
  const cellOptions =
    draft.province && draft.district && draft.sector
      ? toLocationOptions(getCells(draft.province, draft.district, draft.sector))
      : []
  const villageOptions =
    draft.province && draft.district && draft.sector && draft.cell
      ? toLocationOptions(getVillages(draft.province, draft.district, draft.sector, draft.cell))
      : []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={caretaker.filters.panelTitle}
      size="lg"
      footer={
        <div className="w-full space-y-3">
          <Button variant="primary" size="xl" fullWidth onClick={handleApply}>
            {caretaker.filters.apply}
          </Button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="tertiary"
              size="lg"
              onClick={handleClear}
              disabled={!isActive}
              fullWidth
            >
              {caretaker.filters.clearAll}
            </Button>
            <Button variant="secondary" size="lg" onClick={onClose} fullWidth>
              {common.close}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex gap-4 p-4 rounded-xl bg-primary-light/50 border border-primary/15 mb-5">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-surface shrink-0 text-primary">
          <Search size={22} aria-hidden="true" />
        </div>
        <p className="text-body text-text-secondary leading-relaxed m-0">
          {caretaker.filters.panelIntro}
        </p>
      </div>

      <div className="space-y-3 pb-2">
        <FilterAccordionSection
          title={caretaker.filters.sections.childInfo}
          description={caretaker.filters.sections.childInfoDesc}
          preview={childPreview}
          defaultOpen
        >
          <FormField label={caretaker.filters.fields.childName} hint={caretaker.filters.fields.childNameHint}>
            <TextInput
              value={draft.childName}
              onChange={(e) => updateDraft('childName', e.target.value)}
              placeholder={caretaker.filters.fields.childNamePlaceholder}
              className="!min-h-12"
            />
          </FormField>

          <FormField label={caretaker.filters.genderLabel} hint={caretaker.filters.genderHint}>
            <RadioGroup
              name="filter-gender"
              value={draft.gender}
              onChange={(v) => updateDraft('gender', v as SharedChildFilters['gender'])}
              options={[
                { value: 'all', label: caretaker.filters.genderAll },
                { value: 'Umuhungu', label: genderLabels.Umuhungu },
                { value: 'Umukobwa', label: genderLabels.Umukobwa },
              ]}
            />
          </FormField>

          <FormField label={caretaker.filters.ageLabel} hint={caretaker.filters.ageHint}>
            <RadioGroup
              name="filter-age"
              value={draft.age}
              onChange={(v) => updateDraft('age', v as SharedChildFilters['age'])}
              options={[
                { value: 'all', label: caretaker.filters.ageAll },
                { value: '3-4', label: caretaker.children.age34 },
                { value: '5-6', label: caretaker.children.age56 },
              ]}
            />
          </FormField>

          {variant === 'children' && (
            <FormField label={caretaker.filters.statusLabel} hint={caretaker.filters.statusHint}>
              <RadioGroup
                name="filter-status"
                value={(draft as ChildrenSearchFilters).status}
                onChange={(v) =>
                  setDraft(
                    (prev) =>
                      ({
                        ...(prev as ChildrenSearchFilters),
                        status: v as ChildStatusFilter,
                      }) satisfies ChildrenSearchFilters,
                  )
                }
                options={[
                  { value: 'active', label: caretaker.filters.statusActive },
                  { value: 'archived', label: caretaker.filters.statusArchived },
                  { value: 'all', label: caretaker.filters.statusAll },
                ]}
              />
            </FormField>
          )}
        </FilterAccordionSection>

        <FilterAccordionSection
          title={caretaker.filters.sections.location}
          description={caretaker.filters.sections.locationDesc}
          preview={getLocationPreview(draft)}
        >
          <FormField label={location.province}>
            <SearchableSelect
              value={draft.province}
              onChange={(v) => updateDraft('province', v)}
              options={PROVINCES.map((p) => ({ value: p.id, label: p.name }))}
              placeholder={caretaker.filters.defaults.allProvinces}
              searchPlaceholder={caretaker.filters.searchLocation}
              aria-label={location.province}
            />
          </FormField>

          <FormField label={location.district}>
            <SearchableSelect
              value={draft.district}
              onChange={(v) => updateDraft('district', v)}
              options={districtOptions}
              placeholder={caretaker.filters.defaults.allDistricts}
              searchPlaceholder={caretaker.filters.searchLocation}
              disabled={!draft.province}
              aria-label={location.district}
            />
          </FormField>

          <FormField label={location.sector}>
            <SearchableSelect
              value={draft.sector}
              onChange={(v) => updateDraft('sector', v)}
              options={sectorOptions}
              placeholder={caretaker.filters.defaults.allSectors}
              searchPlaceholder={caretaker.filters.searchLocation}
              disabled={!draft.district}
              aria-label={location.sector}
            />
          </FormField>

          <FormField label={location.cell}>
            <SearchableSelect
              value={draft.cell}
              onChange={(v) => updateDraft('cell', v)}
              options={cellOptions}
              placeholder={caretaker.filters.defaults.allCells}
              searchPlaceholder={caretaker.filters.searchLocation}
              disabled={!draft.sector}
              aria-label={location.cell}
            />
          </FormField>

          <FormField label={location.village}>
            <SearchableSelect
              value={draft.village}
              onChange={(v) => updateDraft('village', v)}
              options={villageOptions}
              placeholder={caretaker.filters.defaults.allVillages}
              searchPlaceholder={caretaker.filters.searchLocation}
              disabled={!draft.cell}
              aria-label={location.village}
            />
          </FormField>
        </FilterAccordionSection>

        <FilterAccordionSection
          title={caretaker.filters.sections.guardian}
          description={caretaker.filters.sections.guardianDesc}
          preview={getGuardianPreview(draft)}
        >
          <FormField
            label={caretaker.filters.fields.guardianName}
            hint={caretaker.filters.fields.guardianNameHint}
          >
            <TextInput
              value={draft.guardianName}
              onChange={(e) => updateDraft('guardianName', e.target.value)}
              placeholder={caretaker.filters.fields.guardianNamePlaceholder}
              className="!min-h-12"
            />
          </FormField>

          <FormField label={caretaker.filters.fields.guardianRelation} hint={caretaker.filters.fields.guardianRelationHint}>
            <SearchableSelect
              value={draft.guardianRelation}
              onChange={(v) => updateDraft('guardianRelation', v as SharedChildFilters['guardianRelation'])}
              options={GUARDIAN_RELATION_OPTIONS}
              placeholder={caretaker.filters.defaults.allRelations}
              searchPlaceholder={caretaker.filters.searchRelation}
              aria-label={caretaker.filters.fields.guardianRelation}
            />
          </FormField>
        </FilterAccordionSection>

        <FilterAccordionSection
          title={caretaker.filters.sections.moreOptions}
          description={caretaker.filters.sections.moreOptionsDesc}
          preview={
            draft.sort !== defaults.sort
              ? sortOptions.find((o) => o.value === draft.sort)?.label
              : undefined
          }
        >
          <FormField label={caretaker.filters.sortLabel} hint={caretaker.filters.sortHint}>
            <RadioGroup
              name="filter-sort"
              value={draft.sort}
              onChange={(v) =>
                setDraft((prev) => {
                  if (variant === 'children') {
                    return {
                      ...(prev as ChildrenSearchFilters),
                      sort: v as ChildrenSearchFilters['sort'],
                    }
                  }
                  if (variant === 'roster') {
                    return {
                      ...(prev as RosterSearchFilters),
                      sort: v as RosterSearchFilters['sort'],
                    }
                  }
                  return {
                    ...(prev as AttendanceSearchFilters),
                    sort: v as AttendanceSearchFilters['sort'],
                  }
                })
              }
              options={sortOptions}
            />
          </FormField>
        </FilterAccordionSection>
      </div>
    </Modal>
  )
}

/** @deprecated Use SearchFiltersPanel */
export const AdvancedFiltersDrawer = SearchFiltersPanel
