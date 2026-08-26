import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Check, ChevronDown, Clock, Search, Star, UserRound, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { calculateAge } from '@/lib/mock-data'
import { getTodayDate } from '@/lib/nutrition-utils'
import {
  formatRelativeGrowthLabel,
  getFrequentChildIds,
  getRecentChildIds,
  matchesChildSearch,
  passesQuickFilter,
  recordChildSelection,
  sortChildrenForPicker,
  splitHighlightParts,
  type ChildPickerMeta,
  type ChildPickerQuickFilter,
} from '@/lib/child-picker'
import type { Child } from '@/types'

const FILTER_OPTIONS: { id: ChildPickerQuickFilter; label: string }[] = [
  { id: 'all', label: caretaker.childPicker.filterAll },
  { id: 'age_1_3', label: caretaker.childPicker.filterAge1_3 },
  { id: 'age_4_6', label: caretaker.childPicker.filterAge4_6 },
  { id: 'needs_follow_up', label: caretaker.childPicker.filterFollowUp },
  { id: 'overdue_growth', label: caretaker.childPicker.filterOverdueGrowth },
  { id: 'at_nutritional_risk', label: caretaker.childPicker.filterAtRisk },
]

export interface ChildPickerProps {
  childrenList: Child[]
  value: string
  onChange: (childId: string, child: Child) => void
  placeholder?: string
  searchPlaceholder?: string
  error?: boolean
  disabled?: boolean
  loading?: boolean
  /** Scopes recent/frequent storage (e.g. centerId + feature). */
  recentScope?: string
  /** Optional per-child metadata for filters and card details. */
  getMeta?: (child: Child) => ChildPickerMeta | undefined
  /** Which quick filters to show. Defaults to all. */
  availableFilters?: ChildPickerQuickFilter[]
  /** Initial / controlled quick filter. */
  defaultFilter?: ChildPickerQuickFilter
  emptyMessage?: string
  'aria-label'?: string
  id?: string
  className?: string
  /** Controlled open state (optional). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Hide the default trigger and rely on controlled open / external button. */
  hideTrigger?: boolean
  /** Show a clear control on the trigger when a child is selected. */
  allowClear?: boolean
  onClear?: () => void
}

function HighlightedName({ name, query }: { name: string; query: string }) {
  const parts = splitHighlightParts(name, query)
  return (
    <span>
      {parts.map((part, i) =>
        part.match ? (
          <mark
            key={i}
            className="bg-accent-light text-text rounded-sm px-0.5 font-semibold"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  )
}

function ChildResultCard({
  child,
  selected,
  active,
  query,
  meta,
  onSelect,
  onMouseEnter,
  buttonRef,
}: {
  child: Child
  selected: boolean
  active: boolean
  query: string
  meta?: ChildPickerMeta
  onSelect: () => void
  onMouseEnter: () => void
  buttonRef: (node: HTMLButtonElement | null) => void
}) {
  const age = calculateAge(child.dateOfBirth)
  const today = getTodayDate()
  const growthLabel = formatRelativeGrowthLabel(meta?.lastGrowthDate, today, {
    never: caretaker.childPicker.neverMeasured,
    today: caretaker.childPicker.measuredToday,
    yesterday: caretaker.childPicker.measuredYesterday,
    daysAgo: caretaker.childPicker.daysAgo,
    weeksAgo: caretaker.childPicker.weeksAgo,
  })

  return (
    <button
      ref={buttonRef}
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={`
        w-full text-left rounded-xl border p-3.5 min-h-[4.5rem] transition-colors
        focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
        ${
          selected
            ? 'border-primary bg-primary-light/40 ring-1 ring-primary/30'
            : active
              ? 'border-primary/40 bg-background-subtle'
              : 'border-border bg-surface hover:border-primary/25 hover:bg-background-subtle/70'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            selected ? 'bg-primary !text-white [&_svg]:!text-white' : 'bg-background-subtle text-text-muted'
          }`}
          aria-hidden
        >
          <UserRound size={22} />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-body font-semibold text-text leading-snug">
              <HighlightedName name={child.fullName} query={query} />
            </p>
            {selected && (
              <Check size={18} className="text-primary shrink-0 mt-0.5" aria-hidden />
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-caption text-text-secondary">
            <div>
              <dt className="sr-only">{caretaker.childPicker.age}</dt>
              <dd>
                {caretaker.childPicker.age}:{' '}
                <span className="font-medium text-text tabular-nums">
                  {age} {caretaker.sted.years}
                </span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">{common.labels.gender}</dt>
              <dd className="font-medium text-text">{child.gender}</dd>
            </div>
            <div className="col-span-2">
              <dt className="sr-only">{caretaker.childPicker.center}</dt>
              <dd>
                {caretaker.childPicker.center}:{' '}
                <span className="font-medium text-text">{child.centerName}</span>
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="sr-only">{caretaker.childPicker.lastGrowth}</dt>
              <dd>
                {caretaker.childPicker.lastGrowth}:{' '}
                <span className="font-medium text-text">{growthLabel}</span>
              </dd>
            </div>
          </dl>
          {(meta?.overdueGrowth || meta?.atNutritionalRisk || meta?.needsFollowUp) && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {meta.overdueGrowth && (
                <span className="rounded-full bg-error-light text-error px-2 py-0.5 text-caption font-semibold">
                  {caretaker.childPicker.filterOverdueGrowth}
                </span>
              )}
              {meta.atNutritionalRisk && (
                <span className="rounded-full bg-warning-light text-warning px-2 py-0.5 text-caption font-semibold">
                  {caretaker.childPicker.filterAtRisk}
                </span>
              )}
              {meta.needsFollowUp && (
                <span className="rounded-full bg-secondary-light text-secondary px-2 py-0.5 text-caption font-semibold">
                  {caretaker.childPicker.filterFollowUp}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function SkeletonList() {
  return (
    <div className="space-y-2" role="status" aria-busy="true" aria-label={common.loading}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-3.5 flex gap-3">
          <Skeleton width="2.75rem" height="2.75rem" rounded="lg" className="shrink-0" />
          <div className="flex-1 min-w-0">
            <SkeletonText lines={3} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SectionLabel({
  icon,
  children,
}: {
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-text-muted px-0.5">
      <span aria-hidden>{icon}</span>
      {children}
    </p>
  )
}

export function ChildPicker({
  childrenList,
  value,
  onChange,
  placeholder = caretaker.childPicker.placeholder,
  searchPlaceholder = caretaker.childPicker.searchPlaceholder,
  error = false,
  disabled = false,
  loading = false,
  recentScope = 'default',
  getMeta,
  availableFilters,
  defaultFilter = 'all',
  emptyMessage = caretaker.childPicker.noChildren,
  'aria-label': ariaLabel,
  id,
  className = '',
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  allowClear = false,
  onClear,
}: ChildPickerProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const listboxId = `${controlId}-listbox`
  const searchId = `${controlId}-search`

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    onOpenChange?.(next)
    if (openProp === undefined) setUncontrolledOpen(next)
  }
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filter, setFilter] = useState<ChildPickerQuickFilter>(defaultFilter)
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentTick, setRecentTick] = useState(0)

  const searchRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const triggerRef = useRef<HTMLButtonElement>(null)

  const selectedChild = childrenList.find((c) => c.id === value)

  const filters = useMemo(() => {
    const allowed = availableFilters ?? FILTER_OPTIONS.map((f) => f.id)
    return FILTER_OPTIONS.filter((f) => allowed.includes(f.id))
  }, [availableFilters])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 120)
    return () => window.clearTimeout(t)
  }, [query])

  const recentIds = useMemo(
    () => getRecentChildIds(recentScope),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recentTick forces refresh after select
    [recentScope, recentTick, open],
  )
  const frequentIds = useMemo(
    () => getFrequentChildIds(recentScope),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recentScope, recentTick, open],
  )

  const filtered = useMemo(() => {
    const matched = childrenList.filter((child) => {
      if (!matchesChildSearch(child, debouncedQuery)) return false
      const meta = getMeta?.(child)
      const age = calculateAge(child.dateOfBirth)
      return passesQuickFilter(child, filter, meta, age)
    })
    return sortChildrenForPicker(matched, recentIds, frequentIds)
  }, [childrenList, debouncedQuery, filter, getMeta, recentIds, frequentIds])

  const recentChildren = useMemo(() => {
    if (debouncedQuery.trim() || filter !== 'all') return []
    return recentIds
      .map((id) => childrenList.find((c) => c.id === id))
      .filter((c): c is Child => !!c)
      .slice(0, 5)
  }, [recentIds, childrenList, debouncedQuery, filter])

  const frequentChildren = useMemo(() => {
    if (debouncedQuery.trim() || filter !== 'all') return []
    const recentSet = new Set(recentChildren.map((c) => c.id))
    return frequentIds
      .map((id) => childrenList.find((c) => c.id === id))
      .filter((c): c is Child => !!c && !recentSet.has(c.id))
      .slice(0, 4)
  }, [frequentIds, childrenList, recentChildren, debouncedQuery, filter])

  const flatResults = useMemo(() => {
    if (debouncedQuery.trim() || filter !== 'all') return filtered
    const pinnedIds = new Set([
      ...recentChildren.map((c) => c.id),
      ...frequentChildren.map((c) => c.id),
    ])
    return filtered.filter((c) => !pinnedIds.has(c.id))
  }, [filtered, recentChildren, frequentChildren, debouncedQuery, filter])

  const navigable = useMemo(() => {
    if (debouncedQuery.trim() || filter !== 'all') return filtered
    return [...recentChildren, ...frequentChildren, ...flatResults]
  }, [
    debouncedQuery,
    filter,
    filtered,
    recentChildren,
    frequentChildren,
    flatResults,
  ])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setDebouncedQuery('')
    setActiveIndex(0)
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }, [])

  const selectChild = useCallback(
    (child: Child) => {
      recordChildSelection(recentScope, child.id)
      setRecentTick((n) => n + 1)
      onChange(child.id, child)
      close()
    },
    [close, onChange, recentScope],
  )

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() =>
      searchRef.current?.focus({ preventScroll: true }),
    )
    setQuery('')
    setDebouncedQuery('')
    setFilter(defaultFilter)
    setActiveIndex(0)
    return () => cancelAnimationFrame(frame)
  }, [open, defaultFilter])

  useEffect(() => {
    if (!open) return
    setActiveIndex(0)
  }, [debouncedQuery, filter, open])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, navigable])

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(navigable.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (event.key === 'Enter' && navigable[activeIndex]) {
      event.preventDefault()
      selectChild(navigable[activeIndex])
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  const renderCardAt = (child: Child, index: number) => (
    <ChildResultCard
      key={child.id}
      child={child}
      selected={child.id === value}
      active={index === activeIndex}
      query={debouncedQuery}
      meta={getMeta?.(child)}
      onSelect={() => selectChild(child)}
      onMouseEnter={() => setActiveIndex(index)}
      buttonRef={(node) => {
        optionRefs.current[index] = node
      }}
    />
  )

  let navOffset = 0
  const takeSlice = (list: Child[]) => {
    const start = navOffset
    navOffset += list.length
    return list.map((child, i) => renderCardAt(child, start + i))
  }

  const mainList =
    debouncedQuery.trim() || filter !== 'all' ? filtered : flatResults

  return (
    <div className={className}>
      {!hideTrigger && (
        <div className="relative flex gap-2">
          <button
            ref={triggerRef}
            id={controlId}
            type="button"
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={ariaLabel ?? placeholder}
            aria-invalid={error || undefined}
            onClick={() => {
              if (!disabled) setOpen(true)
            }}
            className={`
              relative flex-1 min-h-12 px-3.5 pr-10 text-body rounded-lg border bg-surface text-text
              text-left input-focus flex items-center gap-3
              ${error ? 'border-error' : 'border-border'}
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              ${open ? 'border-primary ring-2 ring-primary/15' : ''}
            `}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                selectedChild ? 'bg-primary-light text-primary' : 'bg-background-subtle text-text-muted'
              }`}
              aria-hidden
            >
              <UserRound size={18} />
            </span>
            <span className="min-w-0 flex-1">
              {selectedChild ? (
                <>
                  <span className="block font-semibold text-text truncate">
                    {selectedChild.fullName}
                  </span>
                  <span className="block text-caption text-text-secondary truncate">
                    {calculateAge(selectedChild.dateOfBirth)} {caretaker.sted.years} ·{' '}
                    {selectedChild.gender}
                  </span>
                </>
              ) : (
                <span className="text-text-muted">{placeholder}</span>
              )}
            </span>
            <ChevronDown
              size={18}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted"
              aria-hidden
            />
          </button>
          {allowClear && selectedChild && (
            <button
              type="button"
              onClick={() => onClear?.()}
              className="min-h-12 min-w-12 shrink-0 rounded-lg border border-border bg-surface text-text-muted hover:bg-background-subtle flex items-center justify-center"
              aria-label={common.clearFilters}
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      <Modal
        open={open}
        onClose={close}
        title={ariaLabel ?? placeholder}
        size="lg"
      >
        <div className="space-y-4 -mx-1">
          {/* Sticky search */}
          <div className="sticky top-0 z-10 bg-surface pb-2 space-y-3">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                aria-hidden
              />
              <input
                ref={searchRef}
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className="
                  w-full min-h-12 rounded-xl border border-border bg-background-subtle
                  pl-10 pr-10 text-body text-text placeholder:text-text-muted input-focus
                "
                aria-label={searchPlaceholder}
                aria-controls={listboxId}
                aria-autocomplete="list"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface"
                  aria-label={common.clearFilters}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {filters.length > 1 && (
              <div
                className="flex flex-wrap gap-2"
                role="toolbar"
                aria-label={caretaker.childPicker.filtersLabel}
              >
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={`min-h-9 rounded-full px-3 py-1.5 text-caption font-semibold transition-colors ${
                      filter === f.id
                        ? 'bg-primary !text-white shadow-sm [&_*]:!text-white'
                        : 'bg-background-subtle text-text-secondary hover:bg-border/60'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <SkeletonList />
          ) : childrenList.length === 0 ? (
            <p className="text-body text-text-secondary text-center py-10">{emptyMessage}</p>
          ) : navigable.length === 0 ? (
            <p className="text-body text-text-secondary text-center py-10" role="status">
              {caretaker.childPicker.noMatch}
            </p>
          ) : (
            <div
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel ?? placeholder}
              className="space-y-4 max-h-[min(55vh,480px)] overflow-y-auto overscroll-contain pr-1"
            >
              {recentChildren.length > 0 && (
                <section className="space-y-2">
                  <SectionLabel icon={<Clock size={14} />}>
                    {caretaker.childPicker.recent}
                  </SectionLabel>
                  <div className="space-y-2">{takeSlice(recentChildren)}</div>
                </section>
              )}

              {frequentChildren.length > 0 && (
                <section className="space-y-2">
                  <SectionLabel icon={<Star size={14} />}>
                    {caretaker.childPicker.frequent}
                  </SectionLabel>
                  <div className="space-y-2">{takeSlice(frequentChildren)}</div>
                </section>
              )}

              <section className="space-y-2">
                {(recentChildren.length > 0 || frequentChildren.length > 0) &&
                  mainList.length > 0 &&
                  !debouncedQuery.trim() &&
                  filter === 'all' && (
                    <SectionLabel icon={<UserRound size={14} />}>
                      {caretaker.childPicker.allChildren}
                    </SectionLabel>
                  )}
                <div className="space-y-2">{takeSlice(mainList)}</div>
              </section>
            </div>
          )}

          <div className="flex justify-end pt-1 border-t border-border">
            <Button variant="tertiary" onClick={close}>
              {common.close}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
