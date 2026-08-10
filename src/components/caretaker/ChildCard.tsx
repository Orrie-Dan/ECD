import { useEffect, useId, useRef, useState } from 'react'
import {
  Phone,
  User,
  Eye,
  Pencil,
  Archive,
  RotateCcw,
  Ruler,
  MoreHorizontal,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/children/StatusBadge'
import { GrowthStatusBadge } from '@/components/growth/GrowthStatusBadge'
import { calculateAge, formatDate } from '@/lib/mock-data'
import { gender as genderLabels } from '@/locales/rw/common'
import { caretaker } from '@/locales/rw/caretaker'
import type { ArchiveReason, Child, NutritionStatus } from '@/types'
import type { AssessmentDueStatus } from '@/types'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function archiveReasonLabel(reason?: string): string {
  if (!reason) return caretaker.childDetail.noArchiveReason
  const key = reason as ArchiveReason
  return caretaker.archive.reasons[key] ?? reason
}

interface ChildCardProps {
  child: Child
  onView?: () => void
  onEdit?: () => void
  onArchive?: () => void
  onReactivate?: () => void
  onRecordMeasurement?: () => void
  assessmentDueStatus?: AssessmentDueStatus
  nutritionStatus?: NutritionStatus
  onSelect?: () => void
  selected?: boolean
  showActions?: boolean
}

export function ChildCard({
  child,
  onView,
  onEdit,
  onArchive,
  onReactivate,
  onRecordMeasurement,
  assessmentDueStatus,
  nutritionStatus,
  onSelect,
  selected,
  showActions = true,
}: ChildCardProps) {
  const age = calculateAge(child.dateOfBirth)
  const initials = getInitials(child.fullName)
  const canMutate = child.status === 'active'
  const isArchived = child.status === 'archived'
  const menuId = useId()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const showDueBadge =
    assessmentDueStatus === 'due' ||
    assessmentDueStatus === 'overdue' ||
    assessmentDueStatus === 'never'
  const showRiskBadge = nutritionStatus != null && nutritionStatus !== 'normal'

  const hasOverflowActions =
    (canMutate && (onEdit || onArchive || onRecordMeasurement)) ||
    (isArchived && !!onReactivate)

  const hasPrimaryActions = !!onView || (isArchived && !!onReactivate)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const identitySection = (
    <div className="flex items-start gap-3 min-h-14">
      <div
        className={`
          flex items-center justify-center w-14 h-14 rounded-xl text-lg font-bold shrink-0
          ${child.gender === 'Umuhungu' ? 'bg-secondary-light text-secondary' : 'bg-primary-light text-primary'}
        `}
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-subheading text-text truncate leading-snug">{child.fullName}</h3>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 min-h-6">
          <StatusBadge status={child.status} />
          {showDueBadge && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold bg-warning-light text-warning"
              role="status"
            >
              {caretaker.children.badgeDue}
            </span>
          )}
          {showRiskBadge && nutritionStatus && <GrowthStatusBadge status={nutritionStatus} />}
        </div>
      </div>
    </div>
  )

  const metadataSection = (
    <p className="text-caption text-text-secondary mt-3 min-h-5 truncate">
      {caretaker.children.age}: <span className="font-semibold text-text">{age}</span>
      <span className="mx-2 text-border-strong" aria-hidden>
        ·
      </span>
      {genderLabels[child.gender]}
    </p>
  )

  const guardianSection = (
    <div className="mt-3 space-y-1.5 min-h-13">
      <div className="flex items-center gap-2 text-body text-text-secondary min-h-5">
        <User size={16} className="text-text-muted shrink-0" aria-hidden />
        <span className="truncate">{child.guardianName || '—'}</span>
      </div>
      <div className="flex items-center gap-2 text-body text-text-secondary min-h-5">
        <Phone size={16} className="text-text-muted shrink-0" aria-hidden />
        <span className="truncate">{child.guardianPhone || '—'}</span>
      </div>
    </div>
  )

  const archiveSlot = (
    <div className="mt-2 min-h-10">
      {isArchived ? (
        <p className="text-caption text-text-secondary line-clamp-2">
          {child.archivedAt ? `${formatDate(child.archivedAt)} · ` : ''}
          {archiveReasonLabel(child.archiveReason)}
        </p>
      ) : (
        <span className="block h-10" aria-hidden />
      )}
    </div>
  )

  const actionsSection =
    showActions && (hasPrimaryActions || hasOverflowActions) ? (
      <div
        className="mt-auto pt-4 border-t border-border"
        role="group"
        aria-label={caretaker.children.quickActions}
      >
        <div className={`grid gap-2 ${isArchived && onReactivate ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {onView && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Eye size={16} />}
              onClick={onView}
              fullWidth
              className="min-w-0"
              aria-label={`${caretaker.children.viewDetails}: ${child.fullName}`}
            >
              <span className="truncate">{caretaker.children.viewDetails}</span>
            </Button>
          )}

          {isArchived && onReactivate && (
            <Button
              variant="primary"
              size="sm"
              icon={<RotateCcw size={16} />}
              onClick={onReactivate}
              fullWidth
              className="min-w-0"
              aria-label={`${caretaker.children.reactivate}: ${child.fullName}`}
            >
              <span className="truncate">{caretaker.children.reactivate}</span>
            </Button>
          )}
        </div>

        {hasOverflowActions && canMutate && (
          <div className="relative mt-2 flex justify-end" ref={menuRef}>
            <Button
              variant="tertiary"
              size="sm"
              icon={<MoreHorizontal size={16} />}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {caretaker.children.moreActions}
            </Button>
            {menuOpen && (
              <div
                id={menuId}
                role="menu"
                className="absolute right-0 bottom-full z-20 mb-1.5 w-56 rounded-xl border border-border bg-surface shadow-lg py-1"
              >
                {onEdit && (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-body text-text hover:bg-background-subtle text-left"
                    onClick={() => {
                      setMenuOpen(false)
                      onEdit()
                    }}
                  >
                    <Pencil size={16} className="text-text-muted shrink-0" aria-hidden />
                    {caretaker.children.editInfo}
                  </button>
                )}
                {onRecordMeasurement && (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-body text-text hover:bg-background-subtle text-left"
                    onClick={() => {
                      setMenuOpen(false)
                      onRecordMeasurement()
                    }}
                  >
                    <Ruler size={16} className="text-text-muted shrink-0" aria-hidden />
                    {caretaker.children.recordMeasurement}
                  </button>
                )}
                {onArchive && (
                  <>
                    {(onEdit || onRecordMeasurement) && (
                      <div className="my-1 border-t border-border" role="separator" />
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-body text-error hover:bg-error-light text-left"
                      onClick={() => {
                        setMenuOpen(false)
                        onArchive()
                      }}
                    >
                      <Archive size={16} className="shrink-0" aria-hidden />
                      {caretaker.children.archive}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {!(hasOverflowActions && canMutate) && <div className="mt-2 min-h-9" aria-hidden />}
      </div>
    ) : null

  const body = (
    <div className="flex flex-col h-full">
      {identitySection}
      {metadataSection}
      {guardianSection}
      {archiveSlot}
      {actionsSection}
    </div>
  )

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`
          w-full h-full text-left rounded-xl border p-5 transition-all duration-150 shadow-card
          focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2
          ${selected
            ? 'border-primary bg-primary-light/50 shadow-md ring-2 ring-primary/20'
            : 'border-border bg-surface hover:border-primary/30 hover:shadow-md'}
        `}
      >
        {body}
      </button>
    )
  }

  return (
    <Card padding="lg" className="h-full flex flex-col">
      {body}
    </Card>
  )
}
