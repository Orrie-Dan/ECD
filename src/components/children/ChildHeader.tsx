import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Pencil,
  Archive,
  RotateCcw,
  MoreHorizontal,
  Ruler,
  ClipboardList,
  Baby,
  ArrowLeftRight,
  School,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/children/StatusBadge'
import { caretaker } from '@/locales/rw/caretaker'
import { slugifyChildName } from '@/lib/child-routes'
import { gender } from '@/locales/rw/common'
import { calculateAge, formatDate } from '@/lib/mock-data'
import type { ArchiveReason, Child } from '@/types'

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

interface ChildHeaderProps {
  child: Child
  showActions?: boolean
  onEdit?: () => void
  onArchive?: () => void
  onReactivate?: () => void
  onRecordMeasurement?: () => void
  onTransfer?: () => void
  onAssignClassroom?: () => void
  transferPending?: boolean
}

export function ChildHeader({
  child,
  showActions = false,
  onEdit,
  onArchive,
  onReactivate,
  onRecordMeasurement,
  onTransfer,
  onAssignClassroom,
  transferPending,
}: ChildHeaderProps) {
  const initials = getInitials(child.fullName)
  const age = calculateAge(child.dateOfBirth)
  const canMutate = child.status === 'active'
  const isArchived = child.status === 'archived'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  return (
    <Card padding="lg" className="mb-6">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div
          className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl text-heading font-bold shrink-0 ${
            child.gender === 'Umuhungu'
              ? 'bg-secondary-light text-secondary'
              : 'bg-primary-light text-primary'
          }`}
          aria-hidden="true"
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-heading text-text break-words">{child.fullName}</h2>
            <StatusBadge status={child.status} size="md" />
          </div>

          <p className="text-body text-text-secondary">
            {caretaker.children.age}: <span className="font-semibold text-text">{age}</span>
            <span className="mx-2 text-border-strong" aria-hidden>
              ·
            </span>
            {gender[child.gender]}
          </p>

          <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-caption text-text-secondary">
            {child.nationalId?.trim() ? (
              <div className="flex gap-1.5">
                <dt>{caretaker.registration.nationalId}:</dt>
                <dd className="font-semibold text-text font-mono">{child.nationalId.trim()}</dd>
              </div>
            ) : null}
            <div className="flex gap-1.5">
              <dt>{caretaker.childDetail.centre}:</dt>
              <dd className="font-semibold text-text">{child.centerName}</dd>
            </div>
          </dl>

          {isArchived && (
            <div className="mt-2 rounded-lg border border-border bg-background-subtle/60 px-3.5 py-3 space-y-1">
              <p className="text-caption font-semibold text-text-muted uppercase tracking-wide">
                {caretaker.childDetail.archiveInfo}
              </p>
              {child.archivedAt && (
                <p className="text-body text-text-secondary">
                  {caretaker.childDetail.archiveDate}:{' '}
                  <span className="font-semibold text-text">{formatDate(child.archivedAt)}</span>
                </p>
              )}
              <p className="text-body text-text-secondary">
                {caretaker.childDetail.archiveReason}:{' '}
                <span className="font-semibold text-text">
                  {archiveReasonLabel(child.archiveReason)}
                </span>
              </p>
              {child.archiveNotes?.trim() && (
                <p className="text-body text-text-secondary">
                  {caretaker.childDetail.archiveNotes}:{' '}
                  <span className="text-text">{child.archiveNotes.trim()}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {showActions && canMutate && (
        <div
          className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-border"
          role="group"
          aria-label={caretaker.children.quickActions}
        >
          {onEdit && (
            <Button variant="secondary" size="sm" icon={<Pencil size={16} />} onClick={onEdit}>
              {caretaker.childDetail.edit}
            </Button>
          )}
          {onAssignClassroom && (
            <Button
              variant="outline"
              size="sm"
              icon={<School size={16} />}
              onClick={onAssignClassroom}
            >
              {caretaker.classrooms.assignClassroom}
            </Button>
          )}
          {onRecordMeasurement && (
            <Button
              variant="primary"
              size="sm"
              icon={<Ruler size={16} />}
              onClick={onRecordMeasurement}
            >
              {caretaker.growth.recordMeasurement}
            </Button>
          )}
          {transferPending ? (
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeftRight size={16} />}
              disabled
            >
              {caretaker.transfer.alreadyPending ?? 'Kwimura bitegereje'}
            </Button>
          ) : onTransfer ? (
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeftRight size={16} />}
              onClick={onTransfer}
            >
              {caretaker.childDetail.transfer}
            </Button>
          ) : null}

          <div className="relative ml-auto" ref={menuRef}>
            <Button
              variant="tertiary"
              size="sm"
              icon={<MoreHorizontal size={16} />}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {caretaker.childDetail.moreActions}
            </Button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1.5 w-56 rounded-xl border border-border bg-surface shadow-lg py-1"
              >
                <Link
                  role="menuitem"
                  to="/caretaker/ubwitabire"
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-body text-text hover:bg-background-subtle"
                  onClick={() => setMenuOpen(false)}
                >
                  <ClipboardList size={16} className="text-text-muted shrink-0" aria-hidden />
                  {caretaker.childDetail.actionAttendance}
                </Link>
                <Link
                  role="menuitem"
                  to={`/caretaker/sted/new?child=${encodeURIComponent(slugifyChildName(child.fullName))}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-body text-text hover:bg-background-subtle"
                  onClick={() => setMenuOpen(false)}
                >
                  <Baby size={16} className="text-text-muted shrink-0" aria-hidden />
                  {caretaker.childDetail.actionSted}
                </Link>
                <div className="my-1 border-t border-border" role="separator" />
                {onArchive && (
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
                    {caretaker.childDetail.archive}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showActions && isArchived && onReactivate && (
        <div
          className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border"
          role="group"
          aria-label={caretaker.children.quickActions}
        >
          <Button variant="primary" size="sm" icon={<RotateCcw size={16} />} onClick={onReactivate}>
            {caretaker.childDetail.reactivate}
          </Button>
        </div>
      )}
    </Card>
  )
}
