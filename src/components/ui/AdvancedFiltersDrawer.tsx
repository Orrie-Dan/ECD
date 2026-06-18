import { useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { OptionPicker } from '@/components/ui/OptionPicker'
import { caretaker } from '@/locales/rw/caretaker'
import { common, gender as genderLabels } from '@/locales/rw/common'
import type { Gender } from '@/types'

export type AdvancedGenderFilter = 'all' | Gender
export type AdvancedAgeFilter = 'all' | '3-4' | '5-6'

export interface AttendanceAdvancedFilters {
  gender: AdvancedGenderFilter
  age: AdvancedAgeFilter
  sort: 'absent-first' | 'name-asc' | 'recent-first'
}

export interface ChildrenAdvancedFilters {
  gender: AdvancedGenderFilter
  age: AdvancedAgeFilter
  sort: 'name-asc' | 'name-desc' | 'registered-desc'
}

export const DEFAULT_ATTENDANCE_ADVANCED: AttendanceAdvancedFilters = {
  gender: 'all',
  age: 'all',
  sort: 'absent-first',
}

export const DEFAULT_CHILDREN_ADVANCED: ChildrenAdvancedFilters = {
  gender: 'all',
  age: 'all',
  sort: 'name-asc',
}

interface AdvancedFiltersDrawerProps {
  open: boolean
  onClose: () => void
  variant: 'attendance' | 'children'
  filters: AttendanceAdvancedFilters | ChildrenAdvancedFilters
  onApply: (filters: AttendanceAdvancedFilters | ChildrenAdvancedFilters) => void
}

function getGenderLabel(value: AdvancedGenderFilter): string {
  if (value === 'all') return caretaker.filters.genderAll
  return genderLabels[value]
}

function getAgeLabel(value: AdvancedAgeFilter): string {
  if (value === 'all') return caretaker.filters.ageAll
  if (value === '3-4') return caretaker.children.age34
  return caretaker.children.age56
}

function getSortLabel(
  value: string,
  variant: 'attendance' | 'children'
): string {
  const map: Record<string, string> =
    variant === 'attendance'
      ? {
          'absent-first': caretaker.filters.sortAbsentFirst,
          'name-asc': caretaker.filters.sortNameAsc,
          'recent-first': caretaker.filters.sortRecentFirst,
        }
      : {
          'name-asc': caretaker.filters.sortNameAsc,
          'name-desc': caretaker.filters.sortNameDesc,
          'registered-desc': caretaker.filters.sortRegisteredDesc,
        }
  return map[value] ?? value
}

export function AdvancedFiltersDrawer({
  open,
  onClose,
  variant,
  filters,
  onApply,
}: AdvancedFiltersDrawerProps) {
  const [draft, setDraft] = useState(filters)
  const defaults = variant === 'attendance' ? DEFAULT_ATTENDANCE_ADVANCED : DEFAULT_CHILDREN_ADVANCED

  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  const handleApply = () => {
    onApply(draft)
    onClose()
  }

  const handleReset = () => {
    setDraft(defaults)
  }

  const sortOptions =
    variant === 'attendance'
      ? [
          { value: 'absent-first', label: caretaker.filters.sortAbsentFirst },
          { value: 'name-asc', label: caretaker.filters.sortNameAsc },
          { value: 'recent-first', label: caretaker.filters.sortRecentFirst },
        ]
      : [
          { value: 'name-asc', label: caretaker.filters.sortNameAsc },
          { value: 'name-desc', label: caretaker.filters.sortNameDesc },
          { value: 'registered-desc', label: caretaker.filters.sortRegisteredDesc },
        ]

  const hasChanges =
    draft.gender !== defaults.gender ||
    draft.age !== defaults.age ||
    draft.sort !== defaults.sort

  const summary = useMemo(
    () => [
      getGenderLabel(draft.gender),
      getAgeLabel(draft.age),
      getSortLabel(draft.sort, variant),
    ].join(' · '),
    [draft, variant]
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={caretaker.filters.drawerTitle}
      size="lg"
      footer={
        <div className="w-full space-y-3">
          <Button variant="primary" size="xl" fullWidth onClick={handleApply}>
            {caretaker.filters.apply}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="tertiary"
              size="lg"
              onClick={handleReset}
              disabled={!hasChanges}
              fullWidth
            >
              {caretaker.filters.reset}
            </Button>
            <Button variant="secondary" size="lg" onClick={onClose} fullWidth>
              {common.close}
            </Button>
          </div>
        </div>
      }
    >
      {/* Intro banner */}
      <div className="flex gap-4 p-4 rounded-xl bg-primary-light/60 border border-primary/15 mb-6">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-surface shrink-0 text-primary">
          <SlidersHorizontal size={22} aria-hidden="true" />
        </div>
        <p className="text-body text-text-secondary leading-relaxed m-0">
          {caretaker.filters.drawerIntro}
        </p>
      </div>

      {/* Live summary */}
      <div className="mb-6 px-4 py-3 rounded-xl bg-background-subtle border border-border">
        <p className="text-caption font-semibold text-text-muted uppercase tracking-wide mb-1">
          {caretaker.filters.summaryLabel}
        </p>
        <p className="text-body font-semibold text-text">{summary}</p>
      </div>

      {/* Filter sections — single column so options are never squeezed */}
      <div className="space-y-4 pb-2">
        <OptionPicker
          step={1}
          name="adv-gender"
          layout="inline"
          label={caretaker.filters.genderLabel}
          hint={caretaker.filters.genderHint}
          value={draft.gender}
          onChange={(v) => setDraft((prev) => ({ ...prev, gender: v as AdvancedGenderFilter }))}
          options={[
            { value: 'all', label: caretaker.filters.genderAll },
            { value: 'Umuhungu', label: genderLabels.Umuhungu },
            { value: 'Umukobwa', label: genderLabels.Umukobwa },
          ]}
        />

        <OptionPicker
          step={2}
          name="adv-age"
          layout="inline"
          label={caretaker.filters.ageLabel}
          hint={caretaker.filters.ageHint}
          value={draft.age}
          onChange={(v) => setDraft((prev) => ({ ...prev, age: v as AdvancedAgeFilter }))}
          options={[
            { value: 'all', label: caretaker.filters.ageAll },
            { value: '3-4', label: caretaker.children.age34 },
            { value: '5-6', label: caretaker.children.age56 },
          ]}
        />

        <OptionPicker
          step={3}
          name="adv-sort"
          layout="stacked"
          label={caretaker.filters.sortLabel}
          hint={caretaker.filters.sortHint}
          value={draft.sort}
          onChange={(v) => setDraft((prev) => ({ ...prev, sort: v as typeof draft.sort }))}
          options={sortOptions}
        />
      </div>
    </Modal>
  )
}

export function isAttendanceAdvancedActive(filters: AttendanceAdvancedFilters): boolean {
  return (
    filters.gender !== DEFAULT_ATTENDANCE_ADVANCED.gender ||
    filters.age !== DEFAULT_ATTENDANCE_ADVANCED.age ||
    filters.sort !== DEFAULT_ATTENDANCE_ADVANCED.sort
  )
}

export function isChildrenAdvancedActive(filters: ChildrenAdvancedFilters): boolean {
  return (
    filters.gender !== DEFAULT_CHILDREN_ADVANCED.gender ||
    filters.age !== DEFAULT_CHILDREN_ADVANCED.age ||
    filters.sort !== DEFAULT_CHILDREN_ADVANCED.sort
  )
}
