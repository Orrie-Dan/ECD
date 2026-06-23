import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { common } from '@/locales/rw/common'

export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  error?: boolean
  disabled?: boolean
  id?: string
  'aria-label'?: string
}

interface PanelPosition {
  top: number
  left: number
  width: number
  maxHeight: number
  placement: 'bottom' | 'top'
}

const MOBILE_BREAKPOINT = 640
const PANEL_GAP = 8
const PANEL_MAX_HEIGHT = 320

const triggerBase = `
  relative w-full min-h-12 px-3.5 pr-10 text-body rounded-lg border border-border bg-surface text-text
  text-left input-focus flex items-center
`

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
  )

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = common.select,
  searchPlaceholder = common.search,
  error = false,
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: SearchableSelectProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const listboxId = `${controlId}-listbox`
  const isMobile = useIsMobile()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [position, setPosition] = useState<PanelPosition | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return options
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
  }, [options, query])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
    setPosition(null)
  }, [])

  const openList = useCallback(() => {
    if (disabled) return
    const selectedIndex = filteredOptions.findIndex((option) => option.value === value)
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }, [disabled, filteredOptions, value])

  const selectOption = useCallback(
    (optionValue: string) => {
      onChange(optionValue)
      close()
      triggerRef.current?.focus()
    },
    [close, onChange],
  )

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger || isMobile) {
      setPosition(null)
      return
    }

    const rect = trigger.getBoundingClientRect()
    const viewportPadding = 12
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP - viewportPadding
    const spaceAbove = rect.top - PANEL_GAP - viewportPadding
    const placement: 'bottom' | 'top' =
      spaceBelow >= 180 || spaceBelow >= spaceAbove ? 'bottom' : 'top'
    const availableSpace = placement === 'bottom' ? spaceBelow : spaceAbove
    const maxHeight = Math.max(160, Math.min(PANEL_MAX_HEIGHT, availableSpace))

    setPosition({
      left: rect.left,
      width: rect.width,
      top: placement === 'bottom' ? rect.bottom + PANEL_GAP : rect.top - PANEL_GAP,
      maxHeight,
      placement,
    })
  }, [isMobile])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        close()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [close, open])

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, filteredOptions])

  useEffect(() => {
    if (!open || !isMobile) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobile, open])

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) openList()
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault()
      close()
    }
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, filteredOptions.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Enter' && activeIndex >= 0 && filteredOptions[activeIndex]) {
      event.preventDefault()
      selectOption(filteredOptions[activeIndex].value)
    }
  }

  const renderOptions = () => (
    <ul
      id={listboxId}
      role="listbox"
      aria-labelledby={controlId}
      className={`overflow-y-auto p-2 overscroll-contain ${isMobile ? 'max-h-[50vh]' : 'flex-1 min-h-0'}`}
      style={!isMobile && position ? { maxHeight: position.maxHeight - 72 } : undefined}
    >
      {filteredOptions.length === 0 ? (
        <li className="px-3 py-4 text-body text-text-secondary text-center">{common.noResults}</li>
      ) : (
        filteredOptions.map((option, index) => {
          const selected = option.value === value
          const active = index === activeIndex

          return (
            <li key={option.value} role="option" aria-selected={selected}>
              <button
                ref={(node) => {
                  optionRefs.current[index] = node
                }}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option.value)}
                className={`
                  flex w-full min-h-12 items-center justify-between gap-3 rounded-lg px-3.5 py-3
                  text-left text-body transition-colors
                  ${selected ? 'bg-primary-light text-primary font-semibold' : 'text-text'}
                  ${active && !selected ? 'bg-background-subtle' : ''}
                  hover:bg-background-subtle active:bg-primary-light/60
                `}
              >
                <span className="leading-snug">{option.label}</span>
                {selected && <Check size={18} className="shrink-0" aria-hidden="true" />}
              </button>
            </li>
          )
        })
      )}
    </ul>
  )

  const renderSearch = () => (
    <div className={`border-b border-border ${isMobile ? 'px-5 py-4' : 'p-3'}`}>
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={handleSearchKeyDown}
          placeholder={searchPlaceholder}
          className="
            w-full min-h-11 rounded-lg border border-border bg-background-subtle pl-10 pr-3.5
            text-body text-text placeholder:text-text-muted input-focus
          "
          aria-label={searchPlaceholder}
        />
      </div>
    </div>
  )

  const renderPanelContent = () => (
    <>
      {renderSearch()}
      {renderOptions()}
    </>
  )

  const panel = open
    ? isMobile
      ? createPortal(
          <div className="fixed inset-0 z-100 flex flex-col justify-end">
            <button
              type="button"
              className="absolute inset-0 bg-text/40 backdrop-blur-[2px] searchable-select-backdrop"
              onClick={close}
              aria-label={common.close}
            />
            <div
              ref={panelRef}
              role="presentation"
              className="
                relative z-10 flex max-h-[min(85vh,640px)] flex-col overflow-hidden
                rounded-t-2xl border border-border bg-surface shadow-lg searchable-select-sheet
              "
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="min-w-0 pr-4">
                  <p className="text-label text-text">{ariaLabel ?? placeholder}</p>
                  {selectedOption && (
                    <p className="text-caption text-text-secondary mt-0.5 truncate">
                      {selectedOption.label}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-background-subtle"
                  aria-label={common.close}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex justify-center pt-2 pb-1" aria-hidden="true">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>
              {renderPanelContent()}
            </div>
          </div>,
          document.body,
        )
      : position
        ? createPortal(
            <div
              ref={panelRef}
              role="presentation"
              className={`
                fixed z-100 flex flex-col overflow-hidden rounded-xl border border-border
                bg-surface shadow-lg searchable-select-panel
                ${position.placement === 'top' ? 'searchable-select-panel-top' : 'searchable-select-panel-bottom'}
              `}
              style={{
                left: position.left,
                width: position.width,
                top: position.top,
                maxHeight: position.maxHeight,
              }}
            >
              {renderPanelContent()}
            </div>,
            document.body,
          )
        : null
    : null

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-label={ariaLabel ?? placeholder}
        aria-invalid={error}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleTriggerKeyDown}
        className={`
          ${triggerBase}
          ${error ? 'border-error focus:border-error' : ''}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
          ${open ? 'border-primary ring-2 ring-primary/15' : ''}
        `}
      >
        <span className={`truncate pr-1 ${selectedOption ? 'text-text' : 'text-text-muted'}`}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {panel}
    </div>
  )
}
